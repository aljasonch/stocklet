'use client';

import { useState, FormEvent } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface ItemFormProps {
  onItemAdded: () => void;
}

export default function ItemForm({ onItemAdded }: ItemFormProps) {
  const [namaBarang, setNamaBarang] = useState('');
  const [stokAwal, setStokAwal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!namaBarang.trim() || !stokAwal.trim()) {
      setError('Nama barang and stok awal are required.');
      setIsLoading(false);
      return;
    }

    const stokAwalNum = parseFloat(stokAwal);
    if (isNaN(stokAwalNum) || stokAwalNum < 0) {
      setError('Stok awal must be a non-negative number.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetchWithAuth('/api/items', {
        method: 'POST',
        body: JSON.stringify({ namaBarang, stokAwal: stokAwalNum }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add item');
      }

      setSuccessMessage(data.message || 'Item added successfully!');
      setNamaBarang('');
      setStokAwal('');
      onItemAdded();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyles = "block w-full px-3 py-2.5 rounded-md shadow-sm sm:text-sm bg-[color:var(--card-bg)] text-[color:var(--foreground)]";
  const labelStyles = "block text-sm font-medium text-[color:var(--foreground)] opacity-90";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[color:var(--card-bg)] p-6 sm:p-8 rounded-lg shadow-lg border border-[color:var(--border-color)]">
      <h3 className="text-xl font-semibold leading-7 text-[color:var(--foreground)] mb-6">Tambah Barang Baru</h3>
      <div>
        <label htmlFor="namaBarang" className={labelStyles}>
          Nama Barang
        </label>
        <input
          type="text"
          name="namaBarang"
          id="namaBarang"
          required
          value={namaBarang}
          onChange={(e) => setNamaBarang(e.target.value)}
          className={`mt-1 ${inputStyles}`}
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="stokAwal" className={labelStyles}>
          Stok Awal
        </label>
        <input
          type="number"
          name="stokAwal"
          id="stokAwal"
          required
          value={stokAwal}
          onChange={(e) => setStokAwal(e.target.value)}
          min="0"
          step="any"
          className={`mt-1 ${inputStyles}`}
          disabled={isLoading}
        />
      </div>
      {error && (
        <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {successMessage && (
          <p className="text-sm text-green-500">{successMessage}</p>
      )}
      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Menambahkan...
            </>
          ) : (
            'Tambah Barang'
          )}
        </button>
      </div>
    </form>
  );
}
