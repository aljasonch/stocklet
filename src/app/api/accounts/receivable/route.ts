import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import CustomerLedger from '@/models/CustomerLedger';
import AccountPayment, { PaymentType } from '@/models/AccountPayment';
import { TransactionType } from '@/types/enums';
import { withAuthStatic, HandlerResult } from '@/lib/authUtils';
import mongoose from 'mongoose';

const getReceivableReportHandler = async (
  req: NextRequest,
  context: { params: Record<string, never> },
  userId: string,
  _userEmail: string,
  _jti: string
): Promise<HandlerResult> => {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const customerNameFilter = searchParams.get('customerName');
    let escapedCustomerNameFilter = '';
    if (customerNameFilter) {
        escapedCustomerNameFilter = customerNameFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const matchStage: mongoose.PipelineStage.Match = {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        tipe: TransactionType.PENJUALAN,
      },
    };
    if (escapedCustomerNameFilter) {
      type MatchQuery = { $match: { createdBy: mongoose.Types.ObjectId; tipe: string; customer?: { $regex: RegExp } } };
      (matchStage as MatchQuery).$match.customer = { $regex: new RegExp(escapedCustomerNameFilter, 'i') };
    }

    const aggregationPipeline: mongoose.PipelineStage[] = [
      matchStage,
      {
        $group: {
          _id: '$customer', 
          totalSales: { $sum: '$totalHarga' },
        },
      },
      {
        $lookup: {
          from: CustomerLedger.collection.name,
          let: { customerName: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$customerName', '$$customerName'] },
                    { $eq: ['$createdBy', new mongoose.Types.ObjectId(userId)] },
                  ],
                },
              },
            },
            { $project: { initialReceivable: 1, _id: 0 } },
          ],
          as: 'ledgerInfo',
        },
      },
      {
        $unwind: {
          path: '$ledgerInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          customerName: '$_id',
          initialReceivableBalance: { $ifNull: ['$ledgerInfo.initialReceivable', 0] },
        },
      },
      {
        $lookup: {
          from: AccountPayment.collection.name,
          let: { customerName: '$customerName' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$customerName', '$$customerName'] },
                    { $eq: ['$createdBy', new mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$paymentType', PaymentType.RECEIVABLE_PAYMENT] },
                  ],
                },
              },
            },
            { $group: { _id: null, totalPaymentsReceived: { $sum: '$amount' } } },
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
          totalPaymentsReceived: { $ifNull: ['$paymentsInfo.totalPaymentsReceived', 0] },
        },
      },
      {
        $addFields: {
          finalReceivableBalance: {
            $subtract: [
              { $add: ['$initialReceivableBalance', '$totalSales'] },
              '$totalPaymentsReceived',
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          customerName: 1,
          initialReceivableBalance: 1,
          totalSales: 1,
          totalPaymentsReceived: 1,
          finalReceivableBalance: 1,
        },
      },
      {
        $sort: { customerName: 1 }, 
      },
    ];

    const receivableReport = await Transaction.aggregate(aggregationPipeline);

    const customerLedgerPipeline: mongoose.PipelineStage[] = [
        {
            $match: {
                createdBy: new mongoose.Types.ObjectId(userId),
                ...(escapedCustomerNameFilter ? { customerName: { $regex: new RegExp(escapedCustomerNameFilter, 'i') } } : {}) 
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
                        tipe: TransactionType.PENJUALAN
                    }},
                    { $limit: 1 }, 
                    { $project: { _id: 1 } }
                ],
                as: 'salesTransactionsExist'
            }
        },
        { 
            $match: { 'salesTransactionsExist': { $eq: [] } }
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
                                    { $eq: ['$paymentType', PaymentType.RECEIVABLE_PAYMENT] }
                                ]
                            }
                        }
                    },
                    { $group: { _id: null, totalPaymentsReceived: { $sum: '$amount' } } }
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
                customerName: '$customerName',
                initialReceivableBalance: { $ifNull: ['$initialReceivable', 0] },
                totalSales: { $literal: 0 },
                totalPaymentsReceived: { $ifNull: ['$ledgerPaymentsInfo.totalPaymentsReceived', 0] },
                finalReceivableBalance: {
                    $subtract: [
                        { $ifNull: ['$initialReceivable', 0] },
                        { $ifNull: ['$ledgerPaymentsInfo.totalPaymentsReceived', 0] }
                    ]
                }
            }
        },
        {
            $match: {
                $or: [
                    { initialReceivableBalance: { $ne: 0 } },
                    { totalPaymentsReceived: { $ne: 0 } }
                ]
            }
        }
    ];
    
    const ledgerOnlyCustomers = await CustomerLedger.aggregate(customerLedgerPipeline);

    const combinedReport = [...receivableReport, ...ledgerOnlyCustomers];
    const finalReport = combinedReport.sort((a, b) => a.customerName.localeCompare(b.customerName));

    return {
      status: 200,
      data: { receivableReport: finalReport },
    };
  } catch (error) {
    console.error('Get receivable report error:', error);
    return { status: 500, error: 'An internal server error occurred.' };
  }
};

export const GET = withAuthStatic(getReceivableReportHandler);
