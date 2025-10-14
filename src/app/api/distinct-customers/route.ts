import { NextRequest } from 'next/server';
import { Document } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';
import mongoose from 'mongoose';

const getDistinctCustomersHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get('search') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const transactionMatchCondition: mongoose.FilterQuery<Document> & { customer?: { $regex: RegExp } } = {
      createdBy: new mongoose.Types.ObjectId(userId),
    };

    const ledgerMatchCondition: mongoose.FilterQuery<Document> & { customerName?: { $regex: RegExp } } = {
      createdBy: new mongoose.Types.ObjectId(userId),
    };

    if (searchQuery) {
      transactionMatchCondition.customer = { $regex: new RegExp(searchQuery, 'i') };
      ledgerMatchCondition.customerName = { $regex: new RegExp(searchQuery, 'i') };
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: transactionMatchCondition },
      { $project: { name: '$customer' } },
      {
        $unionWith: {
          coll: 'customerledgers',
          pipeline: [
            { $match: ledgerMatchCondition },
            { $project: { name: '$customerName' } },
          ],
        },
      },
      { $group: { _id: '$name' } },
      { $sort: { _id: 1 } },
      ...(limit ? [{ $limit: limit }] : []),
    ];

    const results = await Transaction.aggregate(pipeline);
    const finalCustomers = results.map(r => r._id).filter((n): n is string => n != null);

    return {
      status: 200,
      data: { customers: finalCustomers },
    };
  } catch (error) {
    console.error('Get distinct customers error:', error);
    return { status: 500, error: 'An internal server error occurred while fetching distinct customers.' };
  }
};

export const GET = withAuthStatic(getDistinctCustomersHandler);
