import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item, { IItem } from '@/models/Item'; // Added IItem
import Transaction from '@/models/Transaction'; // Added Transaction
import { TransactionType } from '@/types/enums'; // Added TransactionType
import { withAuthStatic, getUserIdFromToken } from '@/lib/authUtils'; // Import getUserIdFromToken
import mongoose, { PipelineStage, SortOrder } from 'mongoose'; // Added mongoose for ObjectId, PipelineStage, SortOrder

const postItemHandler = async (req: NextRequest) => {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getItemHandler = async (req: NextRequest) => {
  await dbConnect();

  try {
    const userId = getUserIdFromToken(req); // Assuming items might become user-specific in future or for consistency
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Base match query - if items were user-specific, it would include: createdBy: new mongoose.Types.ObjectId(userId)
    // For now, items are global as per previous analysis.
    const baseMatchQuery = {}; // If items were user-specific: { createdBy: new mongoose.Types.ObjectId(userId) };

    const itemsPipeline: PipelineStage[] = [ // Explicitly type pipeline stages
      { $match: baseMatchQuery },
      { $sort: { createdAt: -1 } }, // Use -1 directly
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: Transaction.collection.name,
          let: { itemId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$item', '$$itemId'] }
              }
            },
            {
              $group: {
                _id: '$tipe',
                totalBerat: { $sum: '$berat' }
              }
            }
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
              in: {
                $cond: [
                  { $eq: ['$$this._id', TransactionType.PEMBELIAN] },
                  { $add: ['$$value', '$$this.totalBerat'] },
                  '$$value'
                ]
              }
            }
          },
          totalKeluar: {
            $reduce: {
              input: '$transactionAggregates',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this._id', TransactionType.PENJUALAN] },
                  { $add: ['$$value', '$$this.totalBerat'] },
                  '$$value'
                ]
              }
            }
          }
        }
      },
      {
        $project: { // Ensure all original IItem fields are returned, plus new ones
          namaBarang: 1,
          stokAwal: 1,
          stokSaatIni: 1,
          createdAt: 1,
          updatedAt: 1,
          totalMasuk: 1,
          totalKeluar: 1
          // transactionAggregates can be removed if not needed directly in response
        }
      }
    ];

    const itemsWithAggregates = await Item.aggregate(itemsPipeline);

    // Get total count for pagination
    const totalItemsResult = await Item.aggregate([
      { $match: baseMatchQuery },
      { $count: 'totalItems' }
    ]);
    const totalItems = totalItemsResult.length > 0 ? totalItemsResult[0].totalItems : 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      items: itemsWithAggregates as IItem[],
      currentPage: page,
      totalPages,
      totalItems
    }, { status: 200 });
  } catch (error) {
    console.error('Get items error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
};

export const POST = withAuthStatic(postItemHandler);
export const GET = withAuthStatic(getItemHandler);
