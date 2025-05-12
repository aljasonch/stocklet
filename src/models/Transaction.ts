import mongoose, { Schema, Document, models, Model } from 'mongoose';
import { IUser } from './User'; 
import { IItem } from './Item'; 
import { TransactionType } from '@/types/enums'; // Updated import path

export interface ITransaction extends Document {
  tanggal: Date;
  tipe: TransactionType;
  customer: string; // or supplier
  noSJ?: string; // Nomor Surat Jalan
  noInv?: string; // Nomor Invoice
  noPO?: string;
  item: mongoose.Types.ObjectId | IItem; // Reference to Item
  namaBarangSnapshot: string; // To store item name at the time of transaction
  berat: number; // kg
  harga: number; // price per kg
  totalHarga: number;
  noSJSby?: string;
  createdBy: mongoose.Types.ObjectId | IUser; // Reference to User
  createdAt: Date;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    tanggal: {
      type: Date,
      required: [true, 'Tanggal is required.'],
      default: Date.now,
    },
    tipe: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, 'Tipe transaksi is required.'],
    },
    customer: {
      // Can be customer for PENJUALAN or supplier for PEMBELIAN
      type: String,
      trim: true,
      required: [true, 'Customer/Supplier is required.'],
    },
    noSJ: {
      type: String,
      trim: true,
    },
    noInv: {
      type: String,
      trim: true,
    },
    noPO: {
      type: String,
      trim: true,
    },
    item: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item is required.'],
    },
    namaBarangSnapshot: {
      type: String,
      required: [true, 'Nama barang snapshot is required.']
    },
    berat: {
      type: Number,
      required: [true, 'Berat is required.'],
      min: [0.01, 'Berat must be greater than 0.'],
    },
    harga: {
      type: Number,
      required: [true, 'Harga is required.'],
      min: [0, 'Harga cannot be negative.'],
    },
    totalHarga: {
      type: Number,
      required: [true, 'Total harga is required.'],
    },
    noSJSby: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required.'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // Only createdAt, no updatedAt for transactions
);

// Middleware to calculate totalHarga before saving
TransactionSchema.pre<ITransaction>('save', function (this: ITransaction, next: (error?: any) => void) {
  if (this.isModified('berat') || this.isModified('harga')) {
    this.totalHarga = this.berat * this.harga;
  }
  next();
});

// Middleware to update stock after a transaction is saved
TransactionSchema.post<ITransaction>('save', async function (doc: ITransaction, next: (error?: any) => void) {
  try {
    const item = await mongoose.model<IItem>('Item').findById(doc.item);
    if (item) {
      if (doc.tipe === TransactionType.PENJUALAN) {
        item.stokSaatIni -= doc.berat;
      } else if (doc.tipe === TransactionType.PEMBELIAN) {
        item.stokSaatIni += doc.berat;
      }
      await item.save();
    }
    next();
  } catch (error: any) {
    next(error);
  }
});


const Transaction: Model<ITransaction> =
  models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
