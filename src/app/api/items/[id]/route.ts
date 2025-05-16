import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item, { IItem } from '@/models/Item'; // Added IItem
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';
import { withAuthStatic } from '@/lib/authUtils'; // Import withAuthStatic

interface RouteContext {
  params: {
    id: string;
  };
}

const getSingleItemHandler = async (req: NextRequest, { params }: RouteContext) => {
  await dbConnect();
  const { id } = params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    // Fetch item and include aggregated transaction data
    const itemsWithAggregates = await Item.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: Transaction.collection.name,
          let: { itemId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$item', '$$itemId'] } } },
            { $group: { _id: '$tipe', totalBerat: { $sum: '$berat' } } }
          ],
          as: 'transactionAggregates'
        }
      },
      {
        $addFields: {
          totalMasuk: {
            $reduce: {
              input: '$transactionAggregates',
              initialValue: 0,
              in: { $cond: [{ $eq: ['$$this._id', 'PEMBELIAN'] }, { $add: ['$$value', '$$this.totalBerat'] }, '$$value'] }
            }
          },
          totalKeluar: {
            $reduce: {
              input: '$transactionAggregates',
              initialValue: 0,
              in: { $cond: [{ $eq: ['$$this._id', 'PENJUALAN'] }, { $add: ['$$value', '$$this.totalBerat'] }, '$$value'] }
            }
          }
        }
      },
      { $project: { transactionAggregates: 0 } } // Remove the temporary field
    ]);

    if (!itemsWithAggregates || itemsWithAggregates.length === 0) {
      return NextResponse.json({ message: 'Item not found.' }, { status: 404 });
    }
    return NextResponse.json({ item: itemsWithAggregates[0] as IItem }, { status: 200 });
  } catch (error) {
    console.error(`Get item ${id} error:`, error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

const updateItemNameHandler = async (req: NextRequest, { params }: RouteContext) => {
  await dbConnect();
  const { id } = params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    const { namaBarang } = await req.json();

    if (!namaBarang || typeof namaBarang !== 'string' || namaBarang.trim() === '') {
      return NextResponse.json({ message: 'Nama barang is required and must be a non-empty string.' }, { status: 400 });
    }

    const itemToUpdate = await Item.findById(id);
    if (!itemToUpdate) {
      return NextResponse.json({ message: 'Item not found.' }, { status: 404 });
    }

    // Check if another item with the new name already exists
    const existingItemWithNewName = await Item.findOne({ namaBarang: namaBarang.trim(), _id: { $ne: id } });
    if (existingItemWithNewName) {
      return NextResponse.json({ message: 'Another item with this name already exists.' }, { status: 409 });
    }

    itemToUpdate.namaBarang = namaBarang.trim();
    await itemToUpdate.save();

    // Return the updated item, potentially with aggregates if needed by frontend immediately
    // For simplicity, just returning the updated item from DB.
    // Or call getSingleItemHandler logic here to include aggregates.
    const updatedItem = await Item.findById(id); // Re-fetch to get the plain object

    return NextResponse.json({ message: 'Item name updated successfully.', item: updatedItem }, { status: 200 });
  } catch (error: unknown) {
    console.error(`Update item ${id} error:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    // Check for duplicate key error if unique index on namaBarang is violated by race condition (though checked above)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        return NextResponse.json({ message: 'Item with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

const deleteItemHandler = async (req: NextRequest, { params }: RouteContext) => {
  await dbConnect();
  const { id } = params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    const relatedTransactions = await Transaction.findOne({ item: new mongoose.Types.ObjectId(id) });
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

export const GET = withAuthStatic(getSingleItemHandler);
export const PUT = withAuthStatic(updateItemNameHandler);
export const DELETE = withAuthStatic(deleteItemHandler);
