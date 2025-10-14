import mongoose, { Schema, Document, models, Model } from 'mongoose';
import { IUser } from './User'; 
import { IItem } from './Item'; 
import { TransactionType } from '@/types/enums'; 

export interface ITransaction extends Document {
  tanggal: Date;
  tipe: TransactionType;
  customer: string; 
  noSJ?: string; 
  noInv?: string; 
  noPO?: string;
  item: mongoose.Types.ObjectId | IItem; 
  namaBarangSnapshot: string; 
  berat: number;
  harga: number;
  totalHarga: number;
  noSJSby?: string;
  createdBy: mongoose.Types.ObjectId | IUser; 
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
  { timestamps: { createdAt: true, updatedAt: false } }
);

TransactionSchema.pre<ITransaction>('save', function (this: ITransaction, next: (error?: Error) => void) {
  if (this.isModified('berat') || this.isModified('harga')) {
    this.totalHarga = this.berat * this.harga;
  }
  next();
});

TransactionSchema.index({ item: 1 });
TransactionSchema.index({ 
  createdBy: 1, 
  tanggal: -1 
});

TransactionSchema.index({ customer: 1, createdBy: 1 });

TransactionSchema.index({
  tipe: 1,
  tanggal: -1
});

TransactionSchema.post<ITransaction>('save', async function (doc: ITransaction, next: (error?: Error) => void) { 
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error('An unknown error occurred in post-save hook'));
    }
  }
});


const Transaction: Model<ITransaction> =
  models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
