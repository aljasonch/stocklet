'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; 

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  const cardClasses = "group block p-6 bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-2xl hover:border-indigo-500 transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col";
  const cardTitleClasses = "mb-2 text-2xl font-bold tracking-tight text-[color:var(--primary)] group-hover:text-indigo-800 transition-colors";
  const cardTextClasses = "font-normal text-gray-600 group-hover:text-gray-700 transition-colors flex-grow";

  const commonLinks = [
    { href: "/items", title: "Stok", text: "Kelola daftar barang dan pantau stok terkini." },
    { href: "/transactions", title: "Transaksi", text: "Catat semua transaksi penjualan dan pembelian." },
    { href: "/reports/sales", title: "Laporan", text: "Analisis data penjualan dengan filter lengkap." }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-7xl mb-8">
          <span className="block text-[color:var(--primary)]">Stocklet</span>
        </h1>
        <p className="mt-4 text-xl leading-relaxed text-gray-700 mb-12">
          Aplikasi untuk mengelola stok, mencatat transaksi, dan membuat laporan bisnis secara mudah dan praktis.
        </p>

        {isLoading ? (
          <div className="text-center">
            <p className="text-xl text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {isAuthenticated ? (
              <div className="flex flex-col md:flex-row justify-center items-stretch gap-8 max-w-4xl mx-auto">
                {commonLinks.map(link => (
                  <div key={link.href} className="w-full md:w-1/3 flex"> 
                    <Link href={link.href} className="block h-full w-full"> 
                      <div className={cardClasses}>
                        <h5 className={cardTitleClasses}>{link.title}</h5>
                        <p className={cardTextClasses}>{link.text}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                <Link href="/login">
                  <div className={cardClasses}>
                    <h5 className={cardTitleClasses}>Login</h5>
                    <p className={cardTextClasses}>Login untuk mulai mengelola bisnis kamu.</p>
                  </div>
                </Link>
                {commonLinks.map(link => (
                  <Link key={link.href} href={link.href}>
                    <div className={cardClasses}>
                      <h5 className={cardTitleClasses}>{link.title}</h5>
                      <p className={cardTextClasses}>{link.text}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}