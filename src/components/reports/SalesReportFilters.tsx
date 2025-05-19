'use client';

import { IItem } from '@/models/Item';
import { useState, useEffect, FormEvent, ChangeEvent, useCallback } from 'react';

interface FilterState {
  view: 'monthly' | 'overall' | 'custom_range';
  year?: string;
  month?: string;
  customer?: string;
  itemId?: string;
  startDate?: string;
  endDate?: string;
  noSjType?: 'all' | 'noSJ' | 'noSJSby';
}

interface SalesReportFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  items: IItem[];
  isLoadingItems: boolean;
  customerLabel?: string; 
  title?: string; 
}

export default function SalesReportFilters({ 
  onFilterChange, 
  items, 
  isLoadingItems, 
  customerLabel = "Customer", 
  title = "Filter Laporan Penjualan" 
}: SalesReportFiltersProps) {
  const [view, setView] = useState<'monthly' | 'overall' | 'custom_range'>('overall');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(currentYear.toString());
  const [month, setMonth] = useState<string>(''); 
  const [customer, setCustomer] = useState('');
  const [itemId, setItemId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [noSjType, setNoSjType] = useState<'all' | 'noSJ' | 'noSJSby'>('all'); // State for No. SJ filter

  const handleApplyFilters = useCallback((event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    const filters: FilterState = { view, noSjType };
    if (view === 'monthly') {
      if (year && month) {
        filters.year = year;
        filters.month = month;
      } else if (year) { 
        filters.year = year;
      }
    } else if (view === 'custom_range') {
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
    } else if (view === 'overall') {
      if (year) { 
        filters.year = year;
      }
    }

    if (customer) filters.customer = customer;
    if (itemId) filters.itemId = itemId;
    // noSjType is already part of filters initialization
    
    onFilterChange(filters);
  }, [view, year, month, startDate, endDate, customer, itemId, noSjType, onFilterChange]);
  useEffect(() => {
    handleApplyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const formElementStyles = "appearance-none block cursor-pointer hover:bg-grey w-full px-3 py-2.5 border border-[color:var(--border-color)] rounded-md shadow-sm placeholder-[color:var(--foreground)] placeholder-opacity-50 sm:text-sm bg-[color:var(--card-bg)] text-[color:var(--foreground)] transition-all duration-150 ease-in-out";
  const labelStyles = "block text-sm font-medium text-[color:var(--foreground)] opacity-90 mb-1";

  return (
    <form onSubmit={handleApplyFilters} className="bg-[color:var(--card-bg)] p-6 sm:p-8 rounded-lg shadow-lg border border-[color:var(--border-color)] space-y-6">
      <h3 className="text-xl font-semibold leading-7 text-[color:var(--foreground)]">{title}</h3>

      <div>
        <label htmlFor="view" className={labelStyles}>Tampilan Laporan</label>
        <select 
          id="view" 
          value={view} 
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setView(e.target.value as FilterState['view'])} 
          className={formElementStyles}
        >
          <option value="overall">Keseluruhan (Default: Tahun Ini)</option>
          <option value="monthly">Per Bulan</option>
          <option value="custom_range">Rentang Tanggal Kustom</option>
        </select>
      </div>

      {view === 'monthly' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="year-monthly" className={labelStyles}>Tahun</label>
            <select id="year-monthly" value={year} onChange={(e) => setYear(e.target.value)} className={formElementStyles}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="month" className={labelStyles}>Bulan</label>
            <select id="month" value={month} onChange={(e) => setMonth(e.target.value)} className={formElementStyles}>
              <option value="">Semua Bulan</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(0, m-1).toLocaleString('id-ID', { month: 'long' })}</option>)}
            </select>
          </div>
        </div>
      )}
      
      {view === 'overall' && (
         <div>
            <label htmlFor="year-overall" className={labelStyles}>Tahun (Opsional, jika kosong tampil semua)</label>
            <select id="year-overall" value={year} onChange={(e) => setYear(e.target.value)} className={formElementStyles}>
              <option value="">Semua Tahun</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
      )}

      {view === 'custom_range' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startDate" className={labelStyles}>Tanggal Mulai</label>
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={formElementStyles} />
          </div>
          <div>
            <label htmlFor="endDate" className={labelStyles}>Tanggal Akhir</label>
            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={formElementStyles} />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="customer" className={labelStyles}>{customerLabel} (Nama)</label>
        <input type="text" id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder={`Kosongkan untuk semua ${customerLabel.toLowerCase()}`} className={formElementStyles} />
      </div>

      <div>
        <label htmlFor="item" className={labelStyles}>Barang</label>
        {isLoadingItems ? <p className="mt-1 text-sm text-[color:var(--foreground)] opacity-75">Loading items...</p> : (
          <select id="item" value={itemId} onChange={(e) => setItemId(e.target.value)} className={formElementStyles}>
            <option value="">Semua Barang</option>
            {items.map((item) => (
              <option key={item._id as string} value={item._id as string}>{item.namaBarang}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className={labelStyles}>Filter No. SJ</label>
        <div className="mt-2 flex flex-wrap gap-y-2 gap-x-4">
          {(['all', 'noSJ', 'noSJSby'] as const).map((type) => (
            <label key={type} className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                name="noSjType"
                value={type}
                checked={noSjType === type}
                onChange={(e) => setNoSjType(e.target.value as 'all' | 'noSJ' | 'noSJSby')}
                className="form-radio h-4 w-4 text-[color:var(--primary)] border-[color:var(--border-color)] focus:ring-[color:var(--primary)] transition duration-150 ease-in-out"
              />
              <span className="ml-2 text-sm text-[color:var(--foreground)] opacity-90">
                {type === 'all' ? 'Semua' : type === 'noSJ' ? 'No. SJ (Utama)' : 'No. SJ SBY'}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="pt-2">
        <button type="submit" className="w-full flex cursor-pointer justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out">
          Terapkan Filter
        </button>
      </div>
    </form>
  );
}
