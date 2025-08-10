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

interface PurchaseMatchQuery {
  createdBy: mongoose.Types.ObjectId;
  tipe: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  customer?: { $regex: RegExp };
  item?: mongoose.Types.ObjectId;
}

interface SheetRow {
  'Tanggal': string | 'TOTAL';
  'Supplier': string;
  'No. SJ': string;
  'No. Inv': string;
  'No.PO': string;
  'Barang': string;
  'Berat (kg)': number | undefined | null;
  'Harga': number | undefined | null;
  'Subtotal': number | undefined | null;
  'PPN (11%)': number | undefined | null;
  'Total': number | undefined | null;
}

const getExportPurchasesHandler = async (request: NextRequest): Promise<Response> => {
  const decodedToken = verifyTokenFromCookies(request);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: 'Unauthorized: Invalid or expired token' }, { status: 401 });
  }
  const userId = decodedToken.userId;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const supplier = searchParams.get('supplier');
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view');

    const matchQuery: PurchaseMatchQuery = {
      createdBy: new mongoose.Types.ObjectId(userId),
      tipe: TransactionType.PEMBELIAN,
    };

    if (view === 'monthly' && year && month) {
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      matchQuery.tanggal = { $gte: firstDay, $lte: lastDay };
    } else if (startDate && endDate) {
      matchQuery.tanggal = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (year && !month && view !== 'custom_range') {
      const firstDayOfYear = new Date(parseInt(year), 0, 1);
      const lastDayOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      matchQuery.tanggal = { $gte: firstDayOfYear, $lte: lastDayOfYear };
    }

    if (supplier) {
      matchQuery.customer = { $regex: new RegExp(supplier, 'i') };
    }
    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchQuery.item = new mongoose.Types.ObjectId(itemId);
    }

    const purchaseData = await Transaction.find(matchQuery)
      .populate<{ item: IItem }>('item', 'namaBarang')
      .sort({ tanggal: 1, createdAt: 1 })
      .lean();

    if (purchaseData.length === 0) {
      return NextResponse.json({ message: 'No data to export for the selected filters.' }, { status: 404 });
    }

    const dataForSheet: SheetRow[] = purchaseData.map((tx: any) => {
      const ppnAmount = tx.totalHarga * 0.11;
      const totalWithPPN = tx.totalHarga + ppnAmount;

      return {
        'Tanggal': new Date(tx.tanggal).toLocaleDateString('id-ID'),
        'Supplier': tx.customer,
        'No. SJ': tx.noSJ || '',
        'No. Inv': tx.noInv || '',
        'No.PO': tx.noPO || '',
        'Barang': (tx.item as IItem)?.namaBarang || tx.namaBarangSnapshot || 'N/A',
        'Berat (kg)': tx.berat ?? null,
        'Harga': tx.harga ?? null,
        'Subtotal': tx.totalHarga ?? null,
        'PPN (11%)': ppnAmount,
        'Total': totalWithPPN,
      };
    });

    const totalBerat = purchaseData.reduce((sum: number, tx: any) => sum + (tx.berat || 0), 0);
    const totalNilai = purchaseData.reduce((sum: number, tx: any) => sum + (tx.totalHarga || 0), 0);
    const totalPPN = totalNilai * 0.11;
    const totalDenganPPN = totalNilai + totalPPN;

    const emptyRowForSheet: SheetRow = {
      'Tanggal': '',
      'Supplier': '',
      'No. SJ': '',
      'No. Inv': '',
      'No.PO': '',
      'Barang': '',
      'Berat (kg)': null,
      'Harga': null,
      'Subtotal': null,
      'PPN (11%)': null,
      'Total': null,
    };
    dataForSheet.push(emptyRowForSheet);

    dataForSheet.push({
      'Tanggal': 'TOTAL',
      'Supplier': '',
      'No. SJ': '',
      'No. Inv': '',
      'No.PO': '',
      'Barang': '',
      'Berat (kg)': totalBerat,
      'Harga': null,
      'Subtotal': totalNilai,
      'PPN (11%)': totalPPN,
      'Total': totalDenganPPN,
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Pembelian');
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
    ];
    (worksheet as any)['!cols'] = columnWidths;
    const ref = (worksheet as any)['!ref'] as string | undefined;
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      for (let r = 1; r <= range.e.r; r++) {
        const beratAddr = XLSX.utils.encode_cell({ r, c: 6 });
        const beratCell = (worksheet as any)[beratAddr];
        if (beratCell && typeof beratCell.v === 'number') {
          beratCell.t = 'n';
          beratCell.z = '#,##0.00';
        }
        [7, 8, 9, 10].forEach((c) => {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = (worksheet as any)[addr];
          if (cell && typeof cell.v === 'number') {
            cell.t = 'n';
            cell.z = '#,##0';
          }
        });
      }
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const headers = new Headers();
    headers.append('Content-Disposition', 'attachment; filename="laporan_pembelian.xlsx"');
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const responseToReturn = new NextResponse(Buffer.from(excelBuffer), { status: 200, headers });

    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExp = (decodedToken as any).exp as number | undefined;
    let newJwtToken: string | null = null;

    if (tokenExp && (tokenExp - currentTime) < (REFRESH_THRESHOLD + CLOCK_SKEW_TOLERANCE)) {
      const newJti = randomUUID();
      newJwtToken = jwt.sign(
        { userId: decodedToken.userId, email: (decodedToken as any).email, jti: newJti },
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
    console.error('Export purchases report error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred during export.' },
      { status: 500 }
    );
  }
};

export const GET = getExportPurchasesHandler;
