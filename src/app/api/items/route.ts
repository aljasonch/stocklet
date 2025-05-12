import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item, { IItem } from '@/models/Item';
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils'; // Import withAuth

const postItemHandler: AuthenticatedApiHandler = async (req, { userId }) => {
  await dbConnect();

  // userId is available from withAuth HOC if needed for logging or ownership
  // For now, item creation is not tied to a specific user in the model

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

    // stokSaatIni will be set by the pre-save hook in Item model
    const newItem = new Item({
      namaBarang,
      stokAwal,
      // stokSaatIni is handled by pre-save hook if stokAwal is provided
    });

    await newItem.save();

    return NextResponse.json(
      { message: 'Item created successfully.', item: newItem },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create item error:', error);
    if (error.code === 11000) { // Duplicate key error (e.g. unique namaBarang)
        return NextResponse.json(
            { message: 'Item with this name already exists.' },
            { status: 409 }
        );
    }
    if (error.name === 'ValidationError') {
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

const getItemHandler: AuthenticatedApiHandler = async (req, { userId }) => {
  await dbConnect();

  // userId is available if needed

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
