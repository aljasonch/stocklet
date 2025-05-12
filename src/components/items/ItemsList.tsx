'use client';

import { IItem } from '@/models/Item';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface ItemsListProps {
  initialItems?: IItem[]; 
  refreshKey?: number; 
}

export default function ItemsList({ initialItems, refreshKey }: ItemsListProps) {
  const [items, setItems] = useState<IItem[]>(initialItems || []);
  const [isLoading, setIsLoading] = useState(!initialItems);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth('/api/items');
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch items');
        }
        const data = await response.json();
        setItems(data.items || []);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (initialItems && items.length > 0 && (refreshKey === undefined || refreshKey === 0) ) {
      if(initialItems.length === 0) fetchItems();
      else setIsLoading(false);
    } else {
      fetchItems();
    }
  }, [refreshKey, initialItems]);

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
    return <p className={themedTextMuted}>No items found.</p>;
  }

  return (
    <div className={`mt-6 bg-[color:var(--card-bg)] shadow-lg overflow-hidden sm:rounded-lg border border-[color:var(--border-color)] transition-opacity duration-500 ease-in-out ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
      <ul role="list" className="divide-y divide-[color:var(--border-color)]">
        {items.map((item, index) => (
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
                  Stok Awal: {item.stokAwal}
                </p>
              </div>
              <div className="mt-2 flex items-center text-sm text-[color:var(--foreground)] opacity-75 sm:mt-0 sm:ml-4">
                <p>
                  Ditambahkan:{' '}
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="mt-3 sm:mt-0 sm:ml-auto flex space-x-3 items-center">
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
                      } catch (err: any) {
                        alert(`Error: ${err.message}`);
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
                    } catch (err: any) {
                      alert(`Error: ${err.message}`);
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
  );
}
