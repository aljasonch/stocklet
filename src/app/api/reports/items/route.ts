import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { TransactionType } from '@/types/enums';
import mongoose from 'mongoose';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';

interface MatchQuery {
  createdBy: mongoose.Types.ObjectId;
  tipe?: TransactionType;
  tanggal?: { $gte: Date; $lte: Date };
  item?: mongoose.Types.ObjectId;
}

const getItemsSummaryHandler = async (
  req: NextRequest,
  _context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const itemId = searchParams.get('itemId');
  const customer = searchParams.get('customer');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const tipe = searchParams.get('tipe') as TransactionType | null;
  const noSjType = searchParams.get('noSjType') as 'all' | 'noSJ' | 'noSJSby' | null

  const matchQuery: MatchQuery = {
    createdBy: new mongoose.Types.ObjectId(userId),
  } as MatchQuery;

  if (tipe && Object.values(TransactionType).includes(tipe)) {
    matchQuery.tipe = tipe;
  }

  if (startDate && endDate) {
    matchQuery.tanggal = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
  } else if (year && month) {
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    matchQuery.tanggal = { $gte: firstDay, $lte: lastDay };
  } else if (year && !month) {
    const firstDayOfYear = new Date(parseInt(year), 0, 1);
    const lastDayOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
    matchQuery.tanggal = { $gte: firstDayOfYear, $lte: lastDayOfYear };
  }

  if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
    matchQuery.item = new mongoose.Types.ObjectId(itemId);
  }

  if (customer) {
    const trimmed = customer.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    (matchQuery as any).customer = { $regex: new RegExp(escaped, 'i') };
  }

  const andConditions: any[] = [];
  if (noSjType && noSjType !== 'all') {
    if (noSjType === 'noSJ') {
      andConditions.push({ noSJ: { $exists: true, $nin: [null, ''] } });
      andConditions.push({ $or: [ { noSJSby: { $exists: false } }, { noSJSby: null }, { noSJSby: '' } ] });
    } else if (noSjType === 'noSJSby') {
      andConditions.push({ noSJSby: { $exists: true, $nin: [null, ''] } });
    }
  }
  if (andConditions.length > 0) {
    (matchQuery as any).$and = andConditions;
  }

  try {
    const summary = await Transaction.aggregate([
      { $match: matchQuery as any },
      {
        $group: {
          _id: '$customer',
          totalBerat: { $sum: '$berat' },
          totalNilai: { $sum: '$totalHarga' },
        },
      },
      { $sort: { totalNilai: -1 } },
    ]);

    return { status: 200, data: { summary } };
  } catch (error) {
    console.error('Get items summary error:', error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getItemsSummaryHandler);
