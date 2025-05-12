'use client';

import SalesReportFilters from '@/components/reports/SalesReportFilters';
import SalesReportTable from '@/components/reports/SalesReportTable';
import { ITransaction } from '@/models/Transaction';
import { IItem } from '@/models/Item';
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth'; // Import fetchWithAuth

export default function SalesReportPage() {
  const [reportData, setReportData] = useState<ITransaction[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const [items, setItems] = useState<IItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Fetch items for the filter dropdown
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoadingItems(true);
      setItemsError(null);
      try {
        const response = await fetchWithAuth('/api/items'); // Use fetchWithAuth
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch items for filters');
        }
        const data = await response.json();
        setItems(data.items || []);
      } catch (err: any) {
        setItemsError(err.message);
      } finally {
        setIsLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  // Fetch report data based on filters
  const fetchReportData = useCallback(async (currentFilters: any) => {
    setIsLoadingReport(true);
    setReportError(null);
    
    const queryParams = new URLSearchParams();
    if (currentFilters.view) queryParams.append('view', currentFilters.view);
    if (currentFilters.year) queryParams.append('year', currentFilters.year);
    if (currentFilters.month) queryParams.append('month', currentFilters.month);
    if (currentFilters.customer) queryParams.append('customer', currentFilters.customer);
    if (currentFilters.itemId) queryParams.append('itemId', currentFilters.itemId);
    if (currentFilters.startDate) queryParams.append('startDate', currentFilters.startDate);
    if (currentFilters.endDate) queryParams.append('endDate', currentFilters.endDate);

    try {
      const response = await fetchWithAuth(`/api/reports/sales?${queryParams.toString()}`); // Use fetchWithAuth
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch sales report');
      }
      const data = await response.json();
      setReportData(data.salesReport || []);
    } catch (err: any) {
      setReportError(err.message);
      setReportData([]);
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  // Effect to fetch data when filters change
  useEffect(() => {
    // Only fetch if filters object is not empty (i.e., initial filters are set)
    if (Object.keys(filters).length > 0) {
        fetchReportData(filters);
    }
  }, [filters, fetchReportData]);


  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleExport = async () => {
    const queryParams = new URLSearchParams();
    if (filters.view) queryParams.append('view', filters.view);
    if (filters.year) queryParams.append('year', filters.year);
    if (filters.month) queryParams.append('month', filters.month);
    if (filters.customer) queryParams.append('customer', filters.customer);
    if (filters.itemId) queryParams.append('itemId', filters.itemId);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);

    // Trigger file download
    window.location.href = `/api/export/sales?${queryParams.toString()}`;
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
        <h1 className="text-3xl font-bold text-gray-900">Laporan Penjualan</h1>
        <button
          onClick={handleExport}
          disabled={isLoadingReport || reportData.length === 0}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors duration-150 ease-in-out"
        >
          Ekspor ke Excel
        </button>
      </header>

      <div className="mb-6">
        {itemsError && <p className="text-red-500">Error loading items for filter: {itemsError}</p>}
        <SalesReportFilters 
            onFilterChange={handleFilterChange} 
            items={items} 
            isLoadingItems={isLoadingItems} 
        />
      </div>

      <div>
        <SalesReportTable 
            reportData={reportData} 
            isLoading={isLoadingReport} 
            error={reportError} 
        />
      </div>
    </div>
  );
}
