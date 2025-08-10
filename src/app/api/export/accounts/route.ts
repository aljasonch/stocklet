import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import CustomerLedger from '@/models/CustomerLedger';
import AccountPayment, { PaymentType } from '@/models/AccountPayment';
import { TransactionType } from '@/types/enums';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { verifyTokenFromCookies } from '@/lib/authUtils';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_ISSUER = 'stocklet-app';
const JWT_AUDIENCE = 'stocklet-users';
const JWT_EXPIRY = '15m';
const COOKIE_MAX_AGE = 15 * 60;
const CLOCK_SKEW_TOLERANCE = 60;
const REFRESH_THRESHOLD = 5 * 60;

type DecodedToken = {
  userId: string;
  exp?: number;
};

interface SheetRow {
  'Jenis': 'REKAP' | 'PEMBAYARAN';
  'Nama': string;
  'Tanggal': string | null;
  'Keterangan': string | null;
  'Debit': number | null;
  'Kredit': number | null;
  'Saldo': number | null;
}

interface TransAggRow {
  _id: string | null;
  totalTrans: number;
}

interface LedgerDoc {
  customerName: string;
  initialReceivable?: number;
  initialPayable?: number;
}

interface PaymentDoc {
  paymentDate?: Date | string;
  notes?: string;
  amount: number;
}

export const GET = async (request: NextRequest): Promise<Response> => {
  const decodedToken = verifyTokenFromCookies(request) as DecodedToken | null;
  if (!decodedToken?.userId) {
    return NextResponse.json({ message: 'Unauthorized: Invalid or expired token' }, { status: 401 });
  }
  const userId = decodedToken.userId;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    if (!type || (type !== 'receivable' && type !== 'payable')) {
      return NextResponse.json({ message: 'Invalid type parameter' }, { status: 400 });
    }

    const nameFilterParam = searchParams.get(type === 'receivable' ? 'customerName' : 'supplierName');
    const escapedName = nameFilterParam ? nameFilterParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    const match: Record<string, unknown> = {
      createdBy: new mongoose.Types.ObjectId(userId),
      tipe: type === 'receivable' ? TransactionType.PENJUALAN : TransactionType.PEMBELIAN,
    };
    if (escapedName) {
      match.customer = { $regex: new RegExp(escapedName, 'i') };
    }

    const transAgg = await Transaction.aggregate<TransAggRow>([
      { $match: match },
      {
        $group: {
          _id: '$customer',
          totalTrans: { $sum: '$totalHarga' },
        },
      },
    ]);

    const ledgerDocs = (await CustomerLedger.find({
      createdBy: new mongoose.Types.ObjectId(userId),
    }).lean()) as LedgerDoc[];

    const summaryRows: SheetRow[] = [];
    const paymentRows: SheetRow[] = [];

    for (const rec of transAgg) {
      const name = rec._id ?? '-';

      const ledger = ledgerDocs.find((l) => l.customerName === name);
      const initial = ledger
        ? (type === 'receivable' ? (ledger.initialReceivable ?? 0) : (ledger.initialPayable ?? 0))
        : 0;

      const paymentsAgg = await AccountPayment.aggregate<{ _id: null; totalPaid: number }>([
        {
          $match: {
            createdBy: new mongoose.Types.ObjectId(userId),
            customerName: name,
            paymentType:
              type === 'receivable'
                ? PaymentType.RECEIVABLE_PAYMENT
                : PaymentType.PAYABLE_PAYMENT,
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
          },
        },
      ]);

      const totalPayments = paymentsAgg[0]?.totalPaid ?? 0;
      const saldoAkhir = initial + (rec.totalTrans ?? 0) - totalPayments;

      summaryRows.push({
        'Jenis': 'REKAP',
        'Nama': name,
        'Tanggal': null,
        'Keterangan': null,
        'Debit': type === 'receivable' ? (rec.totalTrans ?? 0) : null,
        'Kredit': type === 'receivable' ? null : (rec.totalTrans ?? 0),
        'Saldo': saldoAkhir,
      });

      const payments = (await AccountPayment.find({
        customerName: name,
        paymentType:
          type === 'receivable'
            ? PaymentType.RECEIVABLE_PAYMENT
            : PaymentType.PAYABLE_PAYMENT,
        createdBy: new mongoose.Types.ObjectId(userId),
      })
        .sort({ paymentDate: 1 })
        .lean()) as PaymentDoc[];

      for (const p of payments) {
        paymentRows.push({
          'Jenis': 'PEMBAYARAN',
          'Nama': name,
          'Tanggal': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('id-ID') : null,
          'Keterangan': p.notes ?? '',
          'Debit': type === 'payable' ? (p.amount ?? 0) : null,
          'Kredit': type === 'receivable' ? (p.amount ?? 0) : null,
          'Saldo': null,
        });
      }
    }

    const headers = ['Jenis', 'Nama', 'Tanggal', 'Keterangan', 'Debit', 'Kredit', 'Saldo'] as const;
    const summaryWs: XLSX.WorkSheet = XLSX.utils.json_to_sheet(summaryRows, { header: headers as unknown as string[] });
    const paymentWs: XLSX.WorkSheet = XLSX.utils.json_to_sheet(paymentRows, { header: headers as unknown as string[] });

    const colWidths = [
      { wch: 15 },
      { wch: 40 },
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    summaryWs['!cols'] = colWidths;
    paymentWs['!cols'] = colWidths;

    const applyNumberFormats = (ws: XLSX.WorkSheet) => {
      const ref = ws['!ref'] as string | undefined;
      if (!ref) return;
      const range = XLSX.utils.decode_range(ref);
      for (let r = 1; r <= range.e.r; r++) {
        [4, 5, 6].forEach((c) => {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr] as XLSX.CellObject | undefined;
          if (cell && typeof cell.v === 'number') {
            cell.t = 'n';
            cell.z = '"Rp" * #,##0';
          }
        });
      }
    };
    applyNumberFormats(summaryWs);
    applyNumberFormats(paymentWs);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Rekap');
    XLSX.utils.book_append_sheet(workbook, paymentWs, 'Pembayaran');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const headersResp = new Headers();
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const jenis = type === 'receivable' ? 'Piutang' : 'Utang';
    const filename = `Laporan ${jenis} - ${dateStr}.xlsx`;
    headersResp.append('Content-Disposition', `attachment; filename="${filename}"`);
    headersResp.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const responseToReturn = new NextResponse(Buffer.from(excelBuffer), { status: 200, headers: headersResp });

    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExp = decodedToken.exp;
    if (typeof tokenExp === 'number' && (tokenExp - currentTime) < (REFRESH_THRESHOLD + CLOCK_SKEW_TOLERANCE)) {
      const newJwtToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET!,
        {
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          expiresIn: JWT_EXPIRY,
          jwtid: randomUUID(),
        }
      );
      responseToReturn.headers.append(
        'Set-Cookie',
        `token=${newJwtToken}; Path=/; HttpOnly; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`
      );
    }

    return responseToReturn;
  } catch (error) {
    console.error('Export accounts error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
};
