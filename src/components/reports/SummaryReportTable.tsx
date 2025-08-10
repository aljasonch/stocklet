'use client';

interface SummaryRow {
  _id: string;
  totalBerat: number;
  totalNilai: number;
}

interface SummaryReportTableProps {
  data: SummaryRow[];
  isLoading: boolean;
  error?: string | null;
  tipe: 'PENJUALAN' | 'PEMBELIAN';
}

export default function SummaryReportTable({ data, isLoading, error, tipe }: SummaryReportTableProps) {
  const themedTextMuted = "text-center text-[color:var(--foreground)] opacity-75 py-4";
  const themedTextError = "text-center text-red-600";

  if (isLoading) {
    return <p className={themedTextMuted}>Loading summary data...</p>;
  }

  if (error) {
    return (
      <div className="p-4 my-4 bg-opacity-10 rounded-md">
        <p className={themedTextError}>Error: {error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return <p className={themedTextMuted}>No {tipe.toLowerCase()} data found for the selected filters.</p>;
  }

  const totalBerat = data.reduce((sum, row) => sum + row.totalBerat, 0);
  const totalNilai = data.reduce((sum, row) => sum + row.totalNilai, 0);

  const thClasses =
    'px-6 py-3 text-left text-xs font-medium text-[color:var(--foreground)] opacity-75 uppercase tracking-wider';
  const tdBaseClasses = 'px-6 py-4 whitespace-nowrap text-sm';
  const tdTextMuted = `${tdBaseClasses} text-[color:var(--foreground)] opacity-75`;
  const tdTextEmphasized = `${tdBaseClasses} text-[color:var(--foreground)] font-medium`;
  const tfootTdClasses =
    'px-6 py-3 text-xs font-bold text-[color:var(--foreground)] uppercase tracking-wider';

  return (
    <div className="mt-6 bg-[color:var(--card-bg)] shadow-lg overflow-hidden sm:rounded-lg border border-[color:var(--border-color)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[color:var(--border-color)]">
          <thead className="bg-[color:var(--background)]">
            <tr>
              <th scope="col" className={thClasses}>
                {tipe === 'PENJUALAN' ? 'Customer' : 'Supplier'}
              </th>
              <th scope="col" className={`${thClasses} text-right`}>Total Berat (kg)</th>
              <th scope="col" className={`${thClasses} text-right`}>Total Nilai</th>
            </tr>
          </thead>
          <tbody className="bg-[color:var(--card-bg)] divide-y divide-[color:var(--border-color)]">
            {data.map((row) => (
              <tr key={row._id} className="hover:bg-[color:var(--background)] transition-colors duration-150">
                <td className={tdTextEmphasized}>{row._id || '-'}</td>
                <td className={`${tdTextMuted} text-right`}>
                  {row.totalBerat.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className={`${tdTextEmphasized} text-right`}>
                  {row.totalNilai.toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[color:var(--background)] border-t border-[color:var(--border-color)]">
            <tr>
              <td className={tfootTdClasses}>Total Keseluruhan</td>
              <td className={`${tfootTdClasses} text-right`}>
                {totalBerat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className={`${tfootTdClasses} text-right`}>
                {totalNilai.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
