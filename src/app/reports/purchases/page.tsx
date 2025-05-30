'use client';

import SalesReportFilters from '@/components/reports/SalesReportFilters';
import SalesReportTable from '@/components/reports/SalesReportTable';
import { ITransaction } from '@/models/Transaction';
import { IItem } from '@/models/Item';
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface FilterState {
  view?: string;
  year?: string;
  month?: string;
  supplier?: string; 
  itemId?: string;
  startDate?: string;
  endDate?: string;
}

interface IncomingFiltersFromSalesReport {
  view?: string;
  year?: string;
  month?: string;
  customer?: string; 
  itemId?: string;
  startDate?: string;
  endDate?: string;
}

export default function PurchaseReportPage() {
  const [reportData, setReportData] = useState<ITransaction[]>([]);
  const [filters, setFilters] = useState<FilterState>({}); 
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const [items, setItems] = useState<IItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);  useEffect(() => {
    const fetchItems = async () => {
      setIsLoadingItems(true);
      setItemsError(null);
      try {
        // Fetch all items for the filter dropdown
        const response = await fetchWithAuth('/api/items?fetchAll=true');
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch items for filters');
        }
        const data = await response.json();
        setItems(data.items || []);
      } catch (err: unknown) {
        setItemsError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  const fetchReportData = useCallback(async (currentFilters: FilterState) => {
    setIsLoadingReport(true);
    setReportError(null);

    const queryParams = new URLSearchParams();
    if (currentFilters.view) queryParams.append('view', currentFilters.view);
    if (currentFilters.year) queryParams.append('year', currentFilters.year);
    if (currentFilters.month) queryParams.append('month', currentFilters.month);
    if (currentFilters.supplier) queryParams.append('supplier', currentFilters.supplier);
    if (currentFilters.itemId) queryParams.append('itemId', currentFilters.itemId);
    if (currentFilters.startDate) queryParams.append('startDate', currentFilters.startDate);
    if (currentFilters.endDate) queryParams.append('endDate', currentFilters.endDate);

    try {
      const response = await fetchWithAuth(`/api/reports/purchases?${queryParams.toString()}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch purchase report');
      }
      const data = await response.json();
      setReportData(data.purchaseReport || []);
    } catch (err: unknown) {
      setReportError(err instanceof Error ? err.message : 'An unknown error occurred');
      setReportData([]);
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  useEffect(() => {
     fetchReportData(filters);
  }, [filters, fetchReportData]);


  const handleFilterChange = useCallback((newFiltersFromComponent: IncomingFiltersFromSalesReport) => {
    const mappedFilters: FilterState = { 
      view: newFiltersFromComponent.view,
      year: newFiltersFromComponent.year,
      month: newFiltersFromComponent.month,
      itemId: newFiltersFromComponent.itemId,
      startDate: newFiltersFromComponent.startDate,
      endDate: newFiltersFromComponent.endDate,
    };
    if (newFiltersFromComponent.customer) {
        mappedFilters.supplier = newFiltersFromComponent.customer;
    }
    setFilters(mappedFilters);
  }, []);
  
  const handleExport = async () => {
    const queryParams = new URLSearchParams();
    if (filters.view) queryParams.append('view', filters.view);
    if (filters.year) queryParams.append('year', filters.year);
    if (filters.month) queryParams.append('month', filters.month);
    if (filters.supplier) queryParams.append('supplier', filters.supplier);
    if (filters.itemId) queryParams.append('itemId', filters.itemId);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    window.location.href = `/api/export/purchases?${queryParams.toString()}`;
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
        <h1 className="text-3xl font-bold text-[color:var(--foreground)]">Laporan Pembelian</h1>
        <button
          onClick={handleExport}
          disabled={isLoadingReport || reportData.length === 0}
          className="px-4 py-2 cursor-pointer border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors duration-150 ease-in-out"
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
            customerLabel="Supplier"
            title="Filter Laporan Pembelian"
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
