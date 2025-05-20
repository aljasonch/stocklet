# 📦 Stocklet

**Stocklet** adalah aplikasi web berbasis **Next.js** dan **MongoDB** yang dirancang untuk memudahkan manajemen stok barang, pencatatan transaksi, dan pelaporan data secara terstruktur dan efisien.

## ✨ Fitur Utama

- 🔐 Autentikasi pengguna
- 📦 Manajemen stok barang
- 🧾 Input transaksi penjualan & pembelian
- 📊 Laporan penjualan dengan berbagai filter
- 📤 Ekspor data ke Excel
- 📚 Modular architecture (UI Components, API Routes, Database Models, Utils)

## 🧱 Teknologi yang Digunakan

- **Framework**: [Next.js](https://nextjs.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Ekspor Excel**: `xlsx` atau pustaka serupa (jika digunakan)
- **Autentikasi**: (contoh: NextAuth / custom JWT)

## 🗂️ Struktur Proyek

/components # Komponen UI
/app/api # API Routes
/models # Schema Mongoose
/lib # Koneksi database dan helper functions
