import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ClientNav from "@/components/layout/ClientNav"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stocklet",
  description: "Aplikasi manajemen stok barang sederhana.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
        style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      >
        <AuthProvider> 
          <header className="shadow-lg sticky top-0 z-50 border-b" style={{ backgroundColor: 'var(--card-bg)', borderBottomColor: 'var(--border-color)'}}>
            <ClientNav />
          </header>
          <main className="container mx-auto p-6 mt-8 flex-grow">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          <footer
            className="text-center py-8 mt-auto text-sm border-t"
            style={{
              backgroundColor: 'var(--surface)',
              borderTopColor: 'var(--border-color)',
              color: 'var(--muted)',
            }}
          >
            <p className="font-medium">
              &copy; {new Date().getFullYear()} Stocklet Beta. All rights reserved.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Created by aljasonch
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
