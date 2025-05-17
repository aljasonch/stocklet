import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction';
import Item, { IItem } from '@/models/Item'; // Import IItem
import { withAuthStatic, HandlerResult } from '@/lib/authUtils'; // Import HandlerResult
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

    // Fetch transactions for the specific item AND created by the current user
    const transactions = await Transaction.find({ 
      item: itemId, 
      createdBy: new mongoose.Types.ObjectId(userId) // Ensure userId is ObjectId for query
    })
      .populate<{item: IItem}>('item', 'namaBarang') 
      .sort({ tanggal: -1 });

    return { status: 200, data: { transactions: transactions as ITransaction[] } };
  } catch (error) {
    console.error(`Get item transactions error for item ID ${itemId}:`, error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getItemTransactionsHandler);
