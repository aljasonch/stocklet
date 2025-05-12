import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction'; // TransactionType was removed from here
import { TransactionType } from '@/types/enums'; // Correct: Import TransactionType from enums
import Item, { IItem } from '@/models/Item';
import mongoose from 'mongoose';
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils';

const getSalesReportHandler: AuthenticatedApiHandler = async (req, { userId }) => {
  await dbConnect();

  // userId is available if reports need to be user-specific in the future

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // 1-12
    const year = searchParams.get('year');
    const customer = searchParams.get('customer'); // Customer name/ID
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view'); // 'monthly' or 'overall'

    let matchQuery: any = { tipe: TransactionType.PENJUALAN };

    if (view === 'monthly' && year && month) {
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999); // End of the last day of the month
      matchQuery.tanggal = { $gte: firstDay, $lte: lastDay };
    } else if (startDate && endDate) {
      matchQuery.tanggal = { 
        $gte: new Date(startDate), 
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) // Include the whole end day
      };
    } else if (year && !month) { // Filter by whole year if only year is provided
        const firstDayOfYear = new Date(parseInt(year), 0, 1);
        const lastDayOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
        matchQuery.tanggal = { $gte: firstDayOfYear, $lte: lastDayOfYear };
    }


    if (customer) {
      const trimmedCustomer = customer.trim();
      // Escape special characters for regex
      const escapedCustomer = trimmedCustomer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchQuery.customer = { $regex: new RegExp(escapedCustomer, 'i') };
    }

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchQuery.item = new mongoose.Types.ObjectId(itemId);
    }

    const salesReport = await Transaction.find(matchQuery)
      .populate<{item: IItem}>('item', 'namaBarang') // Populate item name
      .sort({ tanggal: -1 });

    // Further aggregation can be done here if needed (e.g., sum by item, by customer)
    // For now, returning filtered transactions.

    return NextResponse.json({ salesReport }, { status: 200 });
  } catch (error) {
    console.error('Get sales report error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(getSalesReportHandler);
