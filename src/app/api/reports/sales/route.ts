import { NextResponse, NextRequest } from 'next/server'; 
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { TransactionType } from '@/types/enums'; 
import { IItem } from '@/models/Item';
import mongoose from 'mongoose';
import { withAuthStatic, getUserIdFromToken } from '@/lib/authUtils'; // Import getUserIdFromToken

interface SalesReportMatchQuery {
  createdBy: mongoose.Types.ObjectId; // Added for user filtering
  tipe: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  customer?: { $regex: RegExp };
  item?: mongoose.Types.ObjectId;
  $and?: Array<Record<string, any>>; // For NoSJ type filtering
}

const getSalesReportHandler = async (req: NextRequest) => {
  await dbConnect();

  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const customer = searchParams.get('customer');
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view');
    const noSjType = searchParams.get('noSjType') as 'all' | 'noSJ' | 'noSJSby' | null;

    const matchQuery: SalesReportMatchQuery = {
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
    } else if (year && !month) {
        const firstDayOfYear = new Date(parseInt(year), 0, 1);
        const lastDayOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
        matchQuery.tanggal = { $gte: firstDayOfYear, $lte: lastDayOfYear };
    }


    if (customer) {
      const trimmedCustomer = customer.trim();
      const escapedCustomer = trimmedCustomer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchQuery.customer = { $regex: new RegExp(escapedCustomer, 'i') };
    }

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchQuery.item = new mongoose.Types.ObjectId(itemId);
    }

    // Add NoSJ type filtering
    if (noSjType && noSjType !== 'all') {
      matchQuery.$and = matchQuery.$and || [];
      if (noSjType === 'noSJ') {
        // Has noSJ AND (noSJSby is null OR noSJSby is empty string OR noSJSby does not exist)
        matchQuery.$and.push({
          noSJ: { $exists: true, $nin: [null, ""] } // noSJ exists and is not null or empty
        });
        matchQuery.$and.push({
          $or: [
            { noSJSby: { $exists: false } }, // Does not exist
            { noSJSby: null },              // Is null
            { noSJSby: "" }                 // Is an empty string
          ]
        });
      } else if (noSjType === 'noSJSby') {
        // Has noSJSby (exists and is not null or empty)
        matchQuery.$and.push({
          noSJSby: { $exists: true, $nin: [null, ""] }
        });
      }
    }
    // If $and is empty, remove it to avoid MongoDB errors with empty $and
    if (matchQuery.$and && matchQuery.$and.length === 0) {
      delete matchQuery.$and;
    }


    const salesReport = await Transaction.find(matchQuery)
      .populate<{item: IItem}>('item', 'namaBarang')
      .sort({ tanggal: -1 });

    return NextResponse.json({ salesReport }, { status: 200 });
  } catch (error) {
    console.error('Get sales report error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

export const GET = withAuthStatic(getSalesReportHandler);
