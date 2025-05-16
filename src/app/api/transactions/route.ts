import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction'; // Import ITransaction
import { TransactionType } from '@/types/enums';
import Item, { IItem } from '@/models/Item';
import { IUser } from '@/models/User';
import { withAuthStatic, getUserIdFromToken } from '@/lib/authUtils';
import mongoose from 'mongoose'; // Import mongoose

const postHandler = async (req: NextRequest) => {
  await dbConnect();

  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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

    // Basic validation
    if (!tanggal || !tipe || !customer || !itemId || typeof berat === 'undefined' || typeof harga === 'undefined') {
      return NextResponse.json({ message: 'Missing required fields (tanggal, tipe, customer, itemId, berat, harga).' }, { status: 400 });
    }

    if (!Object.values(TransactionType).includes(tipe as TransactionType)) {
        return NextResponse.json({ message: 'Invalid transaction type.' }, { status: 400 });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return NextResponse.json({ message: 'Item not found.' }, { status: 404 });
    }

    if (tipe === TransactionType.PENJUALAN && item.stokSaatIni < berat) {
      return NextResponse.json(
        { message: `Stok tidak mencukupi untuk ${item.namaBarang}. Stok saat ini: ${item.stokSaatIni} kg.` },
        { status: 400 }
      );
    }

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

    return NextResponse.json(
      { message: 'Transaction created successfully.', transaction: newTransaction },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Create transaction error:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getHandler = async (req: NextRequest) => {
  await dbConnect();

  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
    const tipe = searchParams.get('tipe') as TransactionType | null;

    // Base query includes user filtering
    const queryOptions: mongoose.FilterQuery<ITransaction> = { createdBy: userId };

    if (tipe && Object.values(TransactionType).includes(tipe)) {
      queryOptions.tipe = tipe;
    }

    const transactions = await Transaction.find(queryOptions)
      .populate<{item: IItem}>('item', 'namaBarang')
      .sort({ tanggal: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTransactions = await Transaction.countDocuments(queryOptions);
    const totalPages = Math.ceil(totalTransactions / limit);

    return NextResponse.json({
      transactions,
      currentPage: page,
      totalPages,
      totalItems: totalTransactions
    }, { status: 200 });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

export const POST = withAuthStatic(postHandler);
export const GET = withAuthStatic(getHandler);
