# Rangkuman Aplikasi DeviceOps

Aplikasi **DeviceOps** adalah sistem monitoring terpusat (*Centralized Android Telemetry System*) yang dirancang khusus untuk memantau status operasional, lokasi (GPS), dan kondisi baterai perangkat Android milik perusahaan secara real-time di lapangan.

---

## 1. Problem (Masalah yang Dihadapi)
* **Ketiadaan Visibilitas:** Perusahaan kesulitan memantau kondisi fisik perangkat Android (tablet kiosk, mesin kasir POS portabel, atau ponsel kurir) yang tersebar di berbagai cabang/lapangan.
* **Perangkat Mati Tanpa Diketahui:** Sering kali perangkat kehabisan baterai atau kehilangan sinyal internet di lapangan tanpa disadari oleh tim pusat, mengganggu operasional bisnis.
* **Kesulitan Pelacakan:** Tidak adanya pencatatan riwayat lokasi yang akurat untuk melacak keberadaan aset fisik perusahaan.
* **Tantangan Teknis Sebelumnya:** Pembacaan data GPS sering bernilai `0.0` karena masalah izin background Android, persentase baterai tersangkut (*stale cache*), dan ketidaksesuaian zona waktu data (UTC vs WIB).

---

## 2. Solusi
* **Android Agent App:** Aplikasi ringan yang berjalan di latar belakang Android (*Background WorkManager*) untuk mengambil data baterai secara akurat (*sticky intent*) dan koordinat GPS (*multi-provider fallback*) secara berkala.
* **Robust Backend API:** REST API berbasis **FastAPI (Python)** yang bertugas menerima, memvalidasi token enkripsi pairing perangkat, dan menyimpan log telemetri secara aman.
* **Web Dashboard:** Halaman antarmuka berbasis **Next.js (React)** dengan font modern *Plus Jakarta Sans* untuk menampilkan status perangkat, peta lokasi interaktif, dan grafik riwayat baterai.

---

## 3. Fungsi Utama Aplikasi
* **Real-time Battery Tracking:** Memantau persentase daya baterai saat ini untuk mendeteksi dini perangkat yang butuh pengisian daya.
* **GPS Location History:** Menampilkan riwayat rute koordinat perangkat secara visual di peta interaktif.
* **Connection Status Watchdog:** Mengetahui status jaringan perangkat secara berkala (**ONLINE** jika aktif mengirim data, **OFFLINE** jika terputus, atau **PENDING_SYNC** jika ada antrean data lokal yang belum terkirim).
* **QR Code Pairing:** Menghubungkan perangkat Android baru ke perusahaan secara instan melalui pemindaian QR Code di dashboard.

---

## 4. Flow Kerja Aplikasi (Sederhana)

```text
[ Android Device (Ponsel/POS) ]
               |
               | (1) TelemetryWorker berjalan di background
               v
  - Membaca kapasitas baterai (sticky intent)
  - Mengunci koordinat GPS (Satelit/Wifi/BTS)
  - Mengecek tipe & kekuatan sinyal jaringan
               |
               | (2) Mengirim data via HTTPS POST ke
               v
       [ FastAPI Backend ]
               |
               v
  - Memverifikasi token autentikasi perangkat
  - Mengubah zona waktu timestamp ke WIB (Asia/Jakarta)
  - Menyimpan data log ke database
               |
               +-----------------------+
               |                       |
               v                       v
      [ Database Logs ]       [ Peta & Status Terkini ]
                                       |
                                       v
                             [ Web Dashboard Next.js ]
                                       |
                                       v
                           [ Dipantau oleh Admin ]
```

---

## 5. Bisa Digunakan untuk Apa Saja (Use Cases)
* **Manajemen Kasir POS (Point of Sale):** Memantau semua tablet kasir portabel di berbagai outlet restoran/toko agar tidak kehabisan baterai saat jam sibuk.
* **Pelacakan Armada Kurir/Sales:** Melacak pergerakan kurir pengirim barang atau sales lapangan secara real-time via koordinat GPS ponsel kerja mereka.
* **Kiosk & Informasi Mandiri:** Memantau status konektivitas tablet kiosk mandiri di mal/bandara agar segera diperbaiki jika terjadi kendala jaringan (*offline*).
* **Inventarisasi Perangkat Perusahaan:** Memastikan seluruh aset gawai pintar milik perusahaan selalu dalam keadaan aktif, sehat, dan terdata di bawah satu tenant perusahaan yang terisolasi.
