  'use client';

  import Link from 'next/link';
  import { useAuth } from '@/context/AuthContext';
  import { usePathname } from 'next/navigation';
  import { useState, useEffect } from 'react';

  export default function ClientNav() {
    const { isAuthenticated, logout, isLoading } = useAuth();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const navLinkClasses = (path: string) =>
      `py-1.5 px-3 rounded-md transition-all duration-200 ease-in-out 
      ${pathname === path 
        ? 'font-bold text-[color:var(--primary)] bg-opacity-10'
        : 'text-[color:var(--foreground)] opacity-75 hover:opacity-100 hover:text-[color:var(--primary)] hover:bg-opacity-5'
      } cursor-pointer`;

    const mobileNavLinkClasses = (path: string) =>      
      `block py-2.5 px-4 text-sm transition-colors duration-150 ease-in-out 
      ${pathname === path 
        ? 'font-semibold text-[color:var(--primary)] ' 
        : 'text-[color:var(--foreground)] hover:bg-[color:var(--background)] hover:text-[color:var(--primary)]'      }`;    
      useEffect(() => {
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }, [pathname, isMobileMenuOpen]);

    if (isLoading) {
      return (
        <nav className="shadow-sm">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/">
              <span className="text-2xl font-bold text-[color:var(--primary)] cursor-pointer">Stocklet</span>
            </Link>
            <div className="space-x-4">
              <span className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>Loading...</span>
            </div>
          </div>
        </nav>
      );
    }

    return (
      <nav className="sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold text-[color:var(--primary)] cursor-pointer hover:opacity-85 transition-opacity duration-150">Stocklet</span>
          </Link>

          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="p-1 rounded-md text-[color:var(--foreground)] hover:text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] transition-all duration-150"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>

          <div className="hidden font-semibold md:flex space-x-4 items-center">
            <Link href="/"><span className={navLinkClasses('/')}>Home</span></Link>
            
            {isAuthenticated && (
              <>
                <Link href="/items"><span className={navLinkClasses('/items')}>Stok</span></Link>
                <Link href="/transactions"><span className={navLinkClasses('/transactions')}>Transaksi</span></Link>
                <div className="relative group">
                  <button className={`${navLinkClasses('/reports')} flex items-center`}>
                    Laporan
                    <svg className="ml-1 h-4 w-4 opacity-75 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-[color:var(--card-bg)] ring-1 ring-[color:var(--border-color)] ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <Link href="/reports/sales">
                        <span className={`block px-4 py-2 text-sm ${pathname === '/reports/sales' ? 'font-semibold text-[color:var(--primary)]' : 'text-[color:var(--foreground)]'} hover:bg-[color:var(--background)] hover:text-[color:var(--primary)]`} role="menuitem">
                          Laporan Penjualan
                        </span>
                      </Link>
                      <Link href="/reports/purchases">
                        <span className={`block px-4 py-2 text-sm ${pathname === '/reports/purchases' ? 'font-semibold text-[color:var(--primary)]' : 'text-[color:var(--foreground)]'} hover:bg-[color:var(--background)] hover:text-[color:var(--primary)]`} role="menuitem">
                          Laporan Pembelian
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isAuthenticated ? (
            <button
              onClick={logout}
              title="Logout" 
              className="p-2 rounded-full text-red-500 opacity-75 hover:opacity-100 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all duration-200 ease-in-out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
            ) : (
              pathname !== '/login' && (
                <Link href="/login"><span className={navLinkClasses('/login')}>Login</span></Link>
              )
            )}
            {!isAuthenticated && process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === 'true' && pathname !== '/register' && (
              <Link href="/register"><span className={navLinkClasses('/register')}>Register</span></Link>
            )}
          </div>
        </div>

        <div 
          className={`md:hidden absolute top-full left-0 right-0 shadow-xl border-t transition-all duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-y-0 opacity-100 visible' : '-translate-y-4 opacity-0 invisible'}`}
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/"><span className={mobileNavLinkClasses('/')} onClick={toggleMobileMenu}>Home</span></Link>
            
            {isAuthenticated && (
              <>
                <Link href="/items"><span className={mobileNavLinkClasses('/items')} onClick={toggleMobileMenu}>Stok</span></Link>
                <Link href="/transactions"><span className={mobileNavLinkClasses('/transactions')} onClick={toggleMobileMenu}>Transaksi</span></Link>
                {/* Mobile Laporan Links - can be simple links or a collapsible section */}
                <Link href="/reports/sales"><span className={mobileNavLinkClasses('/reports/sales')} onClick={toggleMobileMenu}>Laporan Penjualan</span></Link>
                <Link href="/reports/purchases"><span className={mobileNavLinkClasses('/reports/purchases')} onClick={toggleMobileMenu}>Laporan Pembelian</span></Link>
              </>
            )}

            {isAuthenticated ? (
              <button
                onClick={() => { logout(); toggleMobileMenu(); }}
                className={`w-full text-left ${mobileNavLinkClasses('/logout-button-placeholder-mobile')}`}
              >
                Logout
              </button>
            ) : (
              pathname !== '/login' && (
                <Link href="/login"><span className={mobileNavLinkClasses('/login')} onClick={toggleMobileMenu}>Login</span></Link>
              )
            )}
            {!isAuthenticated && process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === 'true' && pathname !== '/register' && (
              <Link href="/register"><span className={mobileNavLinkClasses('/register')} onClick={toggleMobileMenu}>Register</span></Link>
            )}
          </div>
        </div>
      </nav>
    );
  }
