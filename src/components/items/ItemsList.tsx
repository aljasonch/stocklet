'use client';

import { IItem } from '@/models/Item';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import Link from 'next/link'; 

interface ItemsListProps {
  initialItems?: IItem[]; 
  refreshKey?: number; 
}

export default function ItemsList({ initialItems: initialItemsProp, refreshKey }: ItemsListProps) {
  const [items, setItems] = useState<IItem[]>(initialItemsProp || []);
  const [isLoading, setIsLoading] = useState(!initialItemsProp);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 6; 

  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [currentItemForModal, setCurrentItemForModal] = useState<IItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'set' | 'add' | 'subtract'>('add');
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);


  const fetchItems = async (pageToFetch: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/items?page=${pageToFetch}&limit=${itemsPerPage}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch items');
      }
      const data = await response.json();
      setItems(data.items || []);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialItemsProp && initialItemsProp.length > 0 && currentPage === 1 && (refreshKey === undefined || refreshKey === 0)) {
        setIsLoading(false);
    } else {
        fetchItems(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, refreshKey]);

  useEffect(() => {
    if (refreshKey && refreshKey > 0) { 
        setCurrentPage(1);
    }
  }, [refreshKey]);

  const themedTextMuted = "text-center text-[color:var(--foreground)] opacity-75";
  const themedTextError = "text-center text-red-600";

  if (isLoading) {
    return <p className={themedTextMuted}>Loading items...</p>;
  }

  if (error) {
    return <div className="p-4 my-4 bg-opacity-10 rounded-md">
      <p className={themedTextError}>Error: {error}</p>
    </div>;
  }

  if (items.length === 0) {
    return (
      <>
        <p className={themedTextMuted}>No items found.</p>
        {totalPages > 1 && !isLoading && (
          <div className="mt-6 flex justify-center items-center space-x-3">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-4 py-2 text-sm font-medium rounded-md bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-[color:var(--foreground)]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="px-4 py-2 text-sm font-medium rounded-md bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className={`bg-[color:var(--card-bg)] shadow-lg overflow-hidden sm:rounded-lg border border-[color:var(--border-color)] transition-opacity duration-500 ease-in-out ${isLoading && items.length === 0 ? 'opacity-0' : 'opacity-100'}`}>
        <ul role="list" className="divide-y divide-[color:var(--border-color)]">
          {items.map((item) => (
            <li
            key={item._id as string}
            className="px-4 py-5 sm:px-6  transition-colors duration-150 ease-in-out"
          >
            <div className="flex items-center justify-between">
              <p className="text-md font-semibold text-[color:var(--primary)] truncate">
                {item.namaBarang}
              </p>
              <div className="ml-2 flex-shrink-0 flex">
                <p className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Stok: {item.stokSaatIni?.toFixed(0) ?? 'N/A'}
                </p>
              </div>
            </div>
            <div className="mt-2.5 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-[color:var(--foreground)] opacity-75">
                  Stok: {item.stokSaatIni?.toFixed(0) ?? 'N/A'}
                </p>
                <p className="flex items-center text-sm text-[color:var(--foreground)] opacity-75 sm:ml-4">
                  Masuk: {item.totalMasuk?.toFixed(0) ?? '0'}
                </p>
                <p className="flex items-center text-sm text-[color:var(--foreground)] opacity-75 sm:ml-4">
                  Keluar: {item.totalKeluar?.toFixed(0) ?? '0'}
                </p>
              </div>
              <div className="mt-2 flex items-center text-sm text-[color:var(--foreground)] opacity-75 sm:mt-0 sm:ml-4">
                <p>
                  Ditambahkan:{' '}
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="mt-3 sm:mt-0 sm:ml-auto flex space-x-3 items-center">
                <Link href={`/items/${item._id}/details`}>
                  <span className="text-blue-600 cursor-pointer hover:text-blue-700 font-medium transition-colors duration-150 mr-3">
                    Detail
                  </span>
                </Link>
                <button
                  onClick={async () => {
                    const newName = window.prompt(`Masukkan nama baru untuk "${item.namaBarang}":`, item.namaBarang);
                    if (newName && newName.trim() !== '' && newName.trim() !== item.namaBarang) {
                      try {
                        const response = await fetchWithAuth(`/api/items/${item._id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ namaBarang: newName.trim() }),
                        });
                        if (!response.ok) {
                          const data = await response.json();
                          throw new Error(data.message || 'Gagal mengubah nama barang.');
                        }
                        const updatedItemData = await response.json();
                        setItems(prev => prev.map(i => (i._id === item._id ? { ...i, ...updatedItemData.item } : i)));
                        alert('Nama barang berhasil diubah.');
                      } catch (err: unknown) {
                        alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
                      }
                    } else if (newName !== null) { 
                        alert("Nama baru tidak valid atau sama dengan nama lama.");
                    }
                  }}
                  className="text-yellow-600 cursor-pointer hover:text-yellow-700 font-medium transition-colors duration-150 mr-3"
                >
                  Edit Nama
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm(`Apakah Anda yakin ingin menghapus barang "${item.namaBarang}"? Ini tidak dapat diurungkan.`)) {
                      try {
                        const response = await fetchWithAuth(`/api/items/${item._id}`, { method: 'DELETE' });
                        if (!response.ok) {
                          const data = await response.json();
                          throw new Error(data.message || 'Gagal menghapus barang.');
                        }
                        setItems(prev => prev.filter(i => i._id !== item._id));
                        alert('Barang berhasil dihapus.');
                      } catch (err: unknown) {
                        alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
                      }
                    }
                  }}
                  className="text-red-600 cursor-pointer hover:text-red-700 font-medium transition-colors duration-150"
                >
                  Hapus
                </button>
                <button
                  onClick={() => {
                    setAdjustingItemId(item._id as string);
                    setCurrentItemForModal(item);
                    setAdjustmentType('add');
                    setAdjustmentValue('');
                    setAdjustmentError(null);
                    setIsStockModalOpen(true);
                  }}
                  className="text-[color:var(--primary)] cursor-pointer hover:opacity-75 font-medium transition-colors duration-150"
                >
                  Sesuaikan Stok
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>

    {isStockModalOpen && currentItemForModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-[color:var(--card-bg)] p-6 rounded-lg shadow-xl border border-[color:var(--border-color)] w-full max-w-md">
          <h3 className="text-lg font-semibold text-[color:var(--foreground)] mb-4">
            Sesuaikan Stok: {currentItemForModal.namaBarang}
          </h3>
          {adjustmentError && <p className="text-sm text-red-500 mb-3">{adjustmentError}</p>}
          
          <div className="mb-4">
            <span className="text-sm font-medium text-[color:var(--foreground)] opacity-90 block mb-2">Tipe Penyesuaian:</span>
            <div className="flex items-center space-x-4">
              {(['add', 'subtract', 'set'] as const).map((type) => (
                <label key={type} className="flex items-center space-x-1.5 text-sm text-[color:var(--foreground)] cursor-pointer">
                  <input
                    type="radio"
                    name={`adjustmentType-${currentItemForModal._id}`}
                    value={type}
                    checked={adjustmentType === type}
                    onChange={() => {
                      setAdjustmentType(type);
                      setAdjustmentError(null);
                    }}
                    className="form-radio h-4 w-4 text-[color:var(--primary)] border-[color:var(--border-color)] focus:ring-2 focus:ring-[color:var(--primary-focus)]"
                  />
                  <span>{type === 'add' ? 'Tambah' : type === 'subtract' ? 'Kurang' : 'Atur'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="adjustmentValue" className="text-sm font-medium text-[color:var(--foreground)] opacity-90 block mb-2">
              Jumlah:
            </label>
            <input
              type="number"
              id="adjustmentValue"
              placeholder="Masukkan jumlah"
              value={adjustmentValue}
              onChange={(e) => {
                setAdjustmentValue(e.target.value);
                setAdjustmentError(null);
              }}
              className="w-full px-3 py-2 border border-[color:var(--border-color)] rounded-md text-sm focus:ring-1 focus:ring-[color:var(--primary)] focus:border-[color:var(--primary)] bg-[color:var(--input-bg)] text-[color:var(--foreground)] placeholder-[color:var(--placeholder-text)]"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsStockModalOpen(false);
                setAdjustingItemId(null);
                setCurrentItemForModal(null);
                setAdjustmentValue('');
                setAdjustmentError(null);
              }}
              className="px-4 py-2 text-sm font-medium rounded-md border border-[color:var(--border-color)] bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] text-[color:var(--foreground)] transition-colors"
            >
              Batal
            </button>
            <button
              onClick={async () => {
                if (!adjustingItemId) return;
                setAdjustmentError(null);
                const value = parseFloat(adjustmentValue);
                if (isNaN(value)) {
                  setAdjustmentError("Jumlah harus berupa angka.");
                  return;
                }
                if (adjustmentType !== 'set' && value <= 0) {
                  setAdjustmentError("Jumlah untuk 'Tambah' atau 'Kurang' harus lebih besar dari 0.");
                  return;
                }
                if (adjustmentType === 'set' && value < 0) {
                  setAdjustmentError("Jumlah untuk 'Atur' tidak boleh negatif.");
                  return;
                }

                try {
                  const response = await fetchWithAuth(`/api/items/${adjustingItemId}/adjust-stock`, {
                    method: 'POST',
                    body: JSON.stringify({ adjustment: value, type: adjustmentType }),
                  });
                  if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Gagal menyesuaikan stok.');
                  }
                  const updatedItemData = await response.json();
                  setItems(prev => prev.map(i => (i._id === adjustingItemId ? updatedItemData.item : i)));
                  setIsStockModalOpen(false);
                  setAdjustingItemId(null);
                  setCurrentItemForModal(null);
                  setAdjustmentValue('');
                  alert('Stok berhasil disesuaikan.');
                } catch (err: unknown) {
                  const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                  setAdjustmentError(errorMessage);
                }
              }}
              className="px-4 py-2 text-sm font-medium rounded-md bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary-hover)] transition-colors"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    )}

    {totalPages > 0 && (
      <div className="mt-6 flex justify-center items-center space-x-3">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1 || isLoading}
          className="px-4 py-2 text-sm cursor-pointer font-medium rounded-md bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-[color:var(--foreground)]">
          Page {currentPage} of {totalPages} (Total: {totalItems})
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages || isLoading}
          className="px-4 py-2 text-sm cursor-pointer font-medium rounded-md bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    )}
    </>
  );
}
