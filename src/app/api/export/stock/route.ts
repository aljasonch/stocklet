import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import Item from '@/models/Item';
import { TransactionType } from '@/types/enums';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { verifyTokenFromCookies } from '@/lib/authUtils';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_ISSUER = 'stocklet-app';
const JWT_AUDIENCE = 'stocklet-users';
const JWT_EXPIRY = '15m';
const COOKIE_MAX_AGE = 15 * 60;
const CLOCK_SKEW_TOLERANCE = 60;
const REFRESH_THRESHOLD = 5 * 60;

type DecodedToken = {
  userId: string;
  exp?: number;
};

interface SheetRow {
  [key: string]: string | number | null;
  'Total Berat (kg)': number;
  'Total Nilai': number;
}

interface SummaryRow {
  _id: string | null;
  totalBerat: number;
  totalNilai: number;
}

export const GET = async (request: NextRequest): Promise<Response> => {
  const decodedToken = verifyTokenFromCookies(request) as DecodedToken | null;
  if (!decodedToken?.userId) {
    return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
  }
  const userId = decodedToken.userId;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const itemId = searchParams.get('itemId');
    let itemNameForFilter: string | null = null;
    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      const itemDoc = await Item.findById(itemId).lean();
      itemNameForFilter = (itemDoc?.namaBarang as string | undefined) ?? null;
    }
    const customer = searchParams.get('customer');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const noSjType = searchParams.get('noSjType');

    const matchQuery: Record<string, unknown> = {
      createdBy: new mongoose.Types.ObjectId(userId),
    };

    const tipeParam = searchParams.get('tipe');
    const tipeLabel =
      tipeParam === TransactionType.PEMBELIAN
        ? 'Pembelian'
        : tipeParam === TransactionType.PENJUALAN
        ? 'Penjualan'
        : 'Semua';

    if (tipeParam && (Object.values(TransactionType) as string[]).includes(tipeParam)) {
      matchQuery.tipe = tipeParam;
    }

    const andConditions: Array<Record<string, unknown>> = [];

    if (year) {
      andConditions.push({ $expr: { $eq: [{ $year: '$tanggal' }, Number(year)] } });
    }
    if (month) {
      andConditions.push({ $expr: { $eq: [{ $month: '$tanggal' }, Number(month)] } });
    }
    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchQuery.item = new mongoose.Types.ObjectId(itemId);
    }
    if (customer) {
      matchQuery.customer = { $regex: new RegExp(customer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    }
    if (startDate && endDate) {
      matchQuery.tanggal = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    if (andConditions.length > 0) {
      matchQuery.$and = andConditions;
    }

    const summary = await Transaction.aggregate<SummaryRow>([
      { $match: matchQuery },
      {
        $group: {
          _id: '$customer',
          totalBerat: { $sum: '$berat' },
          totalNilai: { $sum: '$totalHarga' },
        },
      },
      { $sort: { totalNilai: -1 } },
    ]);

    const headerNama = tipeParam === TransactionType.PENJUALAN ? 'Customer' : 'Supplier';

    const rows: SheetRow[] = summary.map((s) => ({
      [headerNama]: s._id ?? '-',
      'Total Berat (kg)': Number(Number(s.totalBerat ?? 0).toFixed(2)),
      'Total Nilai': Number(s.totalNilai ?? 0),
    }));

    const totalBeratAll = summary.reduce<number>((sum, r) => sum + (r.totalBerat ?? 0), 0);
    const totalNilaiAll = summary.reduce<number>((sum, r) => sum + (r.totalNilai ?? 0), 0);

    rows.push({
      [headerNama]: 'TOTAL KESELURUHAN',
      'Total Berat (kg)': Number(totalBeratAll.toFixed(2)),
      'Total Nilai': totalNilaiAll,
    });

    const headersArr = [headerNama, 'Total Berat (kg)', 'Total Nilai'] as const;
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows, { header: headersArr as unknown as string[] });

    ws['!cols'] = [{ wch: 40 }, { wch: 18 }, { wch: 20 }];

    const ref = ws['!ref'];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      for (let r = 1; r <= range.e.r; r++) {
        const beratAddr = XLSX.utils.encode_cell({ r, c: 1 });
        const nilaiAddr = XLSX.utils.encode_cell({ r, c: 2 });

        const beratCell = ws[beratAddr] as XLSX.CellObject | undefined;
        if (beratCell && typeof beratCell.v === 'number') {
          beratCell.t = 'n';
          beratCell.z = '#,##0.00';
        }

        const nilaiCell = ws[nilaiAddr] as XLSX.CellObject | undefined;
        if (nilaiCell && typeof nilaiCell.v === 'number') {
          nilaiCell.t = 'n';
          nilaiCell.z = '"Rp" * #,##0';
        }
      }
    }

    const filterPairs: { Filter: string; Nilai: string }[] = [];
    if (year) filterPairs.push({ Filter: 'Tahun', Nilai: year });
    if (month) filterPairs.push({ Filter: 'Bulan', Nilai: month });
    if (itemNameForFilter) filterPairs.push({ Filter: 'Item', Nilai: itemNameForFilter });
    if (customer) filterPairs.push({ Filter: tipeParam === TransactionType.PENJUALAN ? 'Customer' : 'Supplier', Nilai: customer });
    if (startDate && endDate) filterPairs.push({ Filter: 'Rentang Tanggal', Nilai: `${startDate} s/d ${endDate}` });
    if (tipeParam) filterPairs.push({ Filter: 'Tipe Transaksi', Nilai: tipeLabel });
    if (noSjType) filterPairs.push({ Filter: 'No SJ', Nilai: noSjType });

    const filterWs = XLSX.utils.json_to_sheet(filterPairs, { header: ['Filter', 'Nilai'] });
    filterWs['!cols'] = [{ wch: 20 }, { wch: 40 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, filterWs, 'Keterangan');
    XLSX.utils.book_append_sheet(wb, ws, 'Stok');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `Laporan Stok ${tipeLabel} - ${yyyy}-${mm}-${dd}.xlsx`;

    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="${filename}"`);
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const res = new NextResponse(Buffer.from(buffer), { status: 200, headers });

    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExp = decodedToken.exp;
    if (typeof tokenExp === 'number' && tokenExp - currentTime < REFRESH_THRESHOLD + CLOCK_SKEW_TOLERANCE) {
      const newToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET!,
        {
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          expiresIn: JWT_EXPIRY,
          jwtid: randomUUID(),
        }
      );
      res.headers.append(
        'Set-Cookie',
        `token=${newToken}; Path=/; HttpOnly; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`
      );
    }

    return res;
  } catch (e) {
    console.error('Export stock error:', e);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
};
