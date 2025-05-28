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

  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [editNameError, setEditNameError] = useState<string | null>(null);

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
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-4 py-2 text-sm font-medium rounded-md bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-[color:var(--foreground)]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
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
      <div
        className={`bg-[color:var(--card-bg)] shadow-lg overflow-hidden sm:rounded-lg border border-[color:var(--border-color)] transition-opacity duration-500 ease-in-out ${
          isLoading && items.length === 0 ? "opacity-0" : "opacity-100"
        }`}
      >
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
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-auto flex space-x-3 items-center">
                  <Link href={`/items/${item._id}/details`}>
                    <span className="text-blue-600 cursor-pointer hover:text-blue-700 font-medium transition-colors duration-150 mr-3">
                      Detail
                    </span>
                  </Link>
                  <button
                    onClick={() => {
                      setEditingItemId(item._id as string);
                      setEditingItemName(item.namaBarang);
                      setNewItemName(item.namaBarang);
                      setEditNameError(null);
                      setIsEditNameModalOpen(true);
                    }}
                    className="text-yellow-600 cursor-pointer hover:text-yellow-700 font-medium transition-colors duration-150 mr-3"
                  >
                    Edit Nama
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          `Apakah Anda yakin ingin menghapus barang "${item.namaBarang}"? Ini tidak dapat diurungkan.`
                        )
                      ) {
                        try {
                          const response = await fetchWithAuth(
                            `/api/items/${item._id}`,
                            { method: "DELETE" }
                          );
                          if (!response.ok) {
                            const data = await response.json();
                            throw new Error(
                              data.message || "Gagal menghapus barang."
                            );
                          }
                          setItems((prev) =>
                            prev.filter((i) => i._id !== item._id)
                          );
                          alert("Barang berhasil dihapus.");
                        } catch (err: unknown) {
                          alert(
                            `Error: ${
                              err instanceof Error
                                ? err.message
                                : "An unknown error occurred."
                            }`
                          );
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
                      setAdjustmentType("add");
                      setAdjustmentValue("");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
            onClick={() => setIsStockModalOpen(false)}>
          <div
            className="bg-[color:var(--card-bg)] rounded-2xl shadow-2xl border border-[color:var(--border-color)] w-full max-w-lg mx-4 overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[color:var(--border-color)] bg-[color:var(--surface)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2  bg-opacity-10 rounded-lg">
                    <svg
                      className="w-6 h-6 text-[color:var(--primary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
                      Sesuaikan Stok
                    </h3>
                    <p className="text-sm text-[color:var(--muted)] mt-1">
                      {currentItemForModal.namaBarang}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsStockModalOpen(false);
                    setAdjustingItemId(null);
                    setCurrentItemForModal(null);
                    setAdjustmentValue("");
                    setAdjustmentError(null);
                  }}
                  className="p-2 hover:bg-[color:var(--surface)] rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-[color:var(--muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-6 space-y-6">
              <div className="p-4 bg-[color:var(--surface)] rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[color:var(--muted)]">
                    Stok Saat Ini
                  </span>
                  <span className="text-lg font-semibold text-[color:var(--foreground)]">
                    {currentItemForModal.stokSaatIni?.toFixed(0) ?? "0"} kg
                  </span>
                </div>
              </div>

              {adjustmentError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <p className="text-sm text-red-700">{adjustmentError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-[color:var(--foreground)] block mb-3">
                  Tipe Penyesuaian
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["add", "subtract", "set"] as const).map((type) => (
                    <label
                      key={type}
                      className={`
                      relative flex items-center justify-center p-4 cursor-pointer rounded-xl border-2 transition-all
                      ${
                        adjustmentType === type
                          ? "border-[color:var(--primary)] bg-[color:var(--primary)] bg-opacity-10 text-white"
                          : "border-[color:var(--border-color)] hover:border-[color:var(--primary)] hover:bg-[color:var(--surface)]"
                      }
                    `}
                    >
                      <input
                        type="radio"
                        name={`adjustmentType-${currentItemForModal._id}`}
                        value={type}
                        checked={adjustmentType === type}
                        onChange={() => {
                          setAdjustmentType(type);
                          setAdjustmentError(null);
                        }}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-lg mb-1">
                          {type === "add"
                            ? "➕"
                            : type === "subtract"
                            ? "➖"
                            : "🎯"}
                        </div>
                        <span className="text-sm font-medium">
                          {type === "add"
                            ? "Tambah"
                            : type === "subtract"
                            ? "Kurang"
                            : "Atur"}
                        </span>
                      </div>
                      {adjustmentType === type && (
                        <div className="absolute top-2 right-2">
                          <svg
                            className="w-4 h-4 text-[color:var(--primary)]"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label
                  htmlFor="adjustmentValue"
                  className="text-sm font-medium text-[color:var(--foreground)] block mb-2"
                >
                  {adjustmentType === "set"
                    ? "Atur ke Jumlah"
                    : adjustmentType === "add"
                    ? "Jumlah yang Ditambah"
                    : "Jumlah yang Dikurang"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="adjustmentValue"
                    placeholder="Masukkan jumlah"
                    value={adjustmentValue}
                    onChange={(e) => {
                      setAdjustmentValue(e.target.value);
                      setAdjustmentError(null);
                    }}
                    className="form-input w-full pl-4 pr-12 py-3 text-[color:var(--foreground)] bg-[color:var(--card-bg)] border border-[color:var(--border-color)] rounded-xl shadow-sm focus:ring-2 focus:ring-[color:var(--primary)] focus:border-[color:var(--primary)] transition-all"
                    step="any"
                    min={adjustmentType === "set" ? "0" : "0.01"}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <span className="text-sm text-[color:var(--muted)]">
                      kg
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[color:var(--surface)] border-t border-[color:var(--border-color)]">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsStockModalOpen(false);
                    setAdjustingItemId(null);
                    setCurrentItemForModal(null);
                    setAdjustmentValue("");
                    setAdjustmentError(null);
                  }}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl border border-[color:var(--border-color)] text-[color:var(--foreground)] hover:bg-[color:var(--card-bg)] transition-colors"
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
                    if (adjustmentType !== "set" && value <= 0) {
                      setAdjustmentError(
                        "Jumlah untuk 'Tambah' atau 'Kurang' harus lebih besar dari 0."
                      );
                      return;
                    }
                    if (adjustmentType === "set" && value < 0) {
                      setAdjustmentError(
                        "Jumlah untuk 'Atur' tidak boleh negatif."
                      );
                      return;
                    }

                    try {
                      const response = await fetchWithAuth(
                        `/api/items/${adjustingItemId}/adjust-stock`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            adjustment: value,
                            type: adjustmentType,
                          }),
                        }
                      );
                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(
                          data.message || "Gagal menyesuaikan stok."
                        );
                      }
                      const updatedItemData = await response.json();
                      setItems((prev) =>
                        prev.map((i) =>
                          i._id === adjustingItemId ? updatedItemData.item : i
                        )
                      );
                      setIsStockModalOpen(false);
                      setAdjustingItemId(null);
                      setCurrentItemForModal(null);
                      setAdjustmentValue("");
                      alert("Stok berhasil disesuaikan.");
                    } catch (err: unknown) {
                      const errorMessage =
                        err instanceof Error
                          ? err.message
                          : "An unknown error occurred.";
                      setAdjustmentError(errorMessage);
                    }
                  }}
                  className="btn-primary px-5 py-2.5 text-sm font-medium rounded-xl"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>{" "}
          </div>
        </div>
      )}
      {isEditNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
            onClick={() => setIsEditNameModalOpen(false)}>
          <div
            className="bg-[color:var(--card-bg)] rounded-2xl shadow-2xl border border-[color:var(--border-color)] w-full max-w-md mx-4 overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[color:var(--border-color)] bg-[color:var(--surface)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-opacity-10 rounded-lg">
                    <svg
                      className="w-6 h-6 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
                      Edit Nama Barang
                    </h3>
                    <p className="text-sm text-[color:var(--muted)] mt-1">
                      Ubah nama barang
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditNameModalOpen(false);
                    setEditingItemId(null);
                    setEditingItemName("");
                    setNewItemName("");
                    setEditNameError(null);
                  }}
                  className="p-2 hover:bg-[color:var(--surface)] rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-[color:var(--muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-6 space-y-6">
              {/* Current Name Info */}
              <div className="p-4 bg-[color:var(--surface)] rounded-xl">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-[color:var(--muted)]">
                    Nama Saat Ini
                  </span>
                  <span className="text-lg font-semibold text-[color:var(--foreground)]">
                    {editingItemName}
                  </span>
                </div>
              </div>

              {editNameError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <p className="text-sm text-red-700">{editNameError}</p>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="newItemName"
                  className="text-sm font-medium text-[color:var(--foreground)] block mb-2"
                >
                  Nama Baru
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="newItemName"
                    placeholder="Masukkan nama baru"
                    value={newItemName}
                    onChange={(e) => {
                      setNewItemName(e.target.value);
                      setEditNameError(null);
                    }}
                    className="form-input w-full pl-4 pr-4 py-3 text-[color:var(--foreground)] bg-[color:var(--card-bg)] border border-[color:var(--border-color)] rounded-xl shadow-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[color:var(--surface)] border-t border-[color:var(--border-color)]">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsEditNameModalOpen(false);
                    setEditingItemId(null);
                    setEditingItemName("");
                    setNewItemName("");
                    setEditNameError(null);
                  }}
                  className="px-5 py-2.5 text-sm cursor-pointer font-medium rounded-xl border border-[color:var(--border-color)] text-[color:var(--foreground)] hover:bg-[color:var(--card-bg)] transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    if (!editingItemId) return;
                    setEditNameError(null);

                    const trimmedName = newItemName.trim();
                    if (!trimmedName) {
                      setEditNameError("Nama barang tidak boleh kosong.");
                      return;
                    }
                    if (trimmedName === editingItemName) {
                      setEditNameError(
                        "Nama baru harus berbeda dari nama saat ini."
                      );
                      return;
                    }

                    try {
                      const response = await fetchWithAuth(
                        `/api/items/${editingItemId}`,
                        {
                          method: "PUT",
                          body: JSON.stringify({ namaBarang: trimmedName }),
                        }
                      );
                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(
                          data.message || "Gagal mengubah nama barang."
                        );
                      }
                      const updatedItemData = await response.json();
                      setItems((prev) =>
                        prev.map((i) =>
                          i._id === editingItemId
                            ? { ...i, ...updatedItemData.item }
                            : i
                        )
                      );
                      setIsEditNameModalOpen(false);
                      setEditingItemId(null);
                      setEditingItemName("");
                      setNewItemName("");
                      alert("Nama barang berhasil diubah.");
                    } catch (err: unknown) {
                      const errorMessage =
                        err instanceof Error
                          ? err.message
                          : "An unknown error occurred.";
                      setEditNameError(errorMessage);
                    }
                  }}
                  className="px-5 py-2.5 text-sm cursor-pointer font-medium rounded-xl bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {totalPages > 0 && (
        <div className="mt-6 flex justify-center items-center space-x-3">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-4 py-2 text-sm cursor-pointer font-medium rounded-md bg-[color:var(--btn-bg)] hover:bg-[color:var(--btn-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-[color:var(--foreground)]">
            Page {currentPage} of {totalPages} (Total: {totalItems})
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
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
