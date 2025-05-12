import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import Transaction from '@/models/Transaction'; // To check for related transactions
import mongoose from 'mongoose';
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils';

interface Params {
  id: string;
}

// GET a single item by ID (optional, can be useful for an edit item form later)
const getSingleItemHandler: AuthenticatedApiHandler = async (req, { params }) => {
  await dbConnect();
  const id = params?.id;

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

// DELETE an item
const deleteItemHandler: AuthenticatedApiHandler = async (req, { params }) => {
  await dbConnect();
  const id = params?.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    // Check if there are any transactions associated with this item
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

// Placeholder for PUT (update item) if needed later
// const updateItemHandler: AuthenticatedApiHandler = async (req, { params, userId }) => {
//   // ... implementation ...
// };

export const GET = withAuth(getSingleItemHandler);
export const DELETE = withAuth(deleteItemHandler);
// export const PUT = withAuth(updateItemHandler); // Uncomment if PUT is implemented
