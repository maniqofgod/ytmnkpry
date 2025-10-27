# Rencana Proyek: Migrasi `ytuploader` ke Aplikasi Web Full JavaScript

**Dokumen ini adalah panduan teknis untuk AI dan pengembang.** Tujuannya adalah untuk mengarahkan proses rekayasa ulang (re-engineering) aplikasi desktop `ytuploader` (Python/Tkinter) menjadi sebuah **Aplikasi Web Full-Stack JavaScript**, dengan **React** sebagai frontend dan **Node.js** sebagai backend.

---

## 1. Tujuan Utama (High-Level Objective)

**Misi:** Mengganti aplikasi desktop yang ada dengan solusi web modern yang sepenuhnya ditulis dalam JavaScript. Aplikasi baru harus mereplikasi semua fungsionalitas inti dari aplikasi asli, yaitu autentikasi pengguna melalui Google, manajemen daftar video, dan proses upload massal ke YouTube.

**Kriteria Keberhasilan:**
1.  Aplikasi dapat diakses dan berfungsi penuh melalui browser web modern.
2.  Pengguna dapat melakukan autentikasi dengan akun Google mereka.
3.  Pengguna dapat menambah, mengedit, dan mengelola daftar video untuk diunggah.
4.  Pengguna dapat memulai proses upload massal, melihat progres secara real-time, dan menerima notifikasi keberhasilan/kegagalan.
5.  Seluruh basis kode (frontend dan backend) menggunakan JavaScript/TypeScript.

---

## 2. Pemetaan Fitur: Dari Desktop ke Web

Tabel ini memetakan fitur dari aplikasi Python yang ada ke implementasi yang direncanakan di arsitektur web baru.

| Fitur di Aplikasi Python (`ytuploader.py`) | Implementasi di Aplikasi Web (React + Node.js) |
| :--- | :--- |
| **Antarmuka Pengguna (Tkinter)** | **Frontend (React):** Dibangun sebagai Single-Page Application (SPA) dengan komponen-komponen React yang reaktif dan modern. |
| **Autentikasi Akun (`get_authenticated_service`)** | **Backend (Node.js):** Alur OAuth2 penuh ditangani di server. Frontend hanya memicu proses login. Token disimpan aman di database. |
| **Manajemen Client Secret (Lokal & Online)** | **Backend (Node.js):** Client Secret disimpan secara eksklusif dan aman di backend sebagai *environment variable*. Tidak ada di sisi klien. |
| **Daftar Video (List di memori, simpan ke JSON)** | **Frontend (React) & Backend (Node.js):** UI dikelola oleh React. Data video disimpan secara persisten di **database** (misal: PostgreSQL) dan diambil melalui API. |
| **Proses Upload (`process_bulk_uploads` di Thread)** | **Backend (Node.js):** Proses upload ditangani sebagai *background job* atau proses asinkron di server. |
| **Update Status UI (melalui `queue`)** | **Frontend (React) & Backend (Node.js):** Komunikasi real-time menggunakan **WebSockets** (`socket.io`). Backend mengirim event progres, frontend mendengarkan dan memperbarui UI. |
| **Konfigurasi Default (disimpan di JSON)** | **Backend (Node.js):** Konfigurasi default disimpan per pengguna di database. Frontend mengambil setelan ini saat aplikasi dimuat. |

---

## 3. Arsitektur & Tumpukan Teknologi (Tech Stack)

Arsitektur yang dipilih adalah **klien-server** yang terpisah (decoupled).

### Frontend (Direktori: `ytuploader-frontend`)
*   **Tujuan:** Menyediakan antarmuka pengguna yang interaktif.
*   **Teknologi:**
    *   **Framework:** **React.js**
    *   **Build Tool:** **Vite** (untuk pengembangan yang cepat)
    *   **Bahasa:** JavaScript (ES6+)
    *   **Styling:** **Tailwind CSS** (untuk utilitas CSS yang cepat)
    *   **Komunikasi API:** **Axios** (untuk permintaan HTTP ke backend)
    *   **Komunikasi Real-time:** **`socket.io-client`**

### Backend (Direktori: `ytuploader-backend`)
*   **Tujuan:** Menangani semua logika bisnis, keamanan, dan komunikasi dengan layanan eksternal.
*   **Teknologi:**
    *   **Runtime:** **Node.js**
    *   **Framework:** **Express.js**
    *   **Bahasa:** JavaScript (ES6+)
    *   **Database ORM/Driver:** **Prisma** atau **node-postgres (pg)**
    *   **Google API:** **`googleapis`** (library resmi)
    *   **Komunikasi Real-time:** **`socket.io`**

### Database
*   **Sistem:** **PostgreSQL** (Direkomendasikan karena struktur datanya yang jelas dan relasional).
*   **Model Data Utama:**
    1.  `users`: Menyimpan data pengguna (ID Google, email, nama).
    2.  `auth_tokens`: Menyimpan token akses dan refresh yang terenkripsi, terhubung ke `users`.
    3.  `videos`: Menyimpan metadata untuk setiap video yang akan diunggah (judul, deskripsi, status upload, dll.), terhubung ke `users`.

---

## 4. Rencana Eksekusi Bertahap (Actionable Steps)

Ini adalah urutan langkah yang harus diikuti untuk membangun aplikasi.

### **Milestone 1: Pengaturan Fondasi Proyek**
1.  Buat direktori proyek utama.
2.  Di dalamnya, inisialisasi proyek backend Node.js/Express di sub-direktori `ytuploader-backend`.
3.  Inisialisasi proyek frontend React/Vite di sub-direktori `ytuploader-frontend`.
4.  Siapkan file `.env` di backend untuk menyimpan kredensial (Client ID, Client Secret, URL Database).

### **Milestone 2: Implementasi Autentikasi (Backend & Frontend)**
1.  **Backend:** Buat endpoint API untuk alur Google OAuth2:
    *   `GET /api/auth/google`: Mengarahkan pengguna ke halaman persetujuan Google.
    *   `GET /api/auth/google/callback`: Menangani callback dari Google, mengambil token, membuat/memperbarui data pengguna di database, dan membuat sesi.
2.  **Frontend:** Buat halaman login dengan tombol "Login dengan Google" yang mengarah ke endpoint backend di atas.
3.  **Frontend:** Buat mekanisme untuk memeriksa status login pengguna saat aplikasi dimuat.

### **Milestone 3: Implementasi Fungsionalitas Video (Backend & Frontend)**
1.  **Backend:** Buat endpoint CRUD (Create, Read, Update, Delete) untuk video:
    *   `POST /api/videos`: Menambahkan entri video baru ke database (metadata awal).
    *   `GET /api/videos`: Mengambil daftar video milik pengguna yang sedang login.
    *   `PUT /api/videos/:id`: Memperbarui metadata video.
2.  **Frontend:** Buat komponen untuk:
    *   Menampilkan daftar video dalam sebuah tabel.
    *   Form untuk menambah/mengedit detail video (judul, deskripsi, dll.).
3.  **Backend:** Implementasikan logika upload ke YouTube. Ini harus menjadi proses asinkron yang tidak memblokir server.
4.  **Backend & Frontend:** Integrasikan `socket.io` untuk mengirim pembaruan progres upload dari backend ke frontend secara real-time.

### **Milestone 4: Pengujian dan Penyelesaian**
1.  Lakukan pengujian end-to-end untuk seluruh alur: login -> tambah video -> edit video -> upload -> verifikasi di YouTube.
2.  Pastikan penanganan error berjalan dengan baik (misalnya, jika API YouTube gagal).
3.  Selesaikan styling dan pastikan UI/UX responsif dan intuitif.