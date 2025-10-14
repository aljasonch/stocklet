import { NextRequest } from 'next/server'; 
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction'; 
import { TransactionType } from '@/types/enums'; 
import mongoose from 'mongoose';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';

interface SalesReportMatchQuery {
  createdBy: mongoose.Types.ObjectId;
  tipe: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  customer?: { $regex: RegExp };
  item?: mongoose.Types.ObjectId;
  $and?: Array<Record<string, unknown>>;
}

const getSalesReportHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string, 
  _jti: string 
): Promise<HandlerResult> => {
  await dbConnect();

  try {
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

    if (noSjType && noSjType !== 'all') {
      matchQuery.$and = matchQuery.$and || [];
      if (noSjType === 'noSJ') {
        matchQuery.$and.push({
          noSJ: { $exists: true, $nin: [null, ""] } 
        });
        matchQuery.$and.push({
          $or: [
            { noSJSby: { $exists: false } }, 
            { noSJSby: null },              
            { noSJSby: "" }  
          ]
        });
      } else if (noSjType === 'noSJSby') {
        matchQuery.$and.push({
          noSJSby: { $exists: true, $nin: [null, ""] }
        });
      }
    }
    if (matchQuery.$and && matchQuery.$and.length === 0) {
      delete matchQuery.$and;
    }


    const salesReport = await Transaction.find(matchQuery)
      .sort({ tanggal: 1, _id: 1 })
      .lean();

    return { status: 200, data: { salesReport: salesReport as ITransaction[] } };
  } catch (error) {
    console.error('Get sales report error:', error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getSalesReportHandler);
