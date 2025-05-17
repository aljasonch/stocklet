import { NextRequest } from 'next/server'; // NextResponse removed
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import mongoose from 'mongoose';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils'; // Import withAuthStatic and HandlerResult

interface AdjustStockContext { // Define context type for params
  params: {
    id: string;
  };
}

const adjustStockHandler = async (
  req: NextRequest,
  context: AdjustStockContext, // Use the defined context type
  _userId: string, // Prefixed as it's not directly used in this handler, but required by withAuthStatic
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();
  const id = context.params.id; // Item ID from path

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, error: 'Invalid item ID.' };
  }

  try {
    const body = await req.json();
    const { adjustment, type } = body;

    if (typeof adjustment !== 'number' || isNaN(adjustment)) {
      return { status: 400, error: 'Adjustment value must be a number.' };
    }
    if (!['set', 'add', 'subtract'].includes(type)) {
      return { status: 400, error: "Invalid adjustment type. Must be 'set', 'add', or 'subtract'." };
    }

    // If items were user-specific, add createdBy: userId to findById query
    const item = await Item.findById(id);
    if (!item) {
      return { status: 404, error: 'Item not found.' };
    }
    // Add check: if (item.createdBy.toString() !== userId) return { status: 403, error: 'Forbidden' };


    let newStock = item.stokSaatIni;
    if (type === 'set') {
      newStock = adjustment;
    } else if (type === 'add') {
      newStock += adjustment;
    } else if (type === 'subtract') {
      newStock -= adjustment;
    }

    if (newStock < 0) {
      return { status: 400, error: 'Stock cannot be negative after adjustment.' };
    }

    item.stokSaatIni = newStock;
    await item.save();

    return { status: 200, message: 'Stock adjusted successfully.', data: { item } };

  } catch (error: unknown) {
    console.error(`Adjust stock for item ${id} error:`, error);
    if (error instanceof mongoose.Error.ValidationError) { // Check specifically for Mongoose ValidationError
      return { status: 400, error: error.message };
    }
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const POST = withAuthStatic(adjustStockHandler);
