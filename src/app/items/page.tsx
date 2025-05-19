'use client'; 

import ItemForm from '@/components/items/ItemForm';
import ItemsList from '@/components/items/ItemsList';
import { useState } from 'react';

export default function ItemsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleItemAdded = () => {
    setRefreshKey(prevKey => prevKey + 1); 
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manajemen Stok Barang</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <ItemForm onItemAdded={handleItemAdded} />
        </div>
        <div className="md:col-span-2">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Daftar Barang</h2>
          <ItemsList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
