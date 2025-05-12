import { NextResponse } from 'next/server'; 
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils';

const postItemHandler: AuthenticatedApiHandler = async (req) => {
  await dbConnect();


  try {
    const { namaBarang, stokAwal } = await req.json();

    if (!namaBarang || typeof stokAwal === 'undefined') {
      return NextResponse.json(
        { message: 'Nama barang and stok awal are required.' },
        { status: 400 }
      );
    }

    if (typeof stokAwal !== 'number' || stokAwal < 0) {
        return NextResponse.json(
            { message: 'Stok awal must be a non-negative number.' },
            { status: 400 }
        );
    }

    const newItem = new Item({
      namaBarang,
      stokAwal,
    });

    await newItem.save();

    return NextResponse.json(
      { message: 'Item created successfully.', item: newItem },
      { status: 201 }
    );
  } catch (error: unknown) { // Changed any to unknown
    console.error('Create item error:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) { 
        return NextResponse.json(
            { message: 'Item with this name already exists.' },
            { status: 409 }
        );
    }
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

const getItemHandler: AuthenticatedApiHandler = async () => { // Removed req and userId
  await dbConnect();


  try {
    const items = await Item.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('Get items error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

export const POST = withAuth(postItemHandler);
export const GET = withAuth(getItemHandler);
