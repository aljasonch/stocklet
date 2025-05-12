import { NextResponse, NextRequest } from 'next/server'; 
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { TransactionType } from '@/types/enums'; 
import { IItem } from '@/models/Item';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx'; // SheetJS
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils';

interface SalesMatchQuery {
  tipe: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  customer?: { $regex: RegExp };
  item?: mongoose.Types.ObjectId;
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


const getExportSalesHandler = async (request: NextRequest): Promise<NextResponse> => {
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

    const matchQuery: SalesMatchQuery = { tipe: TransactionType.PENJUALAN };

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

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const headers = new Headers();
    headers.append('Content-Disposition', 'attachment; filename="laporan_penjualan.xlsx"');
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    return new NextResponse(Buffer.from(excelBuffer), { status: 200, headers });

  } catch (error) {
    console.error('Export sales report error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred during export.' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getExportSalesHandler);
