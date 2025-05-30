import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AccountPayment, { PaymentType } from '@/models/AccountPayment';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';
import mongoose from 'mongoose';

const getAccountPaymentHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const customerName = searchParams.get("customerName");
    const paymentType = searchParams.get("paymentType");

    if (!customerName) {
      return { status: 400, error: "Customer name is required." };
    }

    if (
      !paymentType ||
      !Object.values(PaymentType).includes(paymentType as PaymentType)
    ) {
      return { status: 400, error: "Valid payment type is required." };
    }

    const payments = await AccountPayment.find({
      customerName,
      paymentType,
      createdBy: new mongoose.Types.ObjectId(userId),
    })
      .sort({ paymentDate: -1 })
      .select(
        "_id customerName paymentDate amount paymentType notes createdAt updatedAt"
      );

    return {
      status: 200,
      data: { payments },
    };
  } catch (error: unknown) {
    console.error("Get payment history error:", error);
    return {
      status: 500,
      error:
        "An internal server error occurred while fetching payment history.",
    };
  }
};

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

const putAccountPaymentHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const body = await req.json();
    const { paymentId, amount, notes } = body;

    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return { status: 400, error: "Valid payment ID is required." };
    }

    if (typeof amount !== "number" || amount <= 0) {
      return { status: 400, error: "Amount must be a positive number." };
    }

    const payment = await AccountPayment.findOne({
      _id: paymentId,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    if (!payment) {
      return { status: 404, error: "Payment not found." };
    }

    payment.amount = amount;
    if (notes !== undefined) {
      payment.notes = notes || undefined;
    }

    await payment.save();

    return {
      status: 200,
      message: "Payment updated successfully.",
      data: { payment },
    };
  } catch (error: unknown) {
    console.error("Update payment error:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return { status: 400, error: error.message };
    }
    return {
      status: 500,
      error: "An internal server error occurred while updating payment.",
    };
  }
};

export const GET = withAuthStatic(getAccountPaymentHandler);
export const POST = withAuthStatic(postAccountPaymentHandler);
export const PUT = withAuthStatic(putAccountPaymentHandler);
