import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction';
import { TransactionType } from '@/types/enums';
import Item, { IItem } from '@/models/Item';
import User, { IUser } from '@/models/User'; // Import IUser along with User model
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils';

const postHandler: AuthenticatedApiHandler = async (req, { userId }) => {
  await dbConnect();

  try {
    const body = await req.json();
    const {
      tanggal,
      tipe,
      customer,
      noSJ, // Changed from noSJInv
      noInv, // New field
      noPO,
      itemId, // Expecting itemId from client
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
      noSJ, // Changed
      noInv, // New
      noPO,
      item: itemId,
      namaBarangSnapshot: item.namaBarang, // Store current item name
      berat,
      harga,
      totalHarga, 
      noSJSby,
      createdBy: userId, // Use actual userId from token
    });

    await newTransaction.save();

    return NextResponse.json(
      { message: 'Transaction created successfully.', transaction: newTransaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create transaction error:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

const getHandler: AuthenticatedApiHandler = async (req, { userId }) => {
  await dbConnect();

  try {
    // Optionally filter transactions by userId if needed, e.g., if transactions are user-specific
    // For now, fetching all transactions, assuming admin/shared view
    const transactions = await Transaction.find({}) 
      .populate<{item: IItem}>('item', 'namaBarang')
      .populate<{createdBy: IUser}>('createdBy', 'email') // Use IUser interface for type
      .sort({ tanggal: -1, createdAt: -1 }); 

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

export const POST = withAuth(postHandler);
export const GET = withAuth(getHandler);
