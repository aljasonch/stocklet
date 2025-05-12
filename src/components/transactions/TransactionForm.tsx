'use client';

import { useState, FormEvent, useEffect } from 'react';
import { IItem } from '@/models/Item';
import { TransactionType } from '@/types/enums';
import { ITransaction } from '@/models/Transaction';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface TransactionFormProps {
  onTransactionAdded: () => void;
  isEditMode?: boolean;
  initialData?: ITransaction | null;
}

export default function TransactionForm({ onTransactionAdded, isEditMode = false, initialData = null }: TransactionFormProps) {
  const getItemIdFromData = (itemField: ITransaction['item'] | undefined): string => {
    if (!itemField) return '';
    if (typeof itemField === 'string') return itemField;
    return (itemField as IItem)._id?.toString() || '';
  };

  const [tanggal, setTanggal] = useState(initialData?.tanggal ? new Date(initialData.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [tipe, setTipe] = useState<TransactionType>(initialData?.tipe || TransactionType.PENJUALAN);
  const [customer, setCustomer] = useState(initialData?.customer || '');
  const [noSJ, setNoSJ] = useState(initialData?.noSJ || '');
  const [noInv, setNoInv] = useState(initialData?.noInv || '');
  const [noPO, setNoPO] = useState(initialData?.noPO || '');
  const [itemId, setItemId] = useState(getItemIdFromData(initialData?.item));
  const [berat, setBerat] = useState(initialData?.berat?.toString() || '');
  const [harga, setHarga] = useState(initialData?.harga?.toString() || '');
  const [noSJSby, setNoSJSby] = useState(initialData?.noSJSby || '');
  
  const [items, setItems] = useState<IItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoadingItems(true);
      try {
        const response = await fetchWithAuth('/api/items');
        if (!response.ok) throw new Error('Failed to fetch items');
        const data = await response.json();
        setItems(data.items || []);
        if (isEditMode && initialData?.item) {
            setItemId(getItemIdFromData(initialData.item));
        }
      } catch (err) {
        setError('Could not load items for selection.');
        console.error(err);
      } finally {
        setIsLoadingItems(false);
      }
    };
    fetchItems();
  }, [isEditMode, initialData]);

  useEffect(() => {
    if (isEditMode && initialData) {
      setTanggal(initialData.tanggal ? new Date(initialData.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setTipe(initialData.tipe || TransactionType.PENJUALAN);
      setCustomer(initialData.customer || '');
      setNoSJ(initialData.noSJ || '');
      setNoInv(initialData.noInv || '');
      setNoPO(initialData.noPO || '');
      setItemId(getItemIdFromData(initialData.item));
      setBerat(initialData.berat?.toString() || '');
      setHarga(initialData.harga?.toString() || '');
      setNoSJSby(initialData.noSJSby || '');
    }
  }, [isEditMode, initialData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const beratNum = parseFloat(berat);
    const hargaNum = parseFloat(harga);

    if (!itemId) {
        setError('Please select an item.');
        setIsSubmitting(false);
        return;
    }
    if (isNaN(beratNum) || beratNum <= 0) {
      setError('Berat must be a positive number.');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(hargaNum) || hargaNum < 0) {
      setError('Harga must be a non-negative number.');
      setIsSubmitting(false);
      return;
    }
    
    const transactionData = {
      tanggal, tipe, customer, noSJ, noInv, noPO, itemId,
      berat: beratNum, harga: hargaNum, noSJSby,
    };

    try {
      const url = isEditMode && initialData?._id ? `/api/transactions/${initialData._id}` : '/api/transactions';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(transactionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${isEditMode ? 'update' : 'add'} transaction`);
      }

      setSuccessMessage(data.message || `Transaction ${isEditMode ? 'updated' : 'added'} successfully!`);
      if (!isEditMode) {
        setTanggal(new Date().toISOString().split('T')[0]);
        setTipe(TransactionType.PENJUALAN);
        setCustomer(''); setNoSJ(''); setNoInv(''); setNoPO(''); setItemId('');
        setBerat(''); setHarga(''); setNoSJSby('');
      }
      onTransactionAdded();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyles = "appearance-none block w-full px-3 py-2.5 border border-[color:var(--border-color)] rounded-md shadow-sm placeholder-[color:var(--foreground)] placeholder-opacity-50  sm:text-sm bg-[color:var(--card-bg)] text-[color:var(--foreground)] transition-all duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed";
  const labelStyles = "block text-sm font-medium text-[color:var(--foreground)] opacity-90";

  return (  
    <form onSubmit={handleSubmit} className="space-y-6 bg-[color:var(--card-bg)] p-6 sm:p-8 rounded-lg shadow-lg border border-[color:var(--border-color)]">
      <h3 className="text-xl font-semibold leading-7 text-[color:var(--foreground)] mb-6">{isEditMode ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
        <div>
          <label htmlFor="tanggal" className={labelStyles}>Tanggal</label>
          <input type="date" id="tanggal" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className={`mt-1 ${inputStyles}`} disabled={isSubmitting} />
        </div>

        <div>
          <label htmlFor="tipe" className={labelStyles}>Tipe Transaksi</label>
          <select id="tipe" value={tipe} onChange={(e) => setTipe(e.target.value as TransactionType)} required className={`mt-1 ${inputStyles}`} disabled={isSubmitting}>
            <option value={TransactionType.PENJUALAN}>Penjualan</option>
            <option value={TransactionType.PEMBELIAN}>Pembelian</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="customer" className={labelStyles}>{tipe === TransactionType.PENJUALAN ? 'Customer' : 'Supplier'}</label>
          <input type="text" id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} required className={`mt-1 ${inputStyles}`} disabled={isSubmitting} />
        </div>
        
        <div>
          <label htmlFor="noSJ" className={labelStyles}>No. Surat Jalan (SJ)</label>
          <input type="text" id="noSJ" value={noSJ} onChange={(e) => setNoSJ(e.target.value)} className={`mt-1 ${inputStyles}`} disabled={isSubmitting} />
        </div>

        <div>
          <label htmlFor="noInv" className={labelStyles}>No. Invoice (Inv)</label>
          <input type="text" id="noInv" value={noInv} onChange={(e) => setNoInv(e.target.value)} className={`mt-1 ${inputStyles}`} disabled={isSubmitting} />
        </div>

        <div>
          <label htmlFor="noPO" className={labelStyles}>No. PO (Opsional)</label>
          <input type="text" id="noPO" value={noPO} onChange={(e) => setNoPO(e.target.value)} className={`mt-1 ${inputStyles}`} disabled={isSubmitting} />
        </div>
        
        <div>
          <label htmlFor="noSJSby" className={labelStyles}>No. SJ SBY (Opsional)</label>
          <input type="text" id="noSJSby" value={noSJSby} onChange={(e) => setNoSJSby(e.target.value)} className={`mt-1 ${inputStyles}`} disabled={isSubmitting} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="item" className={labelStyles}>Barang</label>
          {isLoadingItems ? <p className="mt-1 text-sm text-[color:var(--foreground)] opacity-75">Loading items...</p> : (
            <select id="item" value={itemId} onChange={(e) => setItemId(e.target.value)} required className={`mt-1 ${inputStyles}`} disabled={isSubmitting || items.length === 0}>
              <option value="">Pilih Barang</option>
              {items.map((item) => (
                <option key={item._id as string} value={item._id as string}>{item.namaBarang} (Stok: {item.stokSaatIni?.toFixed(2) ?? 'N/A'})</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="berat" className={labelStyles}>Berat (kg)</label>
          <input type="number" id="berat" value={berat} onChange={(e) => setBerat(e.target.value)} required min="0.01" step="any" className={`mt-1 ${inputStyles}`} disabled={isSubmitting} />
        </div>

        <div>
          <label htmlFor="harga" className={labelStyles}>Harga per kg</label>
          <input type="number" id="harga" value={harga} onChange={(e) => setHarga(e.target.value)} required min="0" step="any" className={`mt-1 ${inputStyles}`} disabled={isSubmitting} />
        </div>
      </div>

      {error && (
          <p className="text-sm text-red-600">{error}</p>
      )}
      {successMessage && (
          <p className="text-sm text-green-500">{successMessage}</p>
      )}

      <div className="pt-4"> {/* Increased padding top for separation */}
        <button type="submit" disabled={isSubmitting || isLoadingItems} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out">
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isEditMode ? 'Menyimpan...' : 'Menambahkan...'}
            </>
          ) : (
            isEditMode ? 'Simpan Perubahan' : 'Tambah Transaksi'
          )}
        </button>
      </div>
    </form>
  );
}
