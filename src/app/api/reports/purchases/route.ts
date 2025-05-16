import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { TransactionType } from '@/types/enums';
import { IItem } from '@/models/Item';
import mongoose from 'mongoose';
import { withAuthStatic, getUserIdFromToken } from '@/lib/authUtils'; // Import getUserIdFromToken

interface PurchaseReportMatchQuery {
  createdBy: mongoose.Types.ObjectId; // Added for user filtering
  tipe: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  customer?: { $regex: RegExp }; // Field is 'customer' in model, will be 'Supplier' on frontend
  item?: mongoose.Types.ObjectId;
}

const getPurchaseReportHandler = async (req: NextRequest) => {
  await dbConnect();

  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const supplier = searchParams.get('supplier'); // Query param can be 'supplier'
    const itemId = searchParams.get('itemId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view');

    const matchQuery: PurchaseReportMatchQuery = {
      createdBy: new mongoose.Types.ObjectId(userId), // Filter by userId
      tipe: TransactionType.PEMBELIAN
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

    if (supplier) {
      const trimmedSupplier = supplier.trim();
      // Use the 'customer' field in the database query
      const escapedSupplier = trimmedSupplier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchQuery.customer = { $regex: new RegExp(escapedSupplier, 'i') };
    }

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      matchQuery.item = new mongoose.Types.ObjectId(itemId);
    }

    const purchaseReport = await Transaction.find(matchQuery)
      .populate<{item: IItem}>('item', 'namaBarang')
      .sort({ tanggal: -1 });

    return NextResponse.json({ purchaseReport }, { status: 200 });
  } catch (error) {
    console.error('Get purchase report error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

export const GET = withAuthStatic(getPurchaseReportHandler);
