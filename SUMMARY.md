# Rangkuman Aplikasi DeviceOps

Aplikasi **DeviceOps** adalah sistem monitoring terpusat (*Centralized Android Telemetry System*) yang dirancang khusus untuk memantau status operasional, lokasi (GPS), dan kondisi baterai perangkat Android milik perusahaan secara real-time di lapangan.

---

## 1. Problem (Masalah yang Dihadapi)
* **Ketiadaan Visibilitas:** Kesulitan memantau kondisi fisik perangkat Android (alat pelacak di kapal, truk logistik, atau gawai tim lapangan) yang sedang beroperasi di luar jangkauan.
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
* **Manajemen & Monitoring Armada (Fleet Management):** Melacak posisi GPS dan status operasional armada transportasi seperti truk logistik, mobil pengiriman, atau kapal laut yang menggunakan perangkat Android sebagai GPS tracker.
* **Keselamatan Wisatawan & Pendaki:** Memantau koordinat lokasi dan sisa baterai gawai para wisatawan atau pendaki di area wisata alam/pegunungan agar tim penyelamat bisa bertindak cepat jika gawai mereka terputus/habis baterai.
* **Monitoring Nelayan Tradisional:** Melacak posisi kapal nelayan saat melaut untuk memantau keselamatan mereka dari potensi cuaca buruk di laut lepas.
* **Inventarisasi & Keamanan Aset Bergerak:** Memastikan seluruh aset perangkat pintar pelacak milik perusahaan selalu dalam keadaan aktif, sehat, dan terdata di bawah satu tenant perusahaan yang aman.

---

## 6. Kekurangan & Batasan Aplikasi (Limitations)
* **Keterlambatan Pemantauan Real-time saat Offline:** Meskipun perekaman data tetap berjalan aman secara lokal di memori HP (*Room Database*) saat offline (tidak ada data yang hilang), admin di dashboard tidak dapat memantau pergerakan secara langsung (*real-time*) selama gawai berada di area *blind spot*. Data riwayat perjalanan baru akan terkirim secara rapel (sekaligus) setelah perangkat kembali mendapatkan sinyal internet.
* **Konsumsi Baterai Tambahan:** Pengaktifan sensor GPS secara berkala dan transmisi data secara terus-menerus di latar belakang (*background service*) dapat meningkatkan konsumsi daya baterai perangkat jika interval sinkronisasi diatur terlalu rapat.
* **Akurasi Lokasi di Ruang Tertutup:** GPS internal perangkat sangat bergantung pada pandangan langit yang jelas. Jika diletakkan di dalam kontainer besi rapat atau palka kapal logam, akurasi pelacakan lokasi akan berkurang karena terhalang material logam (*GPS Signal Shielding*).
* **Ketergantungan pada Izin Pengguna:** Aplikasi sangat bergantung pada konfigurasi izin sistem Android (*Location Permission set to "Allow all the time"*). Jika operator perangkat di lapangan mematikan izin lokasi atau mematikan layanan GPS secara manual, pelacakan akan terhenti.

