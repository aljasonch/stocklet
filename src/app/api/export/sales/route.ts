import { NextResponse, NextRequest } from 'next/server'; 
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { TransactionType } from '@/types/enums'; 
import { IItem } from '@/models/Item';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx'; // SheetJS
// withAuthStatic is removed, auth handled manually
import { verifyTokenFromCookies } from '@/lib/authUtils'; // For manual auth check
import jwt from 'jsonwebtoken'; // For re-signing token
import { randomUUID } from 'crypto'; // For new JTI

// Constants for token refresh (should match those in authUtils.ts)
const JWT_ISSUER = 'stocklet-app';
const JWT_AUDIENCE = 'stocklet-users';
const JWT_EXPIRY = '15m';
const COOKIE_MAX_AGE = 15 * 60;
const CLOCK_SKEW_TOLERANCE = 60;
const REFRESH_THRESHOLD = 5 * 60;


interface SalesMatchQuery {
  createdBy: mongoose.Types.ObjectId; // Add createdBy for filtering
  tipe: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  customer?: { $regex: RegExp };
  item?: mongoose.Types.ObjectId;
  $and?: Array<Record<string, unknown>>; // Added $and for complex queries
}

interface SheetRow {
  'Tanggal': string | 'TOTAL';
  'Customer': string;
  'No. SJ': string;
  'No. Inv': string;
  'No.PO': string;
  'Barang': string;
  'Berat (kg)': number | undefined | null; 
  'Harga': number | undefined | null; 
  'Total Harga': number | undefined | null;
  'No.SJ SBY': string;
}


const getExportSalesHandler = async (request: NextRequest): Promise<Response> => { // Return type is Response
  const decodedToken = verifyTokenFromCookies(request);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: 'Unauthorized: Invalid or expired token' }, { status: 401 });
  }
  const userId = decodedToken.userId; // Get userId for query

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
    // noSjType filter from sales report API should also be applied here if it was added to queryParams by frontend
    const noSjType = searchParams.get('noSjType') as 'all' | 'noSJ' | 'noSJSby' | null;


    const matchQuery: SalesMatchQuery = { 
      createdBy: new mongoose.Types.ObjectId(userId), // Filter by userId
      tipe: TransactionType.PENJUALAN 
    };

    if (view === 'monthly' && year && month) {
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      matchQuery.tanggal = { $gte: firstDay, $lte: lastDay };
    } else if (startDate && endDate) {
      matchQuery.tanggal = { 
        $gte: new Date(startDate), 
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    } else if (year && !month && view !== 'custom_range') { 
        const firstDayOfYear = new Date(parseInt(year), 0, 1);
        const lastDayOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
        matchQuery.tanggal = { $gte: firstDayOfYear, $lte: lastDayOfYear };
    }


    if (customer) {
      matchQuery.customer = { $regex: new RegExp(customer, 'i') };
    }
    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchQuery.item = new mongoose.Types.ObjectId(itemId);
    }
    
    // Apply noSjType filter similar to the reports/sales API
    if (noSjType && noSjType !== 'all') {
      matchQuery.$and = matchQuery.$and || [];
      if (noSjType === 'noSJ') {
        matchQuery.$and.push({ noSJ: { $exists: true, $nin: [null, ""] } });
        matchQuery.$and.push({ $or: [{ noSJSby: { $exists: false } }, { noSJSby: null }, { noSJSby: "" }] });
      } else if (noSjType === 'noSJSby') {
        matchQuery.$and.push({ noSJSby: { $exists: true, $nin: [null, ""] } });
      }
      if (matchQuery.$and && matchQuery.$and.length === 0) {
        delete matchQuery.$and;
      }
    }

    const salesData = await Transaction.find(matchQuery)
      .populate<{item: IItem}>('item', 'namaBarang')
      .sort({ tanggal: -1 })
      .lean(); 

    if (salesData.length === 0) {
      return NextResponse.json({ message: 'No data to export for the selected filters.' }, { status: 404 });
    }

    const dataForSheet: SheetRow[] = salesData.map(tx => ({ 
      'Tanggal': new Date(tx.tanggal).toLocaleDateString(),
      'Customer': tx.customer,
      'No. SJ': tx.noSJ || '', 
      'No. Inv': tx.noInv || '',
      'No.PO': tx.noPO || '',
      'Barang': (tx.item as IItem)?.namaBarang || tx.namaBarangSnapshot || 'N/A',
      'Berat (kg)': tx.berat,
      'Harga': tx.harga,
      'Total Harga': tx.totalHarga,
      'No.SJ SBY': tx.noSJSby || '',
    }));

    const totalBerat = salesData.reduce((sum, tx) => sum + tx.berat, 0);
    const totalNilai = salesData.reduce((sum, tx) => sum + tx.totalHarga, 0);

    const emptyRowForSheet: SheetRow = {
      'Tanggal': '', 'Customer': '', 'No. SJ': '', 'No. Inv': '', 'No.PO': '',
      'Barang': '', 'Berat (kg)': null, 'Harga': null,
      'Total Harga': null, 'No.SJ SBY': ''
    };
    dataForSheet.push(emptyRowForSheet);

    dataForSheet.push({
        'Tanggal': 'TOTAL',
        'Customer': '',
        'No. SJ': '', 
        'No. Inv': '', 
        'No.PO': '',
        'Barang': '',
        'Berat (kg)': totalBerat,
        'Harga': null,
        'Total Harga': totalNilai,
        'No.SJ SBY': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

    const columnWidths = [
        { wch: 12 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
        { wch: 15 }, 
        { wch: 18 }, 
        { wch: 15 }, 
    ];
    worksheet['!cols'] = columnWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });    const headers = new Headers();
    headers.append('Content-Disposition', 'attachment; filename="laporan_penjualan.xlsx"');
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    const responseToReturn = new NextResponse(Buffer.from(excelBuffer), { status: 200, headers });

    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExp = decodedToken.exp;
    let newJwtToken: string | null = null;

    if (tokenExp) {
      if ((tokenExp - currentTime) < (REFRESH_THRESHOLD + CLOCK_SKEW_TOLERANCE)) {
        const newJti = randomUUID();
        newJwtToken = jwt.sign(
          { userId: decodedToken.userId, email: decodedToken.email, jti: newJti },
          process.env.JWT_SECRET!,
          { 
            expiresIn: JWT_EXPIRY,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
          }
        );
      }
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
    // Return a JSON error response if something goes wrong before file generation
    return NextResponse.json(
      { message: 'An internal server error occurred during export.' },
      { status: 500 }
    );
  }
};

export const GET = getExportSalesHandler; // Export directly, not wrapped with withAuthStatic
