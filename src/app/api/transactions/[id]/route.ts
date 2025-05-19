import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
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

    const oldTransaction = await Transaction.findOne({ _id: transactionId, createdBy: new mongoose.Types.ObjectId(userId) });
    if (!oldTransaction) {
      return { status: 404, error: 'Transaction not found or not owned by user.' };
    }

    const newItemDoc = await Item.findById(itemId);
    if (!newItemDoc) {
      return { status: 404, error: 'Item not found for transaction update.' };
    }
    const currentTargetItem = newItemDoc as IItem;

    const originalItemDoc = await Item.findById(oldTransaction.item as mongoose.Types.ObjectId);
    if (originalItemDoc) {
      if (oldTransaction.tipe === TransactionType.PENJUALAN) {
        originalItemDoc.stokSaatIni += oldTransaction.berat;
      } else if (oldTransaction.tipe === TransactionType.PEMBELIAN) {
        originalItemDoc.stokSaatIni -= oldTransaction.berat;
      }
      await originalItemDoc.save();
    }

    if (tipe === TransactionType.PENJUALAN) {
      const originalItemId = originalItemDoc?._id as mongoose.Types.ObjectId | undefined;
      const currentTargetItemId = currentTargetItem._id as mongoose.Types.ObjectId;

      if (currentTargetItem.stokSaatIni < berat && !(originalItemId && originalItemId.equals(currentTargetItemId) && (originalItemDoc!.stokSaatIni + oldTransaction.berat) >= berat) ) {
        if (originalItemDoc && originalItemId && !originalItemId.equals(currentTargetItemId)) { 
        } else if (originalItemDoc) {
            if (oldTransaction.tipe === TransactionType.PENJUALAN) originalItemDoc.stokSaatIni -= oldTransaction.berat;
            else if (oldTransaction.tipe === TransactionType.PEMBELIAN) originalItemDoc.stokSaatIni += oldTransaction.berat;
            await originalItemDoc.save();
        }
        return { status: 400, error: `Stok tidak mencukupi untuk ${currentTargetItem.namaBarang}.` };
      }
      currentTargetItem.stokSaatIni -= berat;
    } else if (tipe === TransactionType.PEMBELIAN) {
      currentTargetItem.stokSaatIni += berat;
    }
    await currentTargetItem.save();
    
    oldTransaction.tanggal = typeof tanggal === 'string' ? new Date(tanggal) : tanggal;
    oldTransaction.tipe = tipe;
    oldTransaction.customer = customer;
    oldTransaction.noSJ = noSJ;
    oldTransaction.noInv = noInv;
    oldTransaction.noPO = noPO;
    oldTransaction.item = typeof itemId === 'string' ? new mongoose.Types.ObjectId(itemId) : itemId;
    oldTransaction.namaBarangSnapshot = currentTargetItem.namaBarang;
    oldTransaction.berat = berat;
    oldTransaction.harga = harga;
    oldTransaction.totalHarga = berat * harga;
    oldTransaction.noSJSby = noSJSby;

    const updatedTransaction = await oldTransaction.save();

    return { status: 200, message: 'Transaction updated successfully.', data: { transaction: updatedTransaction }};

  } catch (error: unknown) {
    console.error(`Update transaction ${transactionId} error:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
      return { status: 400, error: error.message };
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
    const transactionToDelete = await Transaction.findOneAndDelete({ _id: transactionId, createdBy: new mongoose.Types.ObjectId(userId) });

    if (!transactionToDelete) {
      return { status: 404, error: 'Transaction not found or not owned by user.' };
    }

    const item = await Item.findById(transactionToDelete.item);
    if (item) {
      if (transactionToDelete.tipe === TransactionType.PENJUALAN) {
        item.stokSaatIni += transactionToDelete.berat;
      } else if (transactionToDelete.tipe === TransactionType.PEMBELIAN) {
        item.stokSaatIni -= transactionToDelete.berat;
      }
      await item.save();
    }

    return { status: 200, message: 'Transaction deleted successfully.' };
  } catch (error: unknown) {
    console.error(`Delete transaction ${transactionId} error:`, error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getSingleTransactionHandler);
export const PUT = withAuthStatic(updateTransactionHandler);
export const DELETE = withAuthStatic(deleteTransactionHandler);
