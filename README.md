# Multi-Upload Project

Proyek ini terdiri dari dua bagian utama:
- `ytuploader-backend`: Server backend yang ditulis dengan Node.js.
- `ytuploader-frontend`: Aplikasi frontend yang dibuat dengan React.

## Prasyarat

- Node.js (v14 atau lebih baru)
- npm

## Instalasi

1.  **Backend**:
    ```bash
    cd ytuploader-backend
    npm install
    ```

2.  **Frontend**:
    ```bash
    cd ytuploader-frontend
    npm install
    ```

## Konfigurasi Backend

1.  Buat file `.env` di dalam direktori `ytuploader-backend`.
2.  Salin konten di bawah ini ke dalam file `.env` Anda.

    ```
    # Port untuk server
    PORT=5000

    # Konfigurasi lain yang mungkin Anda perlukan
    # Contoh:
    # DB_HOST=localhost
    # DB_USER=root
    # DB_PASS=secret
    ```

## Struktur Database (`db.json`)

File `db.json` di dalam `ytuploader-backend` digunakan sebagai database sederhana berbasis file. Berikut adalah contoh strukturnya:

```json
{
  "accounts": [
    {
      "id": "user1",
      "name": "Contoh User 1",
      "email": "user1@example.com",
      "playlists": [
        {
          "id": "playlist1",
          "title": "Playlist Musik Favorit"
        }
      ]
    }
  ],
  "videos": []
}
```

Anda dapat mengisi file `db.json` dengan data awal sesuai format di atas untuk keperluan testing.

## Menjalankan Proyek

1.  **Jalankan Backend Server**:
    Dari direktori `ytuploader-backend`, jalankan:
    ```bash
    npm start
    ```
    Server akan berjalan di `http://localhost:5000` (atau port yang Anda tentukan di `.env`).

2.  **Jalankan Frontend App**:
    Dari direktori `ytuploader-frontend`, jalankan:
    ```bash
    npm start
    ```
    Aplikasi akan terbuka di browser Anda pada `http://localhost:3000`.
