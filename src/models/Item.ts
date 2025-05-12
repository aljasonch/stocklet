import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IItem extends Document {
  namaBarang: string;
  stokAwal: number;
  stokSaatIni: number;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema: Schema<IItem> = new Schema(
  {
    namaBarang: {
      type: String,
      required: [true, 'Nama barang is required.'],
      trim: true,
      unique: true, // Assuming item names are unique
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
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// Initialize stokSaatIni with stokAwal value if not provided or upon creation
ItemSchema.pre('save', function (this: IItem, next: (error?: any) => void) {
  if (this.isNew && this.stokSaatIni === 0 && this.stokAwal > 0) {
    this.stokSaatIni = this.stokAwal;
  } else if (this.isNew && this.stokSaatIni === 0 && this.stokAwal === 0) {
    this.stokSaatIni = 0; // Explicitly set to 0 if stokAwal is 0
  }
  next();
});

const Item: Model<IItem> = models.Item || mongoose.model<IItem>('Item', ItemSchema);

export default Item;
