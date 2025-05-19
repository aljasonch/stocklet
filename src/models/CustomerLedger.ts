import mongoose, { Schema, Document, models, Model } from 'mongoose';
import { IUser } from './User';

export interface ICustomerLedger extends Document {
  customerName: string;
  initialReceivable: number;
  initialPayable: number;
  createdBy: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerLedgerSchema: Schema<ICustomerLedger> = new Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required.'],
      trim: true,
    },
    initialReceivable: {
      type: Number,
      required: true,
      default: 0,
    },
    initialPayable: {
      type: Number,
      required: true,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required.'],
    },
  },
  { 
    timestamps: true,
    indexes: [{ fields: { customerName: 1, createdBy: 1 }, unique: true }]
  }
);

const CustomerLedger: Model<ICustomerLedger> =
  models.CustomerLedger || mongoose.model<ICustomerLedger>('CustomerLedger', CustomerLedgerSchema);

export default CustomerLedger;
