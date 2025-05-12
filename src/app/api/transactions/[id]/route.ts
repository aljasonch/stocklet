import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction';
import Item, { IItem } from '@/models/Item';
import User, { IUser } from '@/models/User'; // Ensure User model is registered and IUser is imported
import { TransactionType } from '@/types/enums';
import mongoose from 'mongoose';
import { withAuth, AuthenticatedApiHandler } from '@/lib/authUtils';

interface Params {
  id: string;
}

const getSingleTransactionHandler: AuthenticatedApiHandler = async (req, { params, userId }) => {
  await dbConnect();
  const id = params?.id; // id from context.params

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid transaction ID.' }, { status: 400 });
  }

  try {
    // Optionally, check if transaction belongs to userId if transactions are user-specific
    const transaction = await Transaction.findById(id).populate<{item: IItem}>('item', 'namaBarang');
    if (!transaction) {
      return NextResponse.json({ message: 'Transaction not found.' }, { status: 404 });
    }
    return NextResponse.json({ transaction }, { status: 200 });
  } catch (error) {
    console.error(`Get transaction ${id} error:`, error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

const updateTransactionHandler: AuthenticatedApiHandler = async (req, { params, userId }) => {
  await dbConnect();
  const id = params?.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid transaction ID.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      tanggal, tipe, customer, noSJ, noInv, noPO, itemId, // Changed noSJInv to noSJ, noInv
      berat, harga, noSJSby,
    } = body;

    // Basic validation
    if (!tanggal || !tipe || !customer || !itemId || typeof berat === 'undefined' || typeof harga === 'undefined') {
      return NextResponse.json({ message: 'Missing required fields (tanggal, tipe, customer, itemId, berat, harga).' }, { status: 400 });
    }
    if (!Object.values(TransactionType).includes(tipe as TransactionType)) {
        return NextResponse.json({ message: 'Invalid transaction type.' }, { status: 400 });
    }

    const oldTransaction = await Transaction.findById(id);
    if (!oldTransaction) {
      return NextResponse.json({ message: 'Transaction not found to update.' }, { status: 404 });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return NextResponse.json({ message: 'Item not found.' }, { status: 404 });
    }
    
    // --- Stock adjustment logic ---
    // Revert old stock change
    const oldItemDoc = await Item.findById(oldTransaction.item as mongoose.Types.ObjectId); // Ensure oldTransaction.item is treated as ID
    
    // item is already confirmed not null here, so it's IItem
    const currentTargetItem = item as IItem; 

    if (oldItemDoc) {
      const oldItem = oldItemDoc as IItem; 
      if (oldTransaction.tipe === TransactionType.PENJUALAN) {
        oldItem.stokSaatIni += oldTransaction.berat;
      } else if (oldTransaction.tipe === TransactionType.PEMBELIAN) {
        oldItem.stokSaatIni -= oldTransaction.berat;
      }
      
      // If item ID changed during the update, save the stock adjustment for the old item.
      if (!(oldItem as any)._id.equals((currentTargetItem as any)._id)) { 
        await oldItem.save();
      }
    }
    
    const stockChangeForNewItem = tipe === TransactionType.PENJUALAN ? -berat : berat;

    if (tipe === TransactionType.PENJUALAN) {
        let stockAvailableForSale = currentTargetItem.stokSaatIni;
        // If the transaction is for the same item as before,
        // its stock (currentTargetItem.stokSaatIni) might not yet reflect the revert from oldItemDoc.
        // So, if oldItemDoc exists and is the same as currentTargetItem, use oldItemDoc's stock which includes the revert.
        if (oldItemDoc && (oldItemDoc as any)._id.equals((currentTargetItem as any)._id)) {
            stockAvailableForSale = (oldItemDoc as IItem).stokSaatIni; 
        }

        if (stockAvailableForSale < berat) {
            return NextResponse.json(
                { message: `Stok tidak mencukupi untuk ${currentTargetItem.namaBarang}. Stok tersedia: ${stockAvailableForSale} kg.` },
                { status: 400 }
            );
        }
    }
    
    // Apply the new stock change
    if (oldItemDoc && (oldItemDoc as any)._id.equals((currentTargetItem as any)._id)) {
        // If it's the same item, oldItemDoc's stock was reverted. Now apply the new transaction's effect.
        (oldItemDoc as IItem).stokSaatIni += stockChangeForNewItem;
        await (oldItemDoc as IItem).save();
    } else {
        // If it's a new item (or oldItemDoc was null), apply the change to currentTargetItem.
        // If oldItemDoc was different, its stock was already saved.
        currentTargetItem.stokSaatIni += stockChangeForNewItem;
        await currentTargetItem.save();
    }
    // --- End of stock adjustment ---

    const updatedTransactionData: Partial<ITransaction> = {
      tanggal, tipe, customer, noSJ, noInv, noPO, // Changed
      item: itemId, 
      namaBarangSnapshot: item.namaBarang,
      berat, harga, 
      totalHarga: berat * harga, 
      noSJSby,
      // createdBy: userId, // Or keep original createdBy, depending on business logic
    };

    const updatedTransaction = await Transaction.findByIdAndUpdate(id, updatedTransactionData, { new: true });

    return NextResponse.json({ message: 'Transaction updated successfully.', transaction: updatedTransaction }, { status: 200 });

  } catch (error: any) {
    console.error(`Update transaction ${id} error:`, error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}

// DELETE a transaction
const deleteTransactionHandler: AuthenticatedApiHandler = async (req, { params, userId }) => {
  await dbConnect();
  const id = params?.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid transaction ID.' }, { status: 400 });
  }
  
  try {
    // Optionally, check if transaction belongs to userId or if user has permission
    const transactionToDelete = await Transaction.findById(id);
    if (!transactionToDelete) {
      return NextResponse.json({ message: 'Transaction not found to delete.' }, { status: 404 });
    }

    // Revert stock change before deleting transaction
    const item = await Item.findById(transactionToDelete.item);
    if (item) {
      if (transactionToDelete.tipe === TransactionType.PENJUALAN) {
        item.stokSaatIni += transactionToDelete.berat;
      } else if (transactionToDelete.tipe === TransactionType.PEMBELIAN) {
        item.stokSaatIni -= transactionToDelete.berat;
      }
      await item.save();
    }

    await Transaction.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Transaction deleted successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error(`Delete transaction ${id} error:`, error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

export const GET = withAuth(getSingleTransactionHandler);
export const PUT = withAuth(updateTransactionHandler);
export const DELETE = withAuth(deleteTransactionHandler);
