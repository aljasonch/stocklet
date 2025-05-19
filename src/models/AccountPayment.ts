import mongoose, { Schema, Document, models, Model } from 'mongoose';
import { IUser } from './User';

export enum PaymentType {
  RECEIVABLE_PAYMENT = 'receivable_payment',
  PAYABLE_PAYMENT = 'payable_payment',
}

export interface IAccountPayment extends Document {
  customerName: string;
  paymentDate: Date;
  amount: number;
  paymentType: PaymentType;
  notes?: string;
  createdBy: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const AccountPaymentSchema: Schema<IAccountPayment> = new Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer/Supplier name is required.'],
      trim: true,
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required.'],
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required.'],
      min: [0.01, 'Payment amount must be greater than 0.'],
    },
    paymentType: {
      type: String,
      enum: Object.values(PaymentType),
      required: [true, 'Payment type is required.'],
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required.'],
    },
  },
  { timestamps: true }
);

AccountPaymentSchema.index({ customerName: 1, createdBy: 1, paymentDate: -1 });
AccountPaymentSchema.index({ paymentType: 1, createdBy: 1, paymentDate: -1 });


const AccountPayment: Model<IAccountPayment> =
  models.AccountPayment || mongoose.model<IAccountPayment>('AccountPayment', AccountPaymentSchema);

export default AccountPayment;
