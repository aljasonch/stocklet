import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction';
import Item, { IItem } from '@/models/Item';
import { TransactionType } from '@/types/enums';
import mongoose from 'mongoose';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';

interface RouteContext {
  params: { id: string };
}

interface UpdateTransactionRequestBody {
  tanggal: string | Date;
  tipe: TransactionType;
  customer: string;
  noSJ?: string;
  noInv?: string;
  noPO?: string;
  itemId: string | mongoose.Types.ObjectId;
  berat: number;
  harga: number;
  noSJSby?: string;
}

const getSingleTransactionHandler = async (
  req: NextRequest,
  context: RouteContext,
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();
  const id = context.params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, error: 'Invalid transaction ID.' };
  }

  try {
    const transaction = await Transaction.findOne({ _id: id, createdBy: new mongoose.Types.ObjectId(userId) })
      .populate<{item: IItem}>('item', 'namaBarang stokSaatIni'); 
    
    if (!transaction) {
      return { status: 404, error: 'Transaction not found or not owned by user.' };
    }
    return { status: 200, data: { transaction } };
  } catch (error) {
    console.error(`Get transaction ${id} error:`, error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

const updateTransactionHandler = async (
  req: NextRequest,
  context: RouteContext,
  userId: string,
  _userEmail: string, 
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();
  const transactionId = context.params.id;

  if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
    return { status: 400, error: 'Invalid transaction ID.' };
  }

  try {
    const body: UpdateTransactionRequestBody = await req.json();
    const { tanggal, tipe, customer, noSJ, noInv, noPO, itemId, berat, harga, noSJSby } = body;

    if (!tanggal || !tipe || !customer || !itemId || typeof berat === 'undefined' || typeof harga === 'undefined') {
      return { status: 400, error: 'Missing required fields.' };
    }
    if (!Object.values(TransactionType).includes(tipe as TransactionType)) {
        return { status: 400, error: 'Invalid transaction type.' };
    }
    if (typeof itemId === 'string' && !mongoose.Types.ObjectId.isValid(itemId)) {
      return { status: 400, error: 'Invalid item ID.' };
    }

    const session = await mongoose.startSession();
    let updatedTransaction: ITransaction | null = null;

    try {
      await session.withTransaction(async () => {
        const transactionObjectId = new mongoose.Types.ObjectId(transactionId);
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const newItemObjectId = typeof itemId === 'string' ? new mongoose.Types.ObjectId(itemId) : (itemId as mongoose.Types.ObjectId);

        const existingTransaction = await Transaction.findOne({ _id: transactionObjectId, createdBy: userObjectId })
          .session(session);

        if (!existingTransaction) {
          throw new Error('TRANSACTION_NOT_FOUND');
        }

        const originalItemId = existingTransaction.item as mongoose.Types.ObjectId;
        const revertDelta = existingTransaction.tipe === TransactionType.PENJUALAN
          ? existingTransaction.berat
          : -existingTransaction.berat;

        const revertedItem = await Item.findOneAndUpdate(
          { _id: originalItemId },
          { $inc: { stokSaatIni: revertDelta } },
          { new: true, session }
        );

        if (!revertedItem) {
          throw new Error('ITEM_NOT_FOUND');
        }

        const transactionDate = typeof tanggal === 'string' ? new Date(tanggal) : tanggal;

        let targetItemSnapshotName: string;

        if (tipe === TransactionType.PENJUALAN) {
          const targetItem = await Item.findOneAndUpdate(
            { _id: newItemObjectId, stokSaatIni: { $gte: berat } },
            { $inc: { stokSaatIni: -berat } },
            { new: true, session }
          );

          if (!targetItem) {
            throw new Error('INSUFFICIENT_STOCK');
          }

          targetItemSnapshotName = targetItem.namaBarang;
        } else {
          const targetItem = await Item.findOneAndUpdate(
            { _id: newItemObjectId },
            { $inc: { stokSaatIni: berat } },
            { new: true, session }
          );

          if (!targetItem) {
            throw new Error('ITEM_NOT_FOUND');
          }

          targetItemSnapshotName = targetItem.namaBarang;
        }

        existingTransaction.tanggal = transactionDate;
        existingTransaction.tipe = tipe;
        existingTransaction.customer = customer;
        existingTransaction.noSJ = noSJ;
        existingTransaction.noInv = noInv;
        existingTransaction.noPO = noPO;
        existingTransaction.item = newItemObjectId;
        existingTransaction.namaBarangSnapshot = targetItemSnapshotName;
        existingTransaction.berat = berat;
        existingTransaction.harga = harga;
        existingTransaction.totalHarga = berat * harga;
        existingTransaction.noSJSby = noSJSby;

        updatedTransaction = await existingTransaction.save({ session });
      });
    } finally {
      session.endSession();
    }

    if (!updatedTransaction) {
      return { status: 404, error: 'Transaction not found or not owned by user.' };
    }

    return { status: 200, message: 'Transaction updated successfully.', data: { transaction: updatedTransaction } };

  } catch (error: unknown) {
    console.error(`Update transaction ${transactionId} error:`, error);
    if (error instanceof Error) {
      if (error.message === 'TRANSACTION_NOT_FOUND') {
        return { status: 404, error: 'Transaction not found or not owned by user.' };
      }
      if (error.message === 'INSUFFICIENT_STOCK') {
        return { status: 400, error: 'Stok tidak mencukupi untuk barang yang dipilih.' };
      }
      if (error.message === 'ITEM_NOT_FOUND') {
        return { status: 404, error: 'Item not found for transaction update.' };
      }
      if (error instanceof mongoose.Error.ValidationError) {
        return { status: 400, error: error.message };
      }
    }
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

const deleteTransactionHandler = async (
  req: NextRequest,
  context: RouteContext,
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();
  const transactionId = context.params.id;

  if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
    return { status: 400, error: 'Invalid transaction ID.' };
  }
  
  try {
    const session = await mongoose.startSession();
    let deleted = false;

    try {
      await session.withTransaction(async () => {
        const transactionObjectId = new mongoose.Types.ObjectId(transactionId);
        const deletedTransaction = await Transaction.findOneAndDelete(
          { _id: transactionObjectId, createdBy: new mongoose.Types.ObjectId(userId) },
          { session }
        );

        if (!deletedTransaction) {
          throw new Error('TRANSACTION_NOT_FOUND');
        }

        const adjustment = deletedTransaction.tipe === TransactionType.PENJUALAN
          ? deletedTransaction.berat
          : -deletedTransaction.berat;

        const item = await Item.findOneAndUpdate(
          { _id: deletedTransaction.item as mongoose.Types.ObjectId },
          { $inc: { stokSaatIni: adjustment } },
          { session }
        );

        if (!item) {
          throw new Error('ITEM_NOT_FOUND');
        }

        deleted = true;
      });
    } finally {
      session.endSession();
    }

    if (!deleted) {
      return { status: 404, error: 'Transaction not found or not owned by user.' };
    }

    return { status: 200, message: 'Transaction deleted successfully.' };
  } catch (error: unknown) {
    console.error(`Delete transaction ${transactionId} error:`, error);
    if (error instanceof Error) {
      if (error.message === 'TRANSACTION_NOT_FOUND') {
        return { status: 404, error: 'Transaction not found or not owned by user.' };
      }
      if (error.message === 'ITEM_NOT_FOUND') {
        return { status: 404, error: 'Associated item not found for transaction.' };
      }
    }
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getSingleTransactionHandler);
export const PUT = withAuthStatic(updateTransactionHandler);
export const DELETE = withAuthStatic(deleteTransactionHandler);
