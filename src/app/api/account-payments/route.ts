import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AccountPayment, { PaymentType } from '@/models/AccountPayment';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';
import mongoose from 'mongoose';

const postAccountPaymentHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const body = await req.json();
    const { customerName, paymentDate, amount, paymentType, notes } = body;

    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
      return { status: 400, error: 'Customer/Supplier name is required.' };
    }
    if (!paymentDate) {
      return { status: 400, error: 'Payment date is required.' };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { status: 400, error: 'Amount must be a positive number.' };
    }
    if (!paymentType || !Object.values(PaymentType).includes(paymentType as PaymentType)) {
      return { status: 400, error: 'Invalid payment type.' };
    }

    const newPayment = new AccountPayment({
      customerName: customerName.trim(),
      paymentDate: new Date(paymentDate),
      amount,
      paymentType,
      notes: notes || undefined,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await newPayment.save();

    return {
      status: 201,
      message: 'Payment recorded successfully.',
      data: { payment: newPayment },
    };
  } catch (error: unknown) {
    console.error('Record payment error:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      return { status: 400, error: error.message };
    }
    return { status: 500, error: 'An internal server error occurred while recording payment.' };
  }
};


export const POST = withAuthStatic(postAccountPaymentHandler);
