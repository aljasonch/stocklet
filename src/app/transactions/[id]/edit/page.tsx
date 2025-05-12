'use client';

import TransactionForm from '@/components/transactions/TransactionForm';
import { ITransaction } from '@/models/Transaction';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetchWithAuth'; // Import fetchWithAuth

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [transaction, setTransaction] = useState<ITransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchTransaction = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetchWithAuth(`/api/transactions/${id}`);
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to fetch transaction data.');
          }
          const data = await response.json();
          setTransaction(data.transaction);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
          setIsLoading(false);
        }
      };
      fetchTransaction();
    } else {
      setIsLoading(false);
      setError("Transaction ID is missing.");
    }
  }, [id]);

  const handleTransactionUpdated = () => {
    router.push('/transactions'); 
  };

  if (isLoading) {
    return <p className="text-center text-gray-500 py-8">Loading transaction data...</p>;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        <p>Error: {error}</p>
        <Link href="/transactions" legacyBehavior>
          <a className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            Back to Transactions
          </a>
        </Link>
      </div>
    );
  }

  if (!transaction) {
    return (
        <div className="text-center text-gray-500 py-8">
            <p>Transaction not found.</p>
            <Link href="/transactions" legacyBehavior>
            <a className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
                Back to Transactions
            </a>
            </Link>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Transaksi</h1>
        <p className="text-sm text-gray-600">ID Transaksi: {id}</p>
      </header>
      <TransactionForm
        onTransactionAdded={handleTransactionUpdated}
        isEditMode={true}
        initialData={transaction}
      />
    </div>
  );
}
