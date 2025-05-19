import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CustomerLedger, { ICustomerLedger } from '@/models/CustomerLedger';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';
import mongoose from 'mongoose';

const postCustomerLedgerHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const body = await req.json();
    const { customerName, initialReceivable, initialPayable } = body;

    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
      return { status: 400, error: 'Customer name is required and must be a non-empty string.' };
    }

    if (typeof initialReceivable !== 'number' && typeof initialPayable !== 'number') {
        return { status: 400, error: 'At least one initial balance (receivable or payable) must be provided as a number.' };
    }
    
    const receivable = typeof initialReceivable === 'number' ? initialReceivable : undefined;
    const payable = typeof initialPayable === 'number' ? initialPayable : undefined;


    const updateData: Partial<ICustomerLedger> = {};
    if (receivable !== undefined) {
        updateData.initialReceivable = receivable;
    }
    if (payable !== undefined) {
        updateData.initialPayable = payable;
    }
    
    if (Object.keys(updateData).length === 0) {
        return { status: 400, error: 'No valid balance data provided to update.' };
    }


    const ledgerEntry = await CustomerLedger.findOneAndUpdate(
      { customerName: customerName.trim(), createdBy: new mongoose.Types.ObjectId(userId) },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return {
      status: 200,
      message: 'Customer ledger updated successfully.',
      data: { ledgerEntry },
    };
  } catch (error: unknown) {
    console.error('Update customer ledger error:', error);
    if (error instanceof mongoose.Error.ValidationError) {
      return { status: 400, error: error.message };
    }
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const POST = withAuthStatic(postCustomerLedgerHandler);
