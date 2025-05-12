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
          <header className="shadow-sm sticky top-0 z-50" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)'}}>
            <ClientNav />
          </header>
          <main className="container mx-auto p-6 mt-6 flex-grow">
            {children}
          </main>
          <footer className="text-center py-6 mt-auto text-sm" style={{ backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', color: 'var(--foreground)', opacity: 0.8 }}>
            <p>&copy; {new Date().getFullYear()} Stocklet Beta. Created by aljasonch.</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
