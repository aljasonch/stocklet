import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IItem extends Document {
  _id: mongoose.Types.ObjectId;
  namaBarang: string;
  stokAwal: number;
  stokSaatIni: number;
  createdAt: Date;
  updatedAt: Date;
  totalMasuk?: number;
  totalKeluar?: number;
}

const ItemSchema: Schema<IItem> = new Schema(
  {
    namaBarang: {
      type: String,
      required: [true, 'Nama barang is required.'],
      trim: true,
      unique: true,
    },
    stokAwal: {
      type: Number,
      required: [true, 'Stok awal is required.'],
      default: 0,
      min: [0, 'Stok awal cannot be negative.'],
    },
    stokSaatIni: {
      type: Number,
      required: [true, 'Stok saat ini is required.'],
      default: 0,
      min: [0, 'Stok saat ini cannot be negative.'],
    },
  },
  { timestamps: true } 
);

ItemSchema.pre('save', function (this: IItem, next: (error?: Error) => void) {
  if (this.isNew && this.stokSaatIni === 0 && this.stokAwal > 0) {
    this.stokSaatIni = this.stokAwal;
  } else if (this.isNew && this.stokSaatIni === 0 && this.stokAwal === 0) {
    this.stokSaatIni = 0; 
  }
  next();
});

ItemSchema.index({ namaBarang: 'text' }); 
ItemSchema.index({ createdAt: -1 });

const Item: Model<IItem> = models.Item || mongoose.model<IItem>('Item', ItemSchema);

export default Item;
