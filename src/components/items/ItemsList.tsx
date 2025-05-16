'use client';

import { IItem } from '@/models/Item';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import Link from 'next/link'; // Added Link

interface ItemsListProps {
  initialItems?: IItem[]; 
  refreshKey?: number; 
}

export default function ItemsList({ initialItems: initialItemsProp, refreshKey }: ItemsListProps) { // Renamed initialItems to initialItemsProp to avoid conflict
  const [items, setItems] = useState<IItem[]>(initialItemsProp || []);
  const [isLoading, setIsLoading] = useState(!initialItemsProp);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10; // Or make this configurable

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
    // If initialItemsProp are provided (e.g., from SSR/SSG), use them for the first page.
    // Otherwise, or if refreshKey changes, fetch the current page.
    if (initialItemsProp && initialItemsProp.length > 0 && currentPage === 1 && (refreshKey === undefined || refreshKey === 0)) {
        // This logic might need refinement if initialItemsProp represents a specific page other than 1
        // For now, assume initialItemsProp is for page 1 if provided.
        // If API returns pagination data with initialItemsProp, that would be better.
        // For simplicity, we'll just fetch if refreshKey is used or if not on page 1.
        setIsLoading(false); // Assume initialItemsProp are loaded
        // Potentially set totalPages if initialItemsProp came with pagination info
    } else {
        fetchItems(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, refreshKey]); // Removed initialItemsProp, items.length from deps to control fetch via currentPage & refreshKey

  // Effect to reset to page 1 when refreshKey changes significantly (e.g., after adding an item)
  useEffect(() => {
    if (refreshKey && refreshKey > 0) { // Assuming refreshKey increments
        setCurrentPage(1); // This will trigger the fetchItems effect for page 1
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
        {/* Still show pagination if on a page > 1 and no items, allowing to go back */}
        {totalPages > 1 && !isLoading && (
          <div className="mt-6 flex justify-center items-center space-x-3">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-4 py-2 text-sm font-medium rounded-md border border-[color:var(--border-color)] bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-[color:var(--foreground)]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="px-4 py-2 text-sm font-medium rounded-md border border-[color:var(--border-color)] bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Stok: {item.stokSaatIni?.toFixed(2) ?? 'N/A'}
                </p>
              </div>
            </div>
            <div className="mt-2.5 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-[color:var(--foreground)] opacity-75">
                  Stok Awal: {item.stokAwal?.toFixed(2) ?? 'N/A'}
                </p>
                <p className="flex items-center text-sm text-[color:var(--foreground)] opacity-75 sm:ml-4">
                  Masuk: {item.totalMasuk?.toFixed(2) ?? '0.00'}
                </p>
                <p className="flex items-center text-sm text-[color:var(--foreground)] opacity-75 sm:ml-4">
                  Keluar: {item.totalKeluar?.toFixed(2) ?? '0.00'}
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
                    } else if (newName !== null) { // Only show alert if prompt was not cancelled
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
                  onClick={async () => {
                    const type = window.prompt("Masukkan tipe penyesuaian: 'set', 'add', atau 'subtract'", "add");
                    if (!type || !['set', 'add', 'subtract'].includes(type.toLowerCase())) {
                      if (type !== null) alert("Tipe penyesuaian tidak valid.");
                      return;
                    }
                    const adjustmentStr = window.prompt(`Masukkan jumlah untuk ${type.toLowerCase()} stok (angka):`);
                    if (adjustmentStr === null) return; 
                    const adjustment = parseFloat(adjustmentStr);
                    if (isNaN(adjustment)) {
                      alert("Jumlah penyesuaian harus berupa angka.");
                      return;
                    }

                    try {
                      const response = await fetchWithAuth(`/api/items/${item._id}/adjust-stock`, {
                        method: 'POST',
                        body: JSON.stringify({ adjustment, type: type.toLowerCase() }),
                      });
                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.message || 'Gagal menyesuaikan stok.');
                      }
                      const updatedItemData = await response.json();
                      setItems(prev => prev.map(i => i._id === item._id ? updatedItemData.item : i));
                      alert('Stok berhasil disesuaikan.');
                    } catch (err: unknown) {
                      alert(`Error: ${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
                    }
                  }}
                  className="text-[color:var(--primary)] cursor-pointer hover:opacity-75 font-medium transition-colors duration-150"
                >
                  Adjust Stok
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>

    {totalPages > 0 && (
      <div className="mt-6 flex justify-center items-center space-x-3">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1 || isLoading}
          className="px-4 py-2 text-sm font-medium rounded-md border border-[color:var(--border-color)] bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-[color:var(--foreground)]">
          Page {currentPage} of {totalPages} (Total: {totalItems})
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages || isLoading}
          className="px-4 py-2 text-sm font-medium rounded-md border border-[color:var(--border-color)] bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    )}
    </>
  );
}
