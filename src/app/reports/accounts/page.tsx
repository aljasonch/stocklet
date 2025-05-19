'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [debouncedCustomerSearchTerm, setDebouncedCustomerSearchTerm] = useState('');
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
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterName(filterName);
    }, 500); 

    return () => clearTimeout(timer);
  }, [filterName]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearchTerm(customerSearchTerm);
    }, 500); 

    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

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

  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
      return new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
    };
  };
  const fetchDistinctCustomersForSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setCustomerSearchResults([]);
      setShowCustomerSearchResults(false);
      return;
    }
    setIsLoadingCustomerSearch(true);
    try {
      const response = await fetchWithAuth(`/api/distinct-customers?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (!response.ok) throw new Error('Failed to search customers');
      const data = await response.json();
      setCustomerSearchResults(data.customers || []);
      setShowCustomerSearchResults(true);
    } catch (err) {
      console.error("Customer search error:", err);
      setCustomerSearchResults([]);
    } finally {
      setIsLoadingCustomerSearch(false);
    }
  };
  
  useEffect(() => {
    if (debouncedCustomerSearchTerm && debouncedCustomerSearchTerm !== selectedCustomerForBalance) {
      fetchDistinctCustomersForSearch(debouncedCustomerSearchTerm);
    } else if (!debouncedCustomerSearchTerm) {
      setCustomerSearchResults([]);
      setShowCustomerSearchResults(false);
    }
  }, [debouncedCustomerSearchTerm, selectedCustomerForBalance]); 
  
  
  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setCustomerSearchTerm(term); 
    setSelectedCustomerForBalance('');
    
  };

  const handleSelectCustomerFromSearch = (customerName: string) => {
    setSelectedCustomerForBalance(customerName);
    setCustomerSearchTerm(customerName); 
    setCustomerSearchResults([]);
    setShowCustomerSearchResults(false);
  };
  
  useEffect(() => {
    const fetchInitialCustomers = async () => {
        setIsLoadingCustomerSearch(true);
        try {
            const response = await fetchWithAuth(`/api/distinct-customers?limit=10`);
            if (!response.ok) throw new Error('Failed to fetch initial customers');
            const data = await response.json();
        } catch (err) {
            console.error("Initial customer fetch error:", err);
        } finally {
            setIsLoadingCustomerSearch(false);
        }
    };
  }, []);


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

    const payload: any = { customerName: customerToSet };
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
      // Reset form
      setSelectedCustomerForBalance('');
      setCustomerSearchTerm(''); 
      setInitialBalanceValue('');
      fetchData();
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
        <div className="relative">
          <label htmlFor="customerSearchBalance" className="block text-sm font-medium text-gray-700">
            Customer/Supplier:
          </label>
          <input
            type="text"
            id="customerSearchBalance"
            value={customerSearchTerm}
            onChange={handleCustomerSearchChange}
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
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm `}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4 border">
                <h3 className="text-lg font-medium text-gray-900">Input Pembayaran untuk {paymentCustomerName}</h3>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700">Jumlah Pembayaran:</label>
                        <input
                            type="number"
                            id="paymentAmount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Tanggal Pembayaran:</label>
                        <input
                            type="date"
                            id="paymentDate"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="paymentNotes" className="block text-sm font-medium text-gray-700">Catatan (Opsional):</label>
                        <textarea
                            id="paymentNotes"
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    {paymentFormError && <p className="text-sm text-red-500">{paymentFormError}</p>}
                    {paymentFormSuccess && <p className="text-sm text-green-500">{paymentFormSuccess}</p>}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Batal</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-medium">Simpan Pembayaran</button>
                    </div>
                </form>
            </div>
        </div>
    );
  }
}
