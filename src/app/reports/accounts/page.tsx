'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface IReceivableData {
  customerName: string;
  initialReceivableBalance: number;
  totalSales: number;
  totalPaymentsReceived: number;
  finalReceivableBalance: number;
}

interface IPayableData {
  supplierName: string;
  initialPayableBalance: number;
  totalPurchases: number;
  totalPaymentsMade: number;
  finalPayableBalance: number;
}

interface CustomerLedgerPayload {
  customerName: string;
  initialReceivable?: number;
  initialPayable?: number;
}

type ActiveTab = 'receivable' | 'payable';

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('receivable');
  const [reportData, setReportData] = useState<IReceivableData[] | IPayableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterName, setFilterName] = useState('');
  const [debouncedFilterName, setDebouncedFilterName] = useState('');
  const [selectedCustomerForBalance, setSelectedCustomerForBalance] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<string[]>([]);
  const [isLoadingCustomerSearch, setIsLoadingCustomerSearch] = useState(false);
  const [showCustomerSearchResults, setShowCustomerSearchResults] = useState(false);
  const [initialBalanceValue, setInitialBalanceValue] = useState('');
  const [balanceFormError, setBalanceFormError] = useState<string | null>(null);
  const [balanceFormSuccess, setBalanceFormSuccess] = useState<string | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCustomerName, setPaymentCustomerName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);
  const [paymentFormSuccess, setPaymentFormSuccess] = useState<string | null>(null);

  // Debounce utility
  const debounce = <T extends unknown[], R>(
    func: (...args: T) => Promise<R> | R,
    waitFor: number
  ) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: T): Promise<R> => {
      return new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
    };
  };

  // Debounce filter name
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterName(filterName);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterName]);

  const fetchDistinctCustomersForSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setCustomerSearchResults([]);
      setShowCustomerSearchResults(false);
      return;
    }
    setIsLoadingCustomerSearch(true);
    try {
      const response = await fetchWithAuth(`/api/distinct-customers?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to search customers');
      }
      const data = await response.json();
      setCustomerSearchResults(data.customers || []);
      setShowCustomerSearchResults(true);
    } catch (err) {
      console.error("Customer search error:", err);
      setCustomerSearchResults([]);
      setError(err instanceof Error ? err.message : 'Failed to search customers');
    } finally {
      setIsLoadingCustomerSearch(false);
    }
  };

  // Debounced customer search
  const debouncedFetchCustomers = useCallback(
    debounce<[string], void>((searchTerm: string) => {
      fetchDistinctCustomersForSearch(searchTerm);
    }, 500),
    [fetchDistinctCustomersForSearch]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const endpoint = activeTab === 'receivable' ? '/api/accounts/receivable' : '/api/accounts/payable';
    const queryParams = new URLSearchParams();
    if (debouncedFilterName) {
      queryParams.append(activeTab === 'receivable' ? 'customerName' : 'supplierName', debouncedFilterName);
    }

    try {
      const response = await fetchWithAuth(`${endpoint}?${queryParams.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Failed to fetch ${activeTab} data`);
      }
      const data = await response.json();
      setReportData(activeTab === 'receivable' ? data.receivableReport : data.payableReport);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedFilterName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setCustomerSearchTerm(term);
    setSelectedCustomerForBalance('');
    if (term.trim()) {
      debouncedFetchCustomers(term);
    } else {
      setCustomerSearchResults([]);
      setShowCustomerSearchResults(false);
    }
  };

  const handleSelectCustomerFromSearch = (customerName: string) => {
    setSelectedCustomerForBalance(customerName);
    setCustomerSearchTerm(customerName);
    setCustomerSearchResults([]);
    setShowCustomerSearchResults(false);
  };

  const handleSetInitialBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setBalanceFormError(null);
    setBalanceFormSuccess(null);

    const customerToSet = selectedCustomerForBalance || customerSearchTerm.trim();
    if (!customerToSet) {
      setBalanceFormError('Masukkan nama Customer/Supplier.');
      return;
    }
    const balance = parseFloat(initialBalanceValue);
    if (isNaN(balance)) {
      setBalanceFormError('Nominal saldo awal harus berupa angka.');
      return;
    }

    const payload: CustomerLedgerPayload = { customerName: customerToSet };
    if (activeTab === 'receivable') {
      payload.initialReceivable = balance;
    } else {
      payload.initialPayable = balance;
    }

    try {
      const response = await fetchWithAuth('/api/customer-ledger', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal menyimpan saldo awal.');
      }
      setBalanceFormSuccess(data.message || 'Saldo awal berhasil disimpan.');
      setSelectedCustomerForBalance('');
      setCustomerSearchTerm('');
      setInitialBalanceValue('');
      fetchData();
    } catch (err: unknown) {
      setBalanceFormError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    }
  };

  const renderTable = () => {
    if (isLoading) return <p className="text-center py-4">Memuat data...</p>;
    if (error) return <p className="text-center py-4 text-red-500">Error: {error}</p>;
    if (reportData.length === 0) return <p className="text-center py-4">Tidak ada data ditemukan.</p>;

    const isReceivable = activeTab === 'receivable';
    const headers = isReceivable
      ? ["Customer", "Saldo Awal Piutang", "Total Penjualan", "Total Pembayaran Diterima", "Saldo Akhir Piutang", "Aksi"]
      : ["Supplier", "Saldo Awal Utang", "Total Pembelian", "Total Pembayaran Dilakukan", "Saldo Akhir Utang", "Aksi"];

    return (
      <div className="overflow-x-auto mt-6">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map(header => (
                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.map((item, index) => {
              const customerOrSupplierName = isReceivable ? (item as IReceivableData).customerName : (item as IPayableData).supplierName;
              return (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customerOrSupplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isReceivable
                      ? ((item as IReceivableData).initialReceivableBalance ?? 0).toLocaleString('id-ID')
                      : ((item as IPayableData).initialPayableBalance ?? 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isReceivable
                      ? ((item as IReceivableData).totalSales ?? 0).toLocaleString('id-ID')
                      : ((item as IPayableData).totalPurchases ?? 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isReceivable
                      ? ((item as IReceivableData).totalPaymentsReceived ?? 0).toLocaleString('id-ID')
                      : ((item as IPayableData).totalPaymentsMade ?? 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                    {isReceivable
                      ? ((item as IReceivableData).finalReceivableBalance ?? 0).toLocaleString('id-ID')
                      : ((item as IPayableData).finalPayableBalance ?? 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => {
                        setPaymentCustomerName(customerOrSupplierName);
                        setIsPaymentModalOpen(true);
                        setPaymentAmount('');
                        setPaymentDate(new Date().toISOString().split('T')[0]);
                        setPaymentNotes('');
                        setPaymentFormError(null);
                        setPaymentFormSuccess(null);
                      }}
                      className="w-full cursor-pointer md:w-auto flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-green-500 border-2 border-green-500 rounded-xl shadow-sm hover:bg-green-600 hover:border-green-600 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all duration-150"
                    >
                      Input Pembayaran
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInitialBalanceForm = () => {
    return (
      <form onSubmit={handleSetInitialBalance} className="mt-6 p-6 shadow-md rounded-lg bg-gray-50 space-y-4">
        <h3 className="text-lg font-medium">Atur Saldo Awal {activeTab === 'receivable' ? 'Piutang' : 'Utang'}</h3>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="relative">
          <label htmlFor="customerSearchBalance" className="block text-sm font-medium text-gray-700">
            Customer/Supplier:
          </label>
          <input
            type="text"
            id="customerSearchBalance"
            value={customerSearchTerm}
            onChange={handleCustomerSearchChange}
            onFocus={() => {
              if (customerSearchTerm.trim() && customerSearchResults.length > 0) {
                setShowCustomerSearchResults(true);
              }
            }}
            placeholder="Ketik untuk mencari atau masukkan nama baru"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {isLoadingCustomerSearch && <p className="mt-1 text-xs text-gray-500">Mencari...</p>}
          {showCustomerSearchResults && customerSearchResults.length > 0 && (
            <ul
              className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 overflow-auto"
              onMouseLeave={() => setTimeout(() => setShowCustomerSearchResults(false), 200)}
            >
              {customerSearchResults.map((name) => (
                <li
                  key={name}
                  onClick={() => handleSelectCustomerFromSearch(name)}
                  className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700">
            Nominal Saldo Awal {activeTab === 'receivable' ? 'Piutang' : 'Utang'}:
          </label>
          <input
            type="number"
            id="initialBalance"
            value={initialBalanceValue}
            onChange={(e) => setInitialBalanceValue(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        {balanceFormError && <p className="text-sm text-red-500">{balanceFormError}</p>}
        {balanceFormSuccess && <p className="text-sm text-green-500">{balanceFormSuccess}</p>}
        <button
          type="submit"
          className="px-4 py-2 bg-[color:var(--primary)] cursor-pointer text-white rounded-md text-sm font-medium"
        >
          Simpan Saldo Awal
        </button>
      </form>
    );
  };
  
  function renderPaymentModal() {
    if (!isPaymentModalOpen) return null;

    const handlePaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setPaymentFormError(null);
      setPaymentFormSuccess(null);

      const amountNum = parseFloat(paymentAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setPaymentFormError('Jumlah pembayaran harus angka positif.');
        return;
      }
      if (!paymentDate) {
        setPaymentFormError('Tanggal pembayaran harus diisi.');
        return;
      }

      const payload = {
        customerName: paymentCustomerName,
        paymentDate,
        amount: amountNum,
        paymentType: activeTab === 'receivable' ? 'receivable_payment' : 'payable_payment',
        notes: paymentNotes,
      };

      try {
        const response = await fetchWithAuth('/api/account-payments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Gagal menyimpan pembayaran.');
        }
        setPaymentFormSuccess(data.message || 'Pembayaran berhasil disimpan.');
        setIsPaymentModalOpen(false);
        fetchData();
      } catch (err: unknown) {
        setPaymentFormError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
    };    

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
          onClick={() => setIsPaymentModalOpen(false)}>
        <div 
          className="bg-[color:var(--card-bg)] rounded-2xl shadow-2xl border border-[color:var(--border-color)] w-full max-w-lg mx-4 overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-[color:var(--border-color)] bg-[color:var(--surface)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-opacity-10 rounded-lg">
                  💰
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[color:var(--foreground)]">Input Pembayaran</h3>
                  <p className="text-sm text-[color:var(--muted)] mt-1">
                    {activeTab === 'receivable' ? 'Pembayaran Piutang' : 'Pembayaran Utang'} untuk {paymentCustomerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 hover:bg-[color:var(--surface)] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            <form id="paymentForm" onSubmit={handlePaymentSubmit} className="space-y-6">
              <div className="p-4 bg-[color:var(--surface)] rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-opacity-10 rounded-lg">
                    <svg className="w-5 h-5 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-[color:var(--muted)]">
                      {activeTab === 'receivable' ? 'Customer' : 'Supplier'}
                    </p>
                    <p className="text-lg font-semibold text-[color:var(--foreground)]">
                      {paymentCustomerName}
                    </p>
                  </div>
                </div>
              </div>

              {paymentFormError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-red-700">{paymentFormError}</p>
                  </div>
                </div>
              )}

              {paymentFormSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-green-700">{paymentFormSuccess}</p>
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="paymentAmount" className="text-sm font-medium text-[color:var(--foreground)] block mb-2">
                  Jumlah Pembayaran
                </label>
                <div className="flex items-center border border-[color:var(--border-color)] rounded-xl shadow-sm bg-[color:var(--card-bg)]">
                  <div className="flex items-center justify-center px-4 py-3 border-r border-[color:var(--border-color)]">
                    <span className="text-[color:var(--foreground)]">Rp</span>
                  </div>
                  <input
                    type="number"
                    id="paymentAmount"
                    placeholder="Masukkan jumlah"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      setPaymentFormError(null);
                    }}
                    className="w-full py-3 px-4 outline-none bg-transparent text-[color:var(--foreground)]"
                    step="any"
                    min="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="paymentDate" className="text-sm font-medium text-[color:var(--foreground)] block mb-2">
                  Tanggal Pembayaran
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="paymentDate"
                    value={paymentDate}
                    onChange={(e) => {
                      setPaymentDate(e.target.value);
                      setPaymentFormError(null);
                    }}
                    className="form-input w-full pl-4 pr-4 py-3 text-[color:var(--foreground)] bg-[color:var(--card-bg)] border border-[color:var(--border-color)] rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="paymentNotes" className="text-sm font-medium text-[color:var(--foreground)] block mb-2">
                  Catatan <span className="text-[color:var(--muted)]">(Opsional)</span>
                </label>
                <textarea
                  id="paymentNotes"
                  placeholder="Tambahkan catatan pembayaran..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="form-input w-full pl-4 pr-4 py-3 text-[color:var(--foreground)] bg-[color:var(--card-bg)] border border-[color:var(--border-color)] rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none"
                />
              </div>
            </form>
          </div>

          <div className="px-6 py-4 bg-[color:var(--surface)] border-t border-[color:var(--border-color)]">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-5 py-2.5 text-sm cursor-pointer font-medium rounded-xl border border-[color:var(--border-color)] text-[color:var(--foreground)] hover:bg-[color:var(--card-bg)] transition-colors"
              >
                Batal
              </button>
              <button
                form="paymentForm"
                type="submit"
                className="px-5 py-2.5 text-sm cursor-pointer font-medium rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                Simpan Pembayaran
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Laporan Piutang & Utang</h1>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('receivable')}
            className={`${
              activeTab === 'receivable'
                ? 'border-[color:var(--primary)] text-[color:var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Piutang (Receivable)
          </button>
          <button
            onClick={() => setActiveTab('payable')}
            className={`${
              activeTab === 'payable'
                ? 'border-[color:var(--primary)] text-[color:var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Utang (Payable)
          </button>
        </nav>
      </div>

      <div className="mb-4 flex items-end space-x-2">
        <div className="flex-grow">
          <label htmlFor="nameFilter" className="block text-sm font-medium text-gray-700">
            Filter berdasarkan Nama {activeTab === 'receivable' ? 'Customer' : 'Supplier'}:
          </label>
          <input
            type="text"
            id="nameFilter"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder={`Cari ${activeTab === 'receivable' ? 'Customer' : 'Supplier'}...`}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={() => setDebouncedFilterName(filterName)}
          className="px-4 py-2 bg-[color:var(--primary)] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-medium h-10"
        >
          Cari
        </button>
      </div>

      {renderInitialBalanceForm()}
      {renderTable()}
      {isPaymentModalOpen && renderPaymentModal()}
    </div>
  );
}