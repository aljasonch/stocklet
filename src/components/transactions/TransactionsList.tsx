'use client';

import { ITransaction } from '@/models/Transaction';
import { TransactionType } from '@/types/enums';
import { useEffect, useState } from 'react'; 
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface TransactionsListProps {
  refreshKey?: number;
}

type FilterType = 'ALL' | TransactionType.PENJUALAN | TransactionType.PEMBELIAN;

export default function TransactionsList({ refreshKey }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<ITransaction[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 8

  const fetchTransactions = async (pageToFetch: number, currentFilterType: FilterType) => {
    setIsLoading(true);
    setError(null);
    let url = `/api/transactions?page=${pageToFetch}&limit=${itemsPerPage}`;
    if (currentFilterType !== 'ALL') {
      url += `&tipe=${currentFilterType}`;
    }
    try {
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data.transactions || []);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterTypeChange = (newFilterType: FilterType) => {
    setFilterType(newFilterType);
    setCurrentPage(1); 
  };

  useEffect(() => {
    fetchTransactions(currentPage, filterType);
  }, [currentPage, filterType, refreshKey]); 


  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
        setCurrentPage(1); 
    }
  }, [refreshKey]);


  const themedTextMuted = "text-center text-[color:var(--foreground)] opacity-75 py-4";
  const themedTextError = "text-center text-red-600";

  if (isLoading) {
    return <p className={themedTextMuted}>Loading transactions...</p>;
  }

  if (error) {
    return <div className="p-4 my-4 bg-opacity-10 rounded-md">
        <p className={themedTextError}>Error: {error}</p>
    </div>;
  }

  if (isLoading && transactions.length === 0) {
    return <p className={themedTextMuted}>Loading transactions...</p>;
  }

  if (error) {
    return <div className="p-4 my-4 bg-opacity-10 rounded-md">
        <p className={themedTextError}>Error: {error}</p>
    </div>;
  }

  if (!isLoading && transactions.length === 0) {
    return (
      <>
        <div className="mb-4 flex space-x-2">
          <button
            onClick={() => handleFilterTypeChange('ALL')}
            className={`px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${filterType === 'ALL' ? 'bg-[color:var(--primary)] text-white' : 'bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] text-[color:var(--foreground)]'}`}
          >
            Semua
          </button>
          <button
            onClick={() => handleFilterTypeChange(TransactionType.PENJUALAN)}
            className={`px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${filterType === TransactionType.PENJUALAN ? 'bg-red-500 text-white' : 'bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] text-[color:var(--foreground)]'}`}
          >
            Penjualan
          </button>
          <button
            onClick={() => handleFilterTypeChange(TransactionType.PEMBELIAN)}
            className={`px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${filterType === TransactionType.PEMBELIAN ? 'bg-green-500 text-white' : 'bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)]  text-[color:var(--foreground)]'}`}
          >
            Pembelian
          </button>        
          </div>
        <p className={themedTextMuted}>
          {filterType === 'ALL' ? 'No transactions found.' : `No ${filterType === TransactionType.PENJUALAN ? 'sales' : 'purchase'} transactions found.`}
        </p>
        {totalPages > 1 && (
           <div className="mt-6 flex justify-center items-center space-x-3">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-4 py-2 text-sm cursor-pointer font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-[color:var(--foreground)]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="px-4 py-2 text-sm cursor-pointer font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  }

  const thClasses = "px-6 py-3 text-left text-xs font-medium text-[color:var(--foreground)] opacity-75 uppercase tracking-wider";
  const tdBaseClasses = "px-6 py-4 whitespace-nowrap text-sm";
  const tdTextMuted = `${tdBaseClasses} text-[color:var(--foreground)] opacity-75`;
  const tdTextEmphasized = `${tdBaseClasses} text-[color:var(--foreground)] font-medium`;


  return (
    <div className={`mt-6 transition-opacity duration-500 ease-in-out ${isLoading && transactions.length === 0 ? 'opacity-0' : 'opacity-100'}`}>
      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => handleFilterTypeChange('ALL')}
          className={`px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${filterType === 'ALL' ? 'bg-[color:var(--primary)] text-white' : 'bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] text-[color:var(--foreground)]'}`}
        >
          Semua
        </button>
        <button
          onClick={() => handleFilterTypeChange(TransactionType.PENJUALAN)}
          className={`px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${filterType === TransactionType.PENJUALAN ? 'bg-red-500 text-white' : 'bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] text-[color:var(--foreground)]'}`}
        >
          Penjualan
        </button>
        <button
          onClick={() => handleFilterTypeChange(TransactionType.PEMBELIAN)}
          className={`px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${filterType === TransactionType.PEMBELIAN ? 'bg-green-500 text-white' : 'bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] text-[color:var(--foreground)]'}`}
        >
          Pembelian
        </button>
      </div>
      <div className={`bg-[color:var(--card-bg)] shadow-lg overflow-hidden sm:rounded-lg border border-[color:var(--border-color)]`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[color:var(--border-color)]">
            <thead className="bg-[color:var(--background)]">
            <tr>
              <th scope="col" className={thClasses}>Tanggal</th>
              <th scope="col" className={thClasses}>Tipe</th>
              <th scope="col" className={thClasses}>Customer/Supplier</th>
              <th scope="col" className={thClasses}>No. SJ</th>
              <th scope="col" className={thClasses}>No. Inv</th>
              <th scope="col" className={thClasses}>Barang</th>
              <th scope="col" className={`${thClasses} text-right`}>Berat (kg)</th>
              <th scope="col" className={`${thClasses} text-right`}>Harga</th>
              <th scope="col" className={`${thClasses} text-right`}>Total Harga</th>
              <th scope="col" className={thClasses}>No. PO</th>
              <th scope="col" className={thClasses}>No.SJ SBY</th>
              <th scope="col" className={`${thClasses} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-[color:var(--card-bg)] divide-y divide-[color:var(--border-color)]">
            {transactions.map((tx) => (
              <tr key={tx._id as string} className="hover:bg-[color:var(--background)] transition-colors duration-150">
                <td className={tdTextMuted}>{new Date(tx.tanggal).toLocaleDateString('id-ID')}</td>
                <td className={`${tdBaseClasses}`}>
                  <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    tx.tipe === 'PENJUALAN' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {tx.tipe}
                  </span>
                </td>
                <td className={tdTextEmphasized}>{tx.customer}</td>
                <td className={tdTextMuted}>{tx.noSJ}</td>
                <td className={tdTextMuted}>{tx.noInv}</td>
                <td className={tdTextEmphasized}>
                  {typeof tx.item === 'object' && tx.item !== null && 'namaBarang' in tx.item
                    ? tx.item.namaBarang
                    : tx.namaBarangSnapshot || 'N/A'}
                </td>
                <td className={`${tdTextMuted} text-right`}>{tx.berat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`${tdTextMuted} text-right`}>{tx.harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</td>
                <td className={`${tdTextEmphasized} text-right`}>{tx.totalHarga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</td>
                <td className={tdTextMuted}>{tx.noPO || '-'}</td>
                <td className={tdTextMuted}>{tx.noSJSby || '-'}</td>
                <td className={`${tdBaseClasses} text-right font-medium`}>
                  <Link href={`/transactions/${tx._id}/edit`}>
                    <span className="text-[color:var(--primary)] hover:opacity-75 mr-3 cursor-pointer transition-opacity duration-150">Edit</span>
                  </Link>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Apakah Anda yakin ingin menghapus transaksi untuk ${tx.customer} - ${tx.noSJ}/${tx.noInv}? Stok barang terkait akan dikembalikan.`)) {
                        try {
                          const response = await fetchWithAuth(`/api/transactions/${tx._id}`, { method: 'DELETE' });
                          if (!response.ok) {
                            const data = await response.json();
                            throw new Error(data.message || 'Gagal menghapus transaksi.');
                          }
                          setTransactions(prev => prev.filter(t => t._id !== tx._id));
                          alert('Transaksi berhasil dihapus.');
                        } catch (err: unknown) { 
                          alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
                        }
                      }
                    }}
                    className="text-red-600 hover:text-red-700 cursor-pointer transition-colors duration-150"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {totalPages > 0 && (
      <div className="mt-6 flex justify-center items-center space-x-3">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1 || isLoading}
          className="px-4 py-2 text-sm font-medium rounded-md cursor-pointer bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-[color:var(--foreground)]">
          Page {currentPage} of {totalPages} (Total: {totalItems})
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages || isLoading}
          className="px-4 py-2 text-sm font-medium rounded-md cursor-pointer bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    )}
  </div>
  );
}
