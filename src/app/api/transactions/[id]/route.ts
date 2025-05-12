import { NextResponse, NextRequest } from 'next/server'; 
import dbConnect from '@/lib/dbConnect';
import Transaction, { ITransaction } from '@/models/Transaction';
import Item, { IItem } from '@/models/Item';
import { TransactionType } from '@/types/enums';
import mongoose from 'mongoose';
import { getUserIdFromToken } from '@/lib/authUtils'; // Import getUserIdFromToken

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

const getSingleTransactionHandler = async (req: NextRequest, { params }: { params: { id: string } }) => { // Revert type
  // --- Add Auth Check ---
  const userId = getUserIdFromToken(req);
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  // --- End Auth Check ---

  await dbConnect();
  const id = params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid transaction ID.' }, { status: 400 });
  }

  try {
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

const updateTransactionHandler = async (req: NextRequest, { params }: { params: { id: string } }) => { // Revert type
  // --- Add Auth Check ---
  const userId = getUserIdFromToken(req);
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  // --- End Auth Check ---

  await dbConnect();
  const id = params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid transaction ID.' }, { status: 400 });
  }

  try {
    const body: UpdateTransactionRequestBody = await req.json(); // Use the defined interface
    const {
      tanggal, tipe, customer, noSJ, noInv, noPO, itemId,
      berat, harga, noSJSby,
    } = body;
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
    
    const oldItemDoc = await Item.findById(oldTransaction.item as mongoose.Types.ObjectId);
    
    const currentTargetItem = item as IItem; 

    if (oldItemDoc) {
      const oldItem = oldItemDoc as IItem; 
      if (oldTransaction.tipe === TransactionType.PENJUALAN) {
        oldItem.stokSaatIni += oldTransaction.berat;
      } else if (oldTransaction.tipe === TransactionType.PEMBELIAN) {
        oldItem.stokSaatIni -= oldTransaction.berat;
      }
      
      if (!(oldItem._id as mongoose.Types.ObjectId).equals(currentTargetItem._id as mongoose.Types.ObjectId)) { 
        await oldItem.save();
      }
    }
    
    const stockChangeForNewItem = tipe === TransactionType.PENJUALAN ? -berat : berat;

    if (tipe === TransactionType.PENJUALAN) {
        let stockAvailableForSale = currentTargetItem.stokSaatIni;
        if (oldItemDoc && (oldItemDoc._id as mongoose.Types.ObjectId).equals(currentTargetItem._id as mongoose.Types.ObjectId)) {
            stockAvailableForSale = (oldItemDoc as IItem).stokSaatIni; 
        }

        if (stockAvailableForSale < berat) {
            return NextResponse.json(
                { message: `Stok tidak mencukupi untuk ${currentTargetItem.namaBarang}. Stok tersedia: ${stockAvailableForSale} kg.` },
                { status: 400 }
            );
        }
    }
    
    // Cast _id to ObjectId before comparison
    if (oldItemDoc && (oldItemDoc._id as mongoose.Types.ObjectId).equals(currentTargetItem._id as mongoose.Types.ObjectId)) {
        (oldItemDoc as IItem).stokSaatIni += stockChangeForNewItem;
        await (oldItemDoc as IItem).save();
    } else {
        currentTargetItem.stokSaatIni += stockChangeForNewItem;
        await currentTargetItem.save();
    }

    // Ensure tanggal is Date and itemId is ObjectId
    const finalItemId = typeof itemId === 'string' ? new mongoose.Types.ObjectId(itemId) : itemId;
    const finalTanggal = typeof tanggal === 'string' ? new Date(tanggal) : tanggal;

    const updatedTransactionData: Partial<ITransaction> = {
      tanggal: finalTanggal, // Use converted Date
      tipe, customer, noSJ, noInv, noPO,
      item: finalItemId, // Use converted ObjectId
      namaBarangSnapshot: item.namaBarang,
      berat, harga, 
      totalHarga: berat * harga, 
      noSJSby,
    };

    const updatedTransaction = await Transaction.findByIdAndUpdate(id, updatedTransactionData, { new: true });

    return NextResponse.json({ message: 'Transaction updated successfully.', transaction: updatedTransaction }, { status: 200 });

  } catch (error: unknown) { 
    console.error(`Update transaction ${id} error:`, error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}

const deleteTransactionHandler = async (req: NextRequest, { params }: { params: { id: string } }) => { // Revert type
  // --- Add Auth Check ---
  const userId = getUserIdFromToken(req);
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  // --- End Auth Check ---

  await dbConnect();
  const id = params.id;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid transaction ID.' }, { status: 400 });
  }
  
  try {
    const transactionToDelete = await Transaction.findById(id);
    if (!transactionToDelete) {
      return NextResponse.json({ message: 'Transaction not found to delete.' }, { status: 404 });
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

    await Transaction.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Transaction deleted successfully.' }, { status: 200 });

  } catch (error: unknown) {
    console.error(`Delete transaction ${id} error:`, error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
};

export const GET = getSingleTransactionHandler; // Remove withAuth wrapper and explicit type
export const PUT = updateTransactionHandler; // Remove withAuth wrapper and explicit type
export const DELETE = deleteTransactionHandler; // Remove withAuth wrapper and explicit type
