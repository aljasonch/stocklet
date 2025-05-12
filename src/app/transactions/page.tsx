'use client'; // This page uses client-side state for refreshKey

import TransactionForm from '@/components/transactions/TransactionForm';
import TransactionsList from '@/components/transactions/TransactionsList';
import { useState } from 'react';

export default function TransactionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransactionAdded = () => {
    setRefreshKey(prevKey => prevKey + 1); // Increment key to trigger list refresh
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manajemen Transaksi</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <TransactionForm onTransactionAdded={handleTransactionAdded} />
        </div>
        <div className="md:col-span-2">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Daftar Transaksi</h2>
          <TransactionsList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
