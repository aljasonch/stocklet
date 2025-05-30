import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item, { IItem } from '@/models/Item';
import Transaction from '@/models/Transaction';
import { TransactionType } from '@/types/enums';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';
import mongoose, { PipelineStage } from 'mongoose';

const postItemHandler = async (
  req: NextRequest,
  _context: { params: Record<string, never> }, // Add context
  _userId: string, // Add userId
  _userEmail: string, // Add userEmail
  _jti: string // Add jti
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const { namaBarang, stokAwal } = await req.json();

    if (!namaBarang || typeof stokAwal === 'undefined') {
      return { status: 400, error: 'Nama barang and stok awal are required.' };
    }

    if (typeof stokAwal !== 'number' || stokAwal < 0) {
      return { status: 400, error: 'Stok awal must be a non-negative number.' };
    }

    const newItem = new Item({
      namaBarang,
      stokAwal,
    });

    await newItem.save();

    return { 
      status: 201, 
      message: 'Item created successfully.', 
      data: { item: newItem } 
    };  } catch (error: unknown) {
    console.error('Create item error:', error);
    const err = error as { code?: number; message?: string }; 
    if (err.code === 11000) { 
      return { status: 409, error: 'Item with this name already exists.' };
    }
    if (err instanceof mongoose.Error.ValidationError) { 
      return { status: 400, error: err.message };
    }
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

const getItemHandler = async (
  req: NextRequest,
  _context: { params: Record<string, never> },
  _userId: string,
  _userEmail: string, 
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const searchQuery = searchParams.get('search') || '';
    const fetchAll = searchParams.get('fetchAll') === 'true'; // New parameter to fetch all items
    
    const baseMatchQuery: mongoose.FilterQuery<IItem> = {};
    if (searchQuery) {
      baseMatchQuery.namaBarang = { $regex: searchQuery, $options: 'i' }; 
    }

    const itemsPipeline: PipelineStage[] = [ 
      { $match: baseMatchQuery },
      { $sort: { createdAt: -1 } },
      // Only apply pagination if not fetching all
      ...(fetchAll ? [] : [
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ]),
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
        $project: {
          namaBarang: 1,
          stokAwal: 1,
          stokSaatIni: 1,
          createdAt: 1,
          updatedAt: 1,
          totalMasuk: 1,
          totalKeluar: 1
        }
      }
    ];    
    const itemsWithAggregates = await Item.aggregate(itemsPipeline);
    if (fetchAll) {
      return {
        status: 200,
        data: {
          items: itemsWithAggregates as IItem[],
          totalItems: itemsWithAggregates.length
        }
      };
    }

    const totalItemsResult = await Item.aggregate([
      { $match: baseMatchQuery },
      { $count: 'totalItems' }
    ]);
    const totalItems = totalItemsResult.length > 0 ? totalItemsResult[0].totalItems : 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      status: 200,
      data: {
        items: itemsWithAggregates as IItem[],
        currentPage: page,
        totalPages,
        totalItems
      }
    };
  } catch (error) {
    console.error('Get items error:', error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const POST = withAuthStatic(postItemHandler);
export const GET = withAuthStatic(getItemHandler);
