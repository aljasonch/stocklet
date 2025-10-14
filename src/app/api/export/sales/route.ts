import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { TransactionType } from '@/types/enums';
import { IItem } from '@/models/Item';
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
  email?: string;
  exp?: number;
};

interface SalesMatchQuery {
  createdBy: mongoose.Types.ObjectId;
  tipe: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  customer?: { $regex: RegExp };
  item?: mongoose.Types.ObjectId;
  $and?: Array<Record<string, unknown>>;
}

interface SalesTxLean {
  _id: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  tanggal: string | Date;
  customer: string;
  noSJ?: string;
  noInv?: string;
  noPO?: string;
  noSJSby?: string;
  item?: IItem;
  namaBarangSnapshot?: string;
  berat?: number;
  harga?: number;
  totalHarga?: number;
  createdAt?: Date;
}

interface SheetRow {
  'Tanggal': string | 'TOTAL' | '';
  'Customer': string;
  'No. SJ': string;
  'No. Inv': string;
  'No.PO': string;
  'Barang': string;
  'Berat (kg)': number | null;
  'Harga': number | null;
  'Subtotal': number | null;
  'PPN (11%)': number | null;
  'Total': number | null;
  'No.SJ SBY': string;
}

const getExportSalesHandler = async (request: NextRequest): Promise<Response> => {
  const decodedToken = verifyTokenFromCookies(request) as DecodedToken | null;
  if (!decodedToken?.userId) {
    return NextResponse.json({ message: 'Unauthorized: Invalid or expired token' }, { status: 401 });
  }
  const userId = decodedToken.userId;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const customer = searchParams.get('customer');
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view');
    const noSjType = searchParams.get('noSjType') as 'all' | 'noSJ' | 'noSJSby' | null;

    const matchQuery: SalesMatchQuery = {
      createdBy: new mongoose.Types.ObjectId(userId),
      tipe: TransactionType.PENJUALAN,
    };

    if (view === 'monthly' && year && month) {
      const firstDay = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0, 23, 59, 59, 999);
      matchQuery.tanggal = { $gte: firstDay, $lte: lastDay };
    } else if (startDate && endDate) {
      matchQuery.tanggal = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (year && !month && view !== 'custom_range') {
      const firstDayOfYear = new Date(parseInt(year, 10), 0, 1);
      const lastDayOfYear = new Date(parseInt(year, 10), 11, 31, 23, 59, 59, 999);
      matchQuery.tanggal = { $gte: firstDayOfYear, $lte: lastDayOfYear };
    }

    if (customer) {
      const escaped = customer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchQuery.customer = { $regex: new RegExp(escaped, 'i') };
    }
    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchQuery.item = new mongoose.Types.ObjectId(itemId);
    }

    if (noSjType && noSjType !== 'all') {
      matchQuery.$and = matchQuery.$and ?? [];
      if (noSjType === 'noSJ') {
        matchQuery.$and.push({ noSJ: { $exists: true, $nin: [null, ''] } });
        matchQuery.$and.push({ $or: [{ noSJSby: { $exists: false } }, { noSJSby: null }, { noSJSby: '' }] });
      } else if (noSjType === 'noSJSby') {
        matchQuery.$and.push({ noSJSby: { $exists: true, $nin: [null, ''] } });
      }
      if (matchQuery.$and.length === 0) delete matchQuery.$and;
    }

    const salesData = await Transaction.find(matchQuery)
      .populate<{ item: IItem }>('item', 'namaBarang')
      .sort({ tanggal: 1 })
      .lean<SalesTxLean[]>();

    if (salesData.length === 0) {
      return NextResponse.json({ message: 'No data to export for the selected filters.' }, { status: 404 });
    }

    const dataForSheet: SheetRow[] = salesData.map((tx) => {
      const subtotal = tx.totalHarga ?? 0;
      const ppnAmount = subtotal * 0.11;
      const totalWithPPN = subtotal + ppnAmount;

      return {
        'Tanggal': new Date(tx.tanggal).toLocaleDateString('id-ID'),
        'Customer': tx.customer,
        'No. SJ': tx.noSJ ?? '',
        'No. Inv': tx.noInv ?? '',
        'No.PO': tx.noPO ?? '',
        'Barang': tx.item?.namaBarang ?? tx.namaBarangSnapshot ?? 'N/A',
        'Berat (kg)': tx.berat ?? null,
        'Harga': tx.harga ?? null,
        'Subtotal': subtotal,
        'PPN (11%)': ppnAmount,
        'Total': totalWithPPN,
        'No.SJ SBY': tx.noSJSby ?? '',
      };
    });

    const totalBerat = salesData.reduce<number>((sum, tx) => sum + (tx.berat ?? 0), 0);
    const totalNilai = salesData.reduce<number>((sum, tx) => sum + (tx.totalHarga ?? 0), 0);
    const totalPPN = totalNilai * 0.11;
    const totalDenganPPN = totalNilai + totalPPN;

    dataForSheet.push({
      'Tanggal': '',
      'Customer': '',
      'No. SJ': '',
      'No. Inv': '',
      'No.PO': '',
      'Barang': '',
      'Berat (kg)': null,
      'Harga': null,
      'Subtotal': null,
      'PPN (11%)': null,
      'Total': null,
      'No.SJ SBY': '',
    });

    dataForSheet.push({
      'Tanggal': 'TOTAL',
      'Customer': '',
      'No. SJ': '',
      'No. Inv': '',
      'No.PO': '',
      'Barang': '',
      'Berat (kg)': totalBerat,
      'Harga': null,
      'Subtotal': totalNilai,
      'PPN (11%)': totalPPN,
      'Total': totalDenganPPN,
      'No.SJ SBY': '',
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

    const columnWidths = [
      { wch: 12 },
      { wch: 40 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
    ];
    worksheet['!cols'] = columnWidths;

    const ref = worksheet['!ref'] as string | undefined;
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      for (let r = 1; r <= range.e.r; r++) {
        const beratAddr = XLSX.utils.encode_cell({ r, c: 6 });
        const beratCell = worksheet[beratAddr] as XLSX.CellObject | undefined;
        if (beratCell && typeof beratCell.v === 'number') {
          beratCell.t = 'n';
          beratCell.z = '#,##0.00';
        }
        [7, 8, 9, 10].forEach((c) => {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[addr] as XLSX.CellObject | undefined;
          if (cell && typeof cell.v === 'number') {
            cell.t = 'n';
            cell.z = '#,##0';
          }
        });
      }
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const headers = new Headers();
    headers.append('Content-Disposition', 'attachment; filename="laporan_penjualan.xlsx"');
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const responseToReturn = new NextResponse(Buffer.from(excelBuffer), { status: 200, headers });

    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExp = decodedToken.exp;
    let newJwtToken: string | null = null;

    if (typeof tokenExp === 'number' && tokenExp - currentTime < REFRESH_THRESHOLD + CLOCK_SKEW_TOLERANCE) {
      newJwtToken = jwt.sign(
        { userId: decodedToken.userId, email: decodedToken.email, jti: randomUUID() },
        process.env.JWT_SECRET!,
        {
          expiresIn: JWT_EXPIRY,
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        }
      );
    }

    if (newJwtToken) {
      responseToReturn.cookies.set('token', newJwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });
    }

    return responseToReturn;
  } catch (error) {
    console.error('Export sales report error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred during export.' },
      { status: 500 }
    );
  }
};

export const GET = getExportSalesHandler;
