import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction'; // TransactionType was removed from here
import { TransactionType } from '@/types/enums'; // Correct: Import TransactionType from enums
import Item, { IItem } from '@/models/Item';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx'; // SheetJS
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils';

const getExportSalesHandler: AuthenticatedApiHandler = async (req, { userId }) => {
  await dbConnect();

  // userId is available if export needs to be user-specific

  try {
    const { searchParams } = new URL(req.url);
    // --- Re-use filter logic from sales report API ---
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const customer = searchParams.get('customer');
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view');

    let matchQuery: any = { tipe: TransactionType.PENJUALAN };

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
    // --- End of filter logic ---

    const salesData = await Transaction.find(matchQuery)
      .populate<{item: IItem}>('item', 'namaBarang')
      .sort({ tanggal: -1 })
      .lean(); // Use .lean() for plain JS objects, good for read-only ops

    if (salesData.length === 0) {
      return NextResponse.json({ message: 'No data to export for the selected filters.' }, { status: 404 });
    }

    // Prepare data for Excel
    const dataForSheet = salesData.map(tx => ({
      'Tanggal': new Date(tx.tanggal).toLocaleDateString(),
      'Customer': tx.customer,
      'No. SJ': tx.noSJ, // Changed
      'No. Inv': tx.noInv, // New
      'No.PO': tx.noPO || '',
      'Barang': (tx.item as IItem)?.namaBarang || tx.namaBarangSnapshot || 'N/A',
      'Berat (kg)': tx.berat,
      'Harga': tx.harga,
      'Total Harga': tx.totalHarga,
      'No.SJ SBY': tx.noSJSby || '',
    }));
    
    // Calculate totals for a summary row (optional)
    const totalBerat = salesData.reduce((sum, tx) => sum + tx.berat, 0);
    const totalNilai = salesData.reduce((sum, tx) => sum + tx.totalHarga, 0);

    // Define an empty row structure matching the expected type for dataForSheet
    // Use undefined for numeric fields that should be empty in this row.
    const emptyRowForSheet = {
      'Tanggal': '', 'Customer': '', 'No. SJ': '', 'No. Inv': '', 'No.PO': '', 
      'Barang': '', 'Berat (kg)': undefined as number | undefined, 'Harga': undefined as number | undefined, 
      'Total Harga': undefined as number | undefined, 'No.SJ SBY': ''
    };
    // We cast dataForSheet to any[] before pushing these special rows to bypass strict type checking for these rows.
    (dataForSheet as any[]).push(emptyRowForSheet); 

    (dataForSheet as any[]).push({
        'Tanggal': 'TOTAL',
        'Customer': '',
        'No. SJ': '', // Changed
        'No. Inv': '', // New
        'No.PO': '',
        'Barang': '',
        'Berat (kg)': totalBerat,
        'Harga': undefined, // Price per kg is not summed
        'Total Harga': totalNilai,
        'No.SJ SBY': '',
    });


    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

    // Set column widths (optional, but improves readability)
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
        { wch: 15 }, // No.SJ SBY
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
