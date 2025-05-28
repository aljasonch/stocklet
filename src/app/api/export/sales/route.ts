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


interface SalesMatchQuery {
  createdBy: mongoose.Types.ObjectId;
  tipe: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  customer?: { $regex: RegExp };
  item?: mongoose.Types.ObjectId;
  $and?: Array<Record<string, unknown>>;
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
  'Subtotal': number | undefined | null;
  'PPN (11%)': number | undefined | null;
  'Total': number | undefined | null;
  'No.SJ SBY': string;
}


const getExportSalesHandler = async (request: NextRequest): Promise<Response> => {
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
    const customer = searchParams.get('customer');
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view');
    const noSjType = searchParams.get('noSjType') as 'all' | 'noSJ' | 'noSJSby' | null;


    const matchQuery: SalesMatchQuery = { 
      createdBy: new mongoose.Types.ObjectId(userId), 
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
    const dataForSheet: SheetRow[] = salesData.map(tx => { 
    const ppnAmount = tx.totalHarga * 0.11;
    const totalWithPPN = tx.totalHarga + ppnAmount;
      
      return {
        'Tanggal': new Date(tx.tanggal).toLocaleDateString(),
        'Customer': tx.customer,
        'No. SJ': tx.noSJ || '', 
        'No. Inv': tx.noInv || '',
        'No.PO': tx.noPO || '',
        'Barang': (tx.item as IItem)?.namaBarang || tx.namaBarangSnapshot || 'N/A',
        'Berat (kg)': tx.berat,
        'Harga': tx.harga,
        'Subtotal': tx.totalHarga,
        'PPN (11%)': ppnAmount,
        'Total': totalWithPPN,
        'No.SJ SBY': tx.noSJSby || '',
      };});    
    const totalBerat = salesData.reduce((sum, tx) => sum + tx.berat, 0);
    const totalNilai = salesData.reduce((sum, tx) => sum + tx.totalHarga, 0);
    const totalPPN = totalNilai * 0.11;
    const totalDenganPPN = totalNilai + totalPPN;

    const emptyRowForSheet: SheetRow = {
      'Tanggal': '', 'Customer': '', 'No. SJ': '', 'No. Inv': '', 'No.PO': '',
      'Barang': '', 'Berat (kg)': null, 'Harga': null,
      'Subtotal': null, 'PPN (11%)': null, 'Total': null, 'No.SJ SBY': ''
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
        'Subtotal': totalNilai,
        'PPN (11%)': totalPPN,
        'Total': totalDenganPPN,
        'No.SJ SBY': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');    
    const columnWidths = [
        { wch: 12 }, // Tanggal
        { wch: 25 }, // Customer
        { wch: 15 }, // No. SJ
        { wch: 15 }, // No. Inv
        { wch: 15 }, // No.PO
        { wch: 30 }, // Barang
        { wch: 12 }, // Berat (kg)
        { wch: 15 }, // Harga
        { wch: 18 }, // Total Harga
        { wch: 15 }, // PPN (11%)
        { wch: 18 }, // Total + PPN
        { wch: 15 }, // No.SJ SBY
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
    return NextResponse.json(
      { message: 'An internal server error occurred during export.' },
      { status: 500 }
    );
  }
};

export const GET = getExportSalesHandler; 
