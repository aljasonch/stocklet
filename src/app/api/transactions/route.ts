import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction';
import { TransactionType } from '@/types/enums';
import Item from '@/models/Item';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';
import mongoose from 'mongoose'; 

const postHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const body = await req.json();
    const {
      tanggal,
      tipe,
      customer,
      noSJ,
      noInv,
      noPO,
      itemId,
      berat,
      harga,
      noSJSby,
    } = body;

    if (!tanggal || !tipe || !customer || !itemId || typeof berat === 'undefined' || typeof harga === 'undefined') {
      return { status: 400, error: 'Missing required fields (tanggal, tipe, customer, itemId, berat, harga).' };
    }

    if (!Object.values(TransactionType).includes(tipe as TransactionType)) {
        return { status: 400, error: 'Invalid transaction type.' };
    }

    if (typeof itemId === 'string' && !mongoose.Types.ObjectId.isValid(itemId)) {
      return { status: 400, error: 'Invalid item ID.' };
    }

    const session = await mongoose.startSession();
    let createdTransaction: ITransaction | null = null;

    try {
      await session.withTransaction(async () => {
        const itemObjectId = new mongoose.Types.ObjectId(itemId);
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const item = await Item.findById(itemObjectId).session(session);

        if (!item) {
          throw new Error('ITEM_NOT_FOUND');
        }

        const transactionDate = typeof tanggal === 'string' ? new Date(tanggal) : tanggal;
        const totalHarga = berat * harga;

        if (tipe === TransactionType.PENJUALAN) {
          const updatedItem = await Item.findOneAndUpdate(
            { _id: itemObjectId, stokSaatIni: { $gte: berat } },
            { $inc: { stokSaatIni: -berat } },
            { new: true, session }
          );

          if (!updatedItem) {
            throw new Error('INSUFFICIENT_STOCK');
          }

          createdTransaction = await new Transaction({
            tanggal: transactionDate,
            tipe,
            customer,
            noSJ,
            noInv,
            noPO,
            item: itemObjectId,
            namaBarangSnapshot: updatedItem.namaBarang,
            berat,
            harga,
            totalHarga,
            noSJSby,
            createdBy: userObjectId
          }).save({ session });
        } else {
          const updatedItem = await Item.findOneAndUpdate(
            { _id: itemObjectId },
            { $inc: { stokSaatIni: berat } },
            { new: true, session }
          );

          if (!updatedItem) {
            throw new Error('ITEM_NOT_FOUND');
          }

          createdTransaction = await new Transaction({
            tanggal: transactionDate,
            tipe,
            customer,
            noSJ,
            noInv,
            noPO,
            item: itemObjectId,
            namaBarangSnapshot: updatedItem.namaBarang,
            berat,
            harga,
            totalHarga,
            noSJSby,
            createdBy: userObjectId
          }).save({ session });
        }
      });
    } finally {
      session.endSession();
    }

    if (!createdTransaction) {
      return { status: 500, error: 'Failed to create transaction.' };
    }

    return {
      status: 201,
      message: 'Transaction created successfully.',
      data: { transaction: createdTransaction }
    };
  } catch (error: unknown) {
    console.error('Create transaction error:', error);
    if (error instanceof Error) {
      if (error.message === 'INSUFFICIENT_STOCK') {
        return { status: 400, error: 'Stok tidak mencukupi untuk barang yang dipilih.' };
      }
      if (error.message === 'ITEM_NOT_FOUND') {
        return { status: 404, error: 'Item not found.' };
      }
      if (error.name === 'ValidationError') {
        return { status: 400, error: error.message };
      }
    }
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

const getHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '8', 10);
    const skip = (page - 1) * limit;
    const tipe = searchParams.get('tipe') as TransactionType | null;

    const queryOptions: mongoose.FilterQuery<ITransaction> = { createdBy: userId };

    if (tipe && Object.values(TransactionType).includes(tipe)) {
      queryOptions.tipe = tipe;
    }

    const transactions = await Transaction.find(queryOptions)
      .sort({ tanggal: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalTransactions = await Transaction.countDocuments(queryOptions);
    const totalPages = Math.ceil(totalTransactions / limit);

    return {
      status: 200,
      data: {
        transactions,
        currentPage: page,
        totalPages,
        totalItems: totalTransactions
      }
    };
  } catch (error) {
    console.error('Get transactions error:', error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const POST = withAuthStatic(postHandler);
export const GET = withAuthStatic(getHandler);
