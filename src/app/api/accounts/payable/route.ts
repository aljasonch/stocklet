import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import CustomerLedger from '@/models/CustomerLedger';
import AccountPayment, { PaymentType } from '@/models/AccountPayment'; // Import AccountPayment and PaymentType
import { TransactionType } from '@/types/enums';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';
import mongoose from 'mongoose';

const getPayableReportHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const supplierNameFilter = searchParams.get('supplierName');
    let escapedSupplierNameFilter = '';
    if (supplierNameFilter) {
        escapedSupplierNameFilter = supplierNameFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const matchStage: mongoose.PipelineStage.Match = {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        tipe: TransactionType.PEMBELIAN,
      },
    };
    if (escapedSupplierNameFilter) { // Use escaped filter
      // 'customer' field in Transaction model stores supplier names for PEMBELIAN type
      (matchStage.$match as any).customer = { $regex: new RegExp(escapedSupplierNameFilter, 'i') };
    }

    const aggregationPipeline: mongoose.PipelineStage[] = [
      matchStage,
      {
        $group: {
          _id: '$customer', // Group by supplier name (stored in 'customer' field)
          totalPurchases: { $sum: '$totalHarga' },
        },
      },
      {
        $lookup: {
          from: CustomerLedger.collection.name,
          let: { supplierName: '$_id' }, // Name matches 'customer' field from Transaction
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$customerName', '$$supplierName'] },
                    { $eq: ['$createdBy', new mongoose.Types.ObjectId(userId)] },
                  ],
                },
              },
            },
            { $project: { initialPayable: 1, _id: 0 } },
          ],
          as: 'ledgerInfo',
        },
      },
      {
        $unwind: {
          path: '$ledgerInfo',
          preserveNullAndEmptyArrays: true, // Keep suppliers even if no ledger entry
        },
      },
      {
        $addFields: {
          supplierName: '$_id', // Renaming for clarity in output
          initialPayableBalance: { $ifNull: ['$ledgerInfo.initialPayable', 0] },
        },
      },
      {
        $lookup: {
          from: AccountPayment.collection.name,
          let: { supplierName: '$supplierName' }, 
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$customerName', '$$supplierName'] }, 
                    { $eq: ['$createdBy', new mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$paymentType', PaymentType.PAYABLE_PAYMENT] },
                  ],
                },
              },
            },
            { $group: { _id: null, totalPaymentsMade: { $sum: '$amount' } } },
          ],
          as: 'paymentsInfo',
        },
      },
      {
        $unwind: {
          path: '$paymentsInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          totalPaymentsMade: { $ifNull: ['$paymentsInfo.totalPaymentsMade', 0] },
        },
      },
      {
        $addFields: {
          finalPayableBalance: {
            $subtract: [
              { $add: ['$initialPayableBalance', '$totalPurchases'] },
              '$totalPaymentsMade',
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          supplierName: 1,
          initialPayableBalance: 1,
          totalPurchases: 1,
          totalPaymentsMade: 1,
          finalPayableBalance: 1,
        },
      },
      {
        $sort: { supplierName: 1 }, 
      },
    ];

    const payableReport = await Transaction.aggregate(aggregationPipeline);
    
    const customerLedgerPipeline: mongoose.PipelineStage[] = [
        {
            $match: {
                createdBy: new mongoose.Types.ObjectId(userId),
                ...(escapedSupplierNameFilter ? { customerName: { $regex: new RegExp(escapedSupplierNameFilter, 'i') } } : {})
            }
        },
        {
            $lookup: { 
                from: Transaction.collection.name,
                let: { customerLedgerName: '$customerName' },
                pipeline: [
                    { $match: { 
                        $expr: { $eq: ['$customer', '$$customerLedgerName'] },
                        createdBy: new mongoose.Types.ObjectId(userId),
                        tipe: TransactionType.PEMBELIAN 
                    }},
                    { $limit: 1 },
                    { $project: { _id: 1 } }
                ],
                as: 'purchaseTransactionsExist'
            }
        },
        { 
            $match: { 'purchaseTransactionsExist': { $eq: [] } }
        },
        {
            $lookup: {
                from: AccountPayment.collection.name,
                let: { customerNameFromLedger: '$customerName' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$customerName', '$$customerNameFromLedger'] },
                                    { $eq: ['$createdBy', new mongoose.Types.ObjectId(userId)] },
                                    { $eq: ['$paymentType', PaymentType.PAYABLE_PAYMENT] }
                                ]
                            }
                        }
                    },
                    { $group: { _id: null, totalPaymentsMade: { $sum: '$amount' } } }
                ],
                as: 'ledgerPaymentsInfo'
            }
        },
        {
            $unwind: { path: '$ledgerPaymentsInfo', preserveNullAndEmptyArrays: true }
        },
        {
            $project: {
                _id: 0,
                supplierName: '$customerName', // Output as supplierName
                initialPayableBalance: { $ifNull: ['$initialPayable', 0] },
                totalPurchases: { $literal: 0 }, // No purchases for these entries, use $literal
                totalPaymentsMade: { $ifNull: ['$ledgerPaymentsInfo.totalPaymentsMade', 0] },
                finalPayableBalance: {
                    $subtract: [
                        { $ifNull: ['$initialPayable', 0] },
                        { $ifNull: ['$ledgerPaymentsInfo.totalPaymentsMade', 0] }
                    ]
                }
            }
        },
        {
            $match: {
                $or: [
                    { initialPayableBalance: { $ne: 0 } },
                    { totalPaymentsMade: { $ne: 0 } }
                ]
            }
        }
    ];

    const ledgerOnlySuppliers = await CustomerLedger.aggregate(customerLedgerPipeline);

    const combinedReport = [...payableReport, ...ledgerOnlySuppliers];
    
    const finalReport = combinedReport.sort((a, b) => a.supplierName.localeCompare(b.supplierName));

    return {
      status: 200,
      data: { payableReport: finalReport },
    };
  } catch (error) {
    console.error('Get payable report error:', error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getPayableReportHandler);
