import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';
import { getUserIdFromToken } from '@/lib/authUtils'; // Import getUserIdFromToken

const getSingleItemHandler = async (req: NextRequest, { params }: { params: { id: string } }) => { // Revert type
  // --- Add Auth Check ---
  const userId = getUserIdFromToken(req);
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  // --- End Auth Check ---

  await dbConnect();
  const id = params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    const item = await Item.findById(id);
    if (!item) {
      return NextResponse.json({ message: 'Item not found.' }, { status: 404 });
    }
    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error(`Get item ${id} error:`, error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

const deleteItemHandler = async (req: NextRequest, { params }: { params: { id: string } }) => { // Revert type
  // --- Add Auth Check ---
  const userId = getUserIdFromToken(req);
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  // --- End Auth Check ---

  await dbConnect();
  const id = params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    const relatedTransactions = await Transaction.findOne({ item: id });
    if (relatedTransactions) {
      return NextResponse.json(
        { message: 'Cannot delete item. It has associated transactions. Consider deactivating it instead.' },
        { status: 400 }
      );
    }

    const deletedItem = await Item.findByIdAndDelete(id);
    if (!deletedItem) {
      return NextResponse.json({ message: 'Item not found to delete.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Item deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`Delete item ${id} error:`, error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

export const GET = getSingleItemHandler; // Remove withAuth wrapper and explicit type
export const DELETE = deleteItemHandler; // Remove withAuth wrapper and explicit type
