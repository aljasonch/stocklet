import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction';
import Item, { IItem } from '@/models/Item';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils'; 
import mongoose from 'mongoose';

interface RouteContext {
  params: {
    id: string;
  };
}

const getItemTransactionsHandler = async (
  req: NextRequest,
  context: RouteContext,
  userId: string,
  _userEmail: string, 
  _jti: string 
): Promise<HandlerResult> => {
  await dbConnect();
  const { id: itemId } = context.params;

  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return { status: 400, error: 'Valid Item ID is required.' };
  }

  try {
    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return { status: 404, error: 'Item not found.' };
    }

    const transactions = await Transaction.find({ 
      item: itemId, 
      createdBy: new mongoose.Types.ObjectId(userId)
    })
      .sort({ tanggal: -1, _id: -1 })
      .lean(); 

    return { status: 200, data: { transactions: transactions as ITransaction[] } };
  } catch (error) {
    console.error(`Get item transactions error for item ID ${itemId}:`, error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getItemTransactionsHandler);
