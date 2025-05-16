import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction';
import Item from '@/models/Item';
import { withAuthStatic, getUserIdFromToken } from '@/lib/authUtils'; // Import getUserIdFromToken
import mongoose from 'mongoose';

interface RouteContext { // Renamed Params to RouteContext for consistency
  params: {
    id: string;
  };
}

const getItemTransactionsHandler = async (req: NextRequest, { params }: RouteContext) => {
  await dbConnect();
  const { id: itemId } = params;

  const userId = getUserIdFromToken(req); // Get userId
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return NextResponse.json({ message: 'Valid Item ID is required.' }, { status: 400 });
  }

  try {
    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return NextResponse.json({ message: 'Item not found.' }, { status: 404 });
    }

    // Fetch transactions for the specific item AND created by the current user
    const transactions = await Transaction.find({ 
      item: itemId, 
      createdBy: userId 
    })
      .populate('item', 'namaBarang') // Keep item populated for context if needed
      .sort({ tanggal: -1 });

    return NextResponse.json({ transactions: transactions as ITransaction[] }, { status: 200 });
  } catch (error) {
    console.error(`Get item transactions error for item ID ${itemId}:`, error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

export const GET = withAuthStatic(getItemTransactionsHandler);
