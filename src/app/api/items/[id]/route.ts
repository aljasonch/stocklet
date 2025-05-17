import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item, { IItem } from '@/models/Item';
import Transaction from '@/models/Transaction'; // Ensure Transaction model is imported for $lookup
import { TransactionType } from '@/types/enums'; // Ensure TransactionType is imported for $lookup
import mongoose from 'mongoose';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils'; // Import HandlerResult

interface RouteContext {
  params: {
    id: string;
  };
}

const getSingleItemHandler = async (
  req: NextRequest,
  context: RouteContext,
  _userId: string, // Prefixed if not used, but required by withAuthStatic
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();
  const { id } = context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, error: 'Invalid item ID.' };
  }

  try {
    // userId is available if items need to be user-specific in the future for the $match stage
    const itemsWithAggregates = await Item.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } }, // Potentially add createdBy: userId here if items are user-specific
      {
        $lookup: {
          from: Transaction.collection.name,
          let: { itemId: '$_id' },
          pipeline: [
            // If transactions in lookup should also be user-specific (they are already via main queries)
            // { $match: { $expr: { $and: [ { $eq: ['$item', '$$itemId'] }, { $eq: ['$createdBy', new mongoose.Types.ObjectId(userId)] } ] } } },
            { $match: { $expr: { $eq: ['$item', '$$itemId'] } } }, // Simpler: item's own transactions
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
              in: { $cond: [{ $eq: ['$$this._id', TransactionType.PEMBELIAN] }, { $add: ['$$value', '$$this.totalBerat'] }, '$$value'] }
            }
          },
          totalKeluar: {
            $reduce: {
              input: '$transactionAggregates',
              initialValue: 0,
              in: { $cond: [{ $eq: ['$$this._id', TransactionType.PENJUALAN] }, { $add: ['$$value', '$$this.totalBerat'] }, '$$value'] }
            }
          }
        }
      },
      { $project: { transactionAggregates: 0 } }
    ]);

    if (!itemsWithAggregates || itemsWithAggregates.length === 0) {
      return { status: 404, error: 'Item not found.' };
    }
    return { status: 200, data: { item: itemsWithAggregates[0] as IItem } };
  } catch (error) {
    console.error(`Get item ${id} error:`, error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

const updateItemNameHandler = async (
  req: NextRequest,
  context: RouteContext,
  _userId: string, 
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();
  const { id } = context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, error: 'Invalid item ID.' };
  }

  try {
    const { namaBarang } = await req.json();

    if (!namaBarang || typeof namaBarang !== 'string' || namaBarang.trim() === '') {
      return { status: 400, error: 'Nama barang is required and must be a non-empty string.' };
    }

    // If items were user-specific, add createdBy: userId to findById query
    const itemToUpdate = await Item.findById(id);
    if (!itemToUpdate) {
      return { status: 404, error: 'Item not found.' };
    }
    // Add check: if (itemToUpdate.createdBy.toString() !== userId) return { status: 403, error: 'Forbidden' };

    const existingItemWithNewName = await Item.findOne({ namaBarang: namaBarang.trim(), _id: { $ne: id } });
    if (existingItemWithNewName) {
      return { status: 409, error: 'Another item with this name already exists.' };
    }

    itemToUpdate.namaBarang = namaBarang.trim();
    await itemToUpdate.save();
    
    const updatedItem = await Item.findById(id); 

    return { status: 200, message: 'Item name updated successfully.', data: { item: updatedItem } };  } catch (error: unknown) {
    console.error(`Update item ${id} error:`, error);
    const err = error as { code?: number; message?: string };
    if (err instanceof mongoose.Error.ValidationError) {
      return { status: 400, error: err.message };
    }
    if (err.code === 11000) {
        return { status: 409, error: 'Item with this name already exists.' };
    }
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

const deleteItemHandler = async (
  req: NextRequest,
  context: RouteContext,
  _userId: string, 
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();
  const { id } = context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, error: 'Invalid item ID.' };
  }
  try {
    const relatedTransactions = await Transaction.findOne({ item: new mongoose.Types.ObjectId(id) });
    if (relatedTransactions) {
      return { 
        status: 400, 
        error: 'Cannot delete item. It has associated transactions. Consider deactivating it instead.' 
      };
    }    const deletedItem = await Item.findByIdAndDelete(id); // If items were user-specific, the query would include createdBy filter
    if (!deletedItem) {
      return { status: 404, error: 'Item not found to delete.' };
    }
    return { status: 200, message: 'Item deleted successfully.' };
  } catch (error) {
    console.error(`Delete item ${id} error:`, error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getSingleItemHandler);
export const PUT = withAuthStatic(updateItemNameHandler);
export const DELETE = withAuthStatic(deleteItemHandler);
