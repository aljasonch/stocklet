import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import CustomerLedger from '@/models/CustomerLedger';
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
    const transactionMatchCondition: mongoose.FilterQuery<any> = {
      createdBy: new mongoose.Types.ObjectId(userId),
    };

    const ledgerMatchCondition: mongoose.FilterQuery<any> = {
      createdBy: new mongoose.Types.ObjectId(userId),
    };

    if (searchQuery) {
      transactionMatchCondition.customer = { $regex: new RegExp(searchQuery, 'i') };
      ledgerMatchCondition.customerName = { $regex: new RegExp(searchQuery, 'i') };
    }

    const transactionPipeline: mongoose.PipelineStage[] = [
      { $match: transactionMatchCondition },
      { $group: { _id: '$customer' } },
    ];

    const ledgerPipeline: mongoose.PipelineStage[] = [
      { $match: ledgerMatchCondition },
      { $group: { _id: '$customerName' } }, 
    ];

    const [transactionResults, ledgerResults] = await Promise.all([
      Transaction.aggregate(transactionPipeline),
      CustomerLedger.aggregate(ledgerPipeline)
    ]);

    const transactionCustomers = transactionResults.map(item => item._id);
    const ledgerCustomers = ledgerResults.map(item => item._id);
    
    const allCustomers = [...new Set([...transactionCustomers, ...ledgerCustomers])]
      .filter(name => name != null)
      .sort();
    
    const finalCustomers = limit ? allCustomers.slice(0, limit) : allCustomers;

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
