# Stocklet - Aplikasi Manajemen Stok Barang

Aplikasi web untuk manajemen stok barang, input data penjualan/pembelian, dan pelaporan.

## Fitur Utama

*   **Input Data Transaksi**: Formulir untuk mencatat transaksi penjualan dan pembelian.
*   **Laporan Penjualan**:
    *   Tampilan laporan per bulan atau keseluruhan.
    *   Filter berdasarkan customer, nama barang, tanggal, dll.
*   **Manajemen Stok Barang**:
    *   Daftar stok barang.
    *   Formulir input data barang (Nama Barang, Stok Awal).
    *   Stok otomatis diperbarui berdasarkan transaksi.
*   **Autentikasi**: Login menggunakan Email dan Password.
*   **Ekspor/Impor Data**:
    *   Download data ke format Excel.
    *   Impor data dari format Excel.

## Kolom Data Transaksi

*   Tanggal
*   Customer
*   No.SJ/No.Inv
*   No.PO
*   Barang
*   Berat (kg)
*   Harga
*   Total Harga (otomatis dihitung: Berat x Harga)
*   No SJ SBY (opsional)

## Teknologi yang Digunakan

*   **Frontend & Backend**: Next.js (dengan App Router)
*   **Styling**: Tailwind CSS
*   **Database**: MongoDB Atlas
*   **Bahasa**: TypeScript
*   **Linting**: ESLint

## Struktur Proyek (Dasar oleh `create-next-app`)

*   `stocklet-app/`
    *   `src/`
        *   `app/` (Untuk halaman dan layout menggunakan App Router)
        *   `components/` (Direktori kustom untuk komponen UI bersama)
        *   `lib/` (Direktori kustom untuk utilitas, koneksi DB, dll.)
        *   `models/` (Direktori kustom untuk skema Mongoose)
    *   `public/` (Untuk aset statis)
    *   `package.json`
    *   `tailwind.config.ts`
    *   `next.config.mjs`
    *   `tsconfig.json`
    *   `README.md` (File ini)

## Status Pengembangan (Mei 2025)

*   [x] **Desain Skema Database**: Model untuk User, Item, dan Transaction telah dibuat (`src/models/`).
*   [x] **Koneksi Database**: Utilitas koneksi MongoDB (`src/lib/dbConnect.ts`).
*   [x] **Implementasi Autentikasi (Dasar)**:
    *   [x] API endpoint untuk registrasi (`/api/auth/register`) dan login (`/api/auth/login`).
    *   [x] Halaman UI untuk login (`/login`) dengan komponen form.
    *   Catatan: Manajemen sesi lanjutan (JWT/NextAuth.js) dan proteksi rute belum diimplementasikan.
*   [x] **Pengembangan Fitur CRUD Barang**:
    *   [x] API endpoint untuk membuat dan membaca barang (`/api/items`).
    *   [x] Halaman UI (`/items`) dengan formulir input barang dan daftar barang.
    *   [x] Stok barang diperbarui secara otomatis melalui model Transaksi.
*   [x] **Pengembangan Fitur Transaksi**:
    *   [x] API endpoint untuk membuat dan membaca transaksi (`/api/transactions`).
    *   [x] Halaman UI (`/transactions`) dengan formulir input transaksi dan daftar transaksi.
*   [x] **Pengembangan Fitur Laporan Penjualan**:
    *   [x] API endpoint untuk mengambil data laporan penjualan dengan filter (`/api/reports/sales`).
    *   [x] Halaman UI (`/reports/sales`) dengan filter (tampilan, tahun, bulan, rentang tanggal, customer, barang) dan tabel laporan.
*   [x] **Implementasi Ekspor Excel (Dasar)**:
    *   [x] API endpoint untuk mengekspor laporan penjualan ke Excel (`/api/export/sales`) dengan filter aktif.
    *   [x] Tombol ekspor di halaman laporan penjualan.
*   [ ] **Implementasi Impor Excel**: Belum dimulai (fitur lanjutan).
*   [ ] **Styling dan UI/UX Refinement**: Styling dasar menggunakan Tailwind CSS telah diterapkan, penyempurnaan lebih lanjut dapat dilakukan.
*   [ ] **Pengujian Komprehensif**: Perlu pengujian menyeluruh.

## Persiapan dan Menjalankan Aplikasi

1.  **Clone Repository** (jika belum)
2.  **Install Dependencies**:
    ```bash
    cd stocklet-app
    npm install
    ```
3.  **Setup Environment Variables**:
    *   Buat file `.env.local` di dalam direktori `stocklet-app/`.
    *   Salin isi dari `.env.local.example` ke `.env.local`.
    *   Ganti placeholder `MONGODB_URI` dengan connection string MongoDB Atlas Anda yang valid.
    *   (Opsional) Atur `JWT_SECRET` jika Anda berencana mengimplementasikan autentikasi berbasis JWT.
4.  **Menjalankan Aplikasi (Development Mode)**:
    ```bash
    npm run dev
    ```
    Aplikasi akan berjalan di `http://localhost:3000`.

5.  **Membuat Pengguna Awal**:
    *   Karena belum ada UI registrasi publik (hanya API), Anda mungkin perlu membuat pengguna awal secara manual melalui tool seperti Postman atau curl untuk memanggil endpoint `/api/auth/register` dengan metode POST dan body JSON:
        ```json
        {
          "email": "admin@example.com",
          "password": "yoursecurepassword"
        }
        ```
    *   Setelah itu, Anda bisa login melalui halaman `/login`.

## Struktur Proyek Utama

*   `stocklet-app/`
    *   `src/`
        *   `app/` (Routing, Halaman, API Routes - menggunakan App Router)
            *   `api/` (Backend API endpoints)
            *   `items/`, `login/`, `reports/sales/`, `transactions/` (Halaman UI)
        *   `components/` (Komponen React bersama)
            *   `auth/`, `items/`, `reports/`, `transactions/`
        *   `lib/` (Utilitas, seperti `dbConnect.ts`)
        *   `models/` (Skema Mongoose untuk MongoDB: `User.ts`, `Item.ts`, `Transaction.ts`)
    *   `public/` (Aset statis)
    *   `.env.local.example` (Contoh file environment variables)
    *   `package.json`, `tailwind.config.ts`, `next.config.mjs`, `tsconfig.json`
    *   `README.md` (File ini)

## Langkah Selanjutnya yang Disarankan

1.  Implementasi manajemen sesi yang lebih robust (misalnya, menggunakan NextAuth.js atau JWT dengan HttpOnly cookies).
2.  Proteksi rute/halaman yang memerlukan autentikasi.
3.  Pengembangan fitur impor data dari Excel.
4.  Menambahkan fungsionalitas edit/hapus untuk Barang dan Transaksi jika diperlukan.
5.  Menambahkan fitur untuk mengelola data master Customer (jika diperlukan pemisahan dari field string biasa).
6.  Penyempurnaan UI/UX dan styling.
7.  Pengujian unit dan integrasi.
8.  Deployment.
