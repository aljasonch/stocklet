import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import mongoose from 'mongoose';
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils'; // Assuming this path is correct

interface AdjustStockParams {
  id: string;
}

// This should be a POST request to /api/items/[id]/adjust-stock
const adjustStockHandler: AuthenticatedApiHandler = async (req, { params }) => {
  await dbConnect();
  const id = params?.id; // id from dynamic route segment

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { adjustment, type } = body; // adjustment is a number, type can be 'set', 'add', 'subtract'

    if (typeof adjustment !== 'number' || isNaN(adjustment)) {
      return NextResponse.json({ message: 'Adjustment value must be a number.' }, { status: 400 });
    }
    if (!['set', 'add', 'subtract'].includes(type)) {
        return NextResponse.json({ message: "Invalid adjustment type. Must be 'set', 'add', or 'subtract'." }, { status: 400 });
    }

    const item = await Item.findById(id);
    if (!item) {
      return NextResponse.json({ message: 'Item not found.' }, { status: 404 });
    }

    let newStock = item.stokSaatIni;
    if (type === 'set') {
      newStock = adjustment;
    } else if (type === 'add') {
      newStock += adjustment;
    } else if (type === 'subtract') {
      newStock -= adjustment;
    }

    if (newStock < 0) {
      return NextResponse.json({ message: 'Stock cannot be negative after adjustment.' }, { status: 400 });
    }

    item.stokSaatIni = newStock;
    await item.save();

    // Optionally, log this adjustment as a special type of transaction if audit trail is needed.
    // For now, direct adjustment.

    return NextResponse.json({ message: 'Stock adjusted successfully.', item }, { status: 200 });

  } catch (error: any) {
    console.error(`Adjust stock for item ${id} error:`, error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

export const POST = withAuth(adjustStockHandler);
