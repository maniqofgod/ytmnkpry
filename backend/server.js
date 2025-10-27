require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const initializeDb = require('./db'); // Impor fungsi inisialisasi

// Impor Rute
const { router: authRouter } = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');
const secretRoutes = require('./routes/secrets');
const accountRoutes = require('./routes/account');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:6033', 'http://localhost:7033'],
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:6033', 'http://localhost:7033'],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 7033;

// Daftarkan Rute
app.use('/api/auth', authRouter);
app.use('/api/videos', videoRoutes(io));
app.use('/api/admin', adminRoutes);
app.use('/api/secrets', secretRoutes);
app.use('/api/account', accountRoutes);

app.get('/', (req, res) => {
  res.send('<h1>Backend ytuploader Aktif</h1>');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('join_room', (userId) => {
    socket.join(userId.toString());
    console.log(`User with id ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Fungsi untuk memulai server setelah DB siap
async function startServer() {
    try {
        // Pastikan database sudah diinisialisasi
        await initializeDb; 
        console.log("Koneksi database berhasil.");

        server.listen(PORT, () => {
            console.log(`Server berjalan di http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Gagal memulai server:", error);
        process.exit(1); // Keluar jika tidak bisa konek ke DB
    }
}

// Jalankan server
startServer();