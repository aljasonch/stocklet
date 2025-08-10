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

    const item = await Item.findById(itemId);
    if (!item) {
      return { status: 404, error: 'Item not found.' };
    }

    if (tipe === TransactionType.PENJUALAN && item.stokSaatIni < berat) {
      return {
        status: 400,
        error: `Stok tidak mencukupi untuk ${item.namaBarang}. Stok saat ini: ${item.stokSaatIni.toFixed(2)} kg.`
      };
    }

    if (tipe === TransactionType.PENJUALAN) {
      item.stokSaatIni -= berat;
    } else if (tipe === TransactionType.PEMBELIAN) {
      item.stokSaatIni += berat;
    }
    await item.save();

    const totalHarga = berat * harga;

    const newTransaction = new Transaction({
      tanggal,
      tipe,
      customer,
      noSJ,
      noInv,
      noPO,
      item: itemId,
      namaBarangSnapshot: item.namaBarang,
      berat,
      harga,
      totalHarga,
      noSJSby,
      createdBy: userId
    });

    await newTransaction.save();

    return { 
      status: 201, 
      message: 'Transaction created successfully.', 
      data: { transaction: newTransaction } 
    };
  } catch (error: unknown) {
    console.error('Create transaction error:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return { status: 400, error: error.message };
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
      .sort({ tanggal: 1, _id: 1 })
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
