'use client';

import { ITransaction } from '@/models/Transaction';

interface SalesReportTableProps {
  reportData: ITransaction[];
  isLoading: boolean;
  error?: string | null;
}

export default function SalesReportTable({ reportData, isLoading, error }: SalesReportTableProps) {
  const themedTextMuted = "text-center text-[color:var(--foreground)] opacity-75 py-4";
  const themedTextError = "text-center text-red-600";

  if (isLoading) {
    return <p className={themedTextMuted}>Loading report data...</p>;
  }

  if (error) {
    return <div className="p-4 my-4 bg-opacity-10 rounded-md">
        <p className={themedTextError}>Error: {error}</p>
    </div>;
  }

  if (reportData.length === 0) {
    return <p className={themedTextMuted}>No sales data found for the selected filters.</p>;
  }

  // Calculate totals
  const totalBerat = reportData.reduce((sum, tx) => sum + tx.berat, 0);
  const totalNilai = reportData.reduce((sum, tx) => sum + tx.totalHarga, 0);

  const thClasses = "px-6 py-3 text-left text-xs font-medium text-[color:var(--foreground)] opacity-75 uppercase tracking-wider";
  const tdBaseClasses = "px-6 py-4 whitespace-nowrap text-sm";
  const tdTextMuted = `${tdBaseClasses} text-[color:var(--foreground)] opacity-75`;
  const tdTextEmphasized = `${tdBaseClasses} text-[color:var(--foreground)] font-medium`;
  const tfootTdClasses = "px-6 py-3 text-xs font-bold text-[color:var(--foreground)] uppercase tracking-wider";


  return (
    <div className={`mt-6 bg-[color:var(--card-bg)] shadow-lg overflow-hidden sm:rounded-lg border border-[color:var(--border-color)] transition-opacity duration-500 ease-in-out ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[color:var(--border-color)]">
          <thead className="bg-[color:var(--background)]">
            <tr>
              <th scope="col" className={thClasses}>Tanggal</th>
              <th scope="col" className={thClasses}>Customer</th>
              <th scope="col" className={thClasses}>No. SJ</th>
              <th scope="col" className={thClasses}>No. Inv</th>
              <th scope="col" className={thClasses}>Barang</th>
              <th scope="col" className={`${thClasses} text-right`}>Berat (kg)</th>
              <th scope="col" className={`${thClasses} text-right`}>Harga</th>
              <th scope="col" className={`${thClasses} text-right`}>Total Harga</th>
              <th scope="col" className={thClasses}>No. PO</th>
              <th scope="col" className={thClasses}>No.SJ SBY</th>
            </tr>
          </thead>
          <tbody className="bg-[color:var(--card-bg)] divide-y divide-[color:var(--border-color)]">{ // <--- Move { here
              reportData.map((tx) => (
                <tr key={tx._id as string} className="hover:bg-[color:var(--background)] transition-colors duration-150">
                  <td className={tdTextMuted}>{new Date(tx.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className={tdTextEmphasized}>{tx.customer}</td>
                  <td className={tdTextMuted}>{tx.noSJ}</td>
                  <td className={tdTextMuted}>{tx.noInv}</td>
                  <td className={tdTextEmphasized}>
                    {(tx.item as any)?.namaBarang || tx.namaBarangSnapshot || 'N/A'}
                  </td>
                  <td className={`${tdTextMuted} text-right`}>{tx.berat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`${tdTextMuted} text-right`}>{tx.harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</td>
                  <td className={`${tdTextEmphasized} text-right`}>{tx.totalHarga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</td>
                  <td className={tdTextMuted}>{tx.noPO || '-'}</td>
                  <td className={tdTextMuted}>{tx.noSJSby || '-'}</td>
                </tr>
              ))
            }</tbody>
          <tfoot className="bg-[color:var(--background)] border-t border-[color:var(--border-color)]">
            <tr>
              <td colSpan={5} className={`${tfootTdClasses} text-left`}>Total Keseluruhan</td>
              <td className={`${tfootTdClasses} text-right`}>{totalBerat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
              <td className={tfootTdClasses}>{null}</td> {/* This cell is intentionally blank for alignment */}
              <td className={`${tfootTdClasses} text-right`}>{totalNilai.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</td>
              <td colSpan={2} className={tfootTdClasses}>{null}</td> {/* These cells are intentionally blank for alignment */}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
