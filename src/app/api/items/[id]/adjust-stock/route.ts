import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import mongoose from 'mongoose';
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils';
import { ObjectId } from 'mongoose'; // Import ObjectId type

interface AdjustStockRouteParams {
  id: string;
}

const adjustStockHandler: AuthenticatedApiHandler<AdjustStockRouteParams> = async (req, { params }) => { // Use specific params type
  await dbConnect();
  const id = params?.id as string | undefined; 

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { adjustment, type } = body; 

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

    return NextResponse.json({ message: 'Stock adjusted successfully.', item }, { status: 200 });

  } catch (error: unknown) { // Changed any to unknown
    console.error(`Adjust stock for item ${id} error:`, error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

export const POST = withAuth(adjustStockHandler);
