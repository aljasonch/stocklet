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

  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState<IItem[]>([]);
  const [isLoadingItemSearch, setIsLoadingItemSearch] = useState(false);
  const [showItemSearchResults, setShowItemSearchResults] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState<string>('');


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

  const fetchItemsForSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setItemSearchResults([]);
      setShowItemSearchResults(false);
      return;
    }
    setIsLoadingItemSearch(true);
    try {
      const response = await fetchWithAuth(`/api/items?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to search items');
      }
      const data = await response.json();
      setItemSearchResults(data.items || []);
      setShowItemSearchResults(true);
    } catch (err) {
      console.error("Item search error:", err);
      setItemSearchResults([]);
    } finally {
      setIsLoadingItemSearch(false);
    }
  };

  const debouncedFetchItems = debounce(fetchItemsForSearch, 300);

  const handleItemSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setItemSearchTerm(term);
    if (term) {
      debouncedFetchItems(term);
    } else {
      setItemSearchResults([]);
      setShowItemSearchResults(false);
    }
  };

  const handleSelectItem = (item: IItem) => {
    setItemId(item._id as string);
    setSelectedItemName(item.namaBarang);
    setItemSearchTerm(item.namaBarang); 
    setItemSearchResults([]);
    setShowItemSearchResults(false);
  };

  useEffect(() => {
    const loadInitialItemDetails = async () => {
      if (isEditMode && initialData?.item) {
        const currentItemId = getItemIdFromData(initialData.item);
        if (currentItemId) {
          if ((initialData.item as IItem)?.namaBarang) {
            setSelectedItemName((initialData.item as IItem).namaBarang);
            setItemSearchTerm((initialData.item as IItem).namaBarang); 
            setItemId(currentItemId);
            setIsLoadingItems(false);
          } else {
            setIsLoadingItems(true);
            try {
              const response = await fetchWithAuth(`/api/items/${currentItemId}`);
              if (!response.ok) throw new Error('Failed to fetch item details for editing.');
              const data = await response.json();
              if (data.item) {
                setSelectedItemName(data.item.namaBarang);
                setItemSearchTerm(data.item.namaBarang);
                setItemId(data.item._id);
              }
            } catch (err) {
              setError('Could not load item details for editing.');
              console.error(err);
            } finally {
              setIsLoadingItems(false);
            }
          }
        } else {
           setIsLoadingItems(false);
        }
      } else {
        setIsLoadingItems(false);
      }
    };
    loadInitialItemDetails();
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
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

        <div className="md:col-span-2 relative">
          <label htmlFor="itemSearch" className={labelStyles}>Barang</label>
          <input
            type="text"
            id="itemSearch"
            value={itemSearchTerm}
            onChange={handleItemSearchChange}
            onFocus={() => { if (itemSearchTerm && itemSearchResults.length > 0) setShowItemSearchResults(true);}}
            placeholder={isLoadingItems ? "Loading item..." : "Ketik untuk mencari barang..."}
            className={`mt-1 ${inputStyles}`}
            disabled={isSubmitting || isLoadingItems}
            required={!itemId} 
          />
          {isLoadingItemSearch && <p className="mt-1 text-xs text-[color:var(--foreground)] opacity-75">Mencari...</p>}
          
          {showItemSearchResults && itemSearchResults.length > 0 && (
            <ul className="absolute z-10 w-full bg-[color:var(--card-bg)] border border-[color:var(--border-color)] rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
              {itemSearchResults.map((item) => (
                <li
                  key={item._id as string}
                  onClick={() => handleSelectItem(item)}
                  className="px-3 py-2 hover:bg-[color:var(--background)] cursor-pointer text-sm text-[color:var(--foreground)]"
                >
                  {item.namaBarang} (Stok: {item.stokSaatIni?.toFixed(2) ?? 'N/A'})
                </li>
              ))}
            </ul>
          )}
           {itemId && selectedItemName && !showItemSearchResults && (
            <p className="mt-1 text-sm text-green-600">Terpilih: {selectedItemName}</p>
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

      <div className="pt-4">
        <button type="submit" disabled={isSubmitting || isLoadingItems} className="w-full cursor-pointer flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out">
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
