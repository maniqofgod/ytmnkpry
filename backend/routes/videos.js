const express = require('express');
const { google } = require('googleapis');
const { verifyToken } = require('./auth');
const userStore = require('../userStore');
const getDb = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { mergeAudioAndVideo } = require('../services/videoProcessor');
const geminiService = require('../services/geminiService');

const upload = multer({ dest: 'uploads/' });

module.exports = function(io) {
    const router = express.Router();

    // Endpoint baru untuk mengambil riwayat unggahan
    router.get('/history', verifyToken, async (req, res) => {
        try {
            const db = await getDb;
            // Pastikan uploadHistory ada
            if (!db.data.uploadHistory) {
                db.data.uploadHistory = [];
            }
            const { search, sortBy = 'date', sortOrder = 'desc' } = req.query;

            let history = db.data.uploadHistory.filter(h => h.userId === req.user.userId);

            // Terapkan filter pencarian jika ada
            if (search) {
                history = history.filter(h => h.title.toLowerCase().includes(search.toLowerCase()));
            }

            // Terapkan pengurutan
            history.sort((a, b) => {
                const fieldA = sortBy === 'title' ? a.title.toLowerCase() : new Date(a.uploadedAt);
                const fieldB = sortBy === 'title' ? b.title.toLowerCase() : new Date(b.uploadedAt);

                let comparison = 0;
                if (fieldA > fieldB) {
                    comparison = 1;
                } else if (fieldA < fieldB) {
                    comparison = -1;
                }

                return sortOrder === 'desc' ? comparison * -1 : comparison;
            });

            res.json(history);
        } catch (error) {
            console.error("Gagal mengambil riwayat unggahan:", error);
            res.status(500).send("Gagal mengambil riwayat unggahan.");
        }
    });

    // Endpoint untuk generate konten menggunakan Gemini AI
    router.post('/generate-content', verifyToken, async (req, res) => {
        try {
            const { fileName, options = {} } = req.body;
            if (!fileName) {
                return res.status(400).send("Nama file diperlukan.");
            }

            const content = await geminiService.generateContent(fileName, req.user.userId, options);
            res.json(content);
        } catch (error) {
            console.error("Gagal generate konten:", error);

            // Handle rate limiting error specifically
            if (error.message.includes('Rate limit exceeded')) {
                return res.status(429).send(error.message);
            }

            res.status(500).send("Gagal generate konten.");
        }
    });

    // Endpoint untuk menyimpan/memperbarui detail video sementara
    router.post('/details', verifyToken, async (req, res) => {
        const { videoId, details } = req.body;
        if (!videoId || !details) {
            return res.status(400).send("ID video dan detail diperlukan.");
        }

        try {
            const db = await getDb;
            if (!db.data.videoDetails) {
                db.data.videoDetails = {};
            }
            db.data.videoDetails[videoId] = {
                ...db.data.videoDetails[videoId],
                ...details,
                updatedAt: new Date().toISOString()
            };
            await db.write();
            res.status(200).json({ message: "Detail video berhasil disimpan." });
        } catch (error) {
            console.error("Gagal menyimpan detail video:", error);
            res.status(500).send("Gagal menyimpan detail video.");
        }
    });


    router.post('/upload', [verifyToken, upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 },
    { name: 'audioFile', maxCount: 1 }
])], async (req, res) => {
        const userId = req.user.userId;
        const { accountId, title, description, categoryId, privacyStatus, tags, videoId } = req.body;

        if (!req.files || !req.files.videoFile || !req.files.videoFile[0]) {
            return res.status(400).send("Tidak ada file video yang diunggah.");
        }
        if (!accountId) {
            return res.status(400).send("ID Akun Google diperlukan.");
        }

        let videoFilePath = req.files.videoFile[0].path;
        const originalVideoPath = videoFilePath;
        let audioFilePath = req.files.audioFile ? req.files.audioFile[0].path : null;
        let mergedVideoPath = null;

        try {
            if (audioFilePath) {
                io.to(userId.toString()).emit('upload_status', { videoId, message: 'Menggabungkan audio dan video...' });
                const outputFileName = `merged-${Date.now()}-${path.basename(videoFilePath)}.mp4`;
                mergedVideoPath = path.join('uploads', outputFileName);
                
                videoFilePath = await mergeAudioAndVideo(originalVideoPath, audioFilePath, mergedVideoPath);
                io.to(userId.toString()).emit('upload_status', { videoId, message: 'Penggabungan berhasil, memulai unggahan...' });
            }

            const token = await userStore.getTokenById(userId, accountId);
            if (!token) {
                return res.status(401).send("Akun Google tidak ditemukan atau tidak valid.");
            }

            // Gunakan token yang sudah ada tanpa refresh otomatis
            console.log('Menggunakan token yang sudah ada tanpa refresh otomatis');
            console.log('Token expiry:', token.expiry_date ? new Date(token.expiry_date).toISOString() : 'No expiry set');

            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials(token);

            const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

            io.to(userId.toString()).emit('upload_status', { videoId, message: 'Memulai unggahan...' });

            const videoFileSize = fs.statSync(videoFilePath).size;

            console.log('Upload request received data:');
            console.log('  - title:', title);
            console.log('  - description:', description);
            console.log('  - privacyStatus:', privacyStatus);
            console.log('  - categoryId:', categoryId);
            console.log('  - tags:', tags);

            // Validasi title tidak boleh kosong
            if (!title || title.trim() === '') {
                throw new Error('Judul video tidak boleh kosong');
            }

            const response = await youtube.videos.insert({
                part: 'snippet,status',
                requestBody: {
                    snippet: {
                        title: title.trim(),
                        description: description || '',
                        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                        categoryId: categoryId || '22'
                    },
                    status: {
                        privacyStatus: privacyStatus || 'public'
                    },
                },
                media: { body: fs.createReadStream(videoFilePath) },
            }, {
                onUploadProgress: evt => {
                    const progress = Math.round((evt.bytesRead / videoFileSize) * 100);
                    io.to(userId.toString()).emit('upload_progress', { videoId, progress });
                }
            });

            console.log('YouTube upload response status:', response.data.status);
            console.log('YouTube video privacy status:', response.data.status.privacyStatus);

            io.to(userId.toString()).emit('upload_success', { videoId, youtubeVideoId: response.data.id });
            const youtubeVideoId = response.data.id;

            // Handle thumbnail upload
            if (req.files.thumbnailFile) {
                const thumbnailFilePath = req.files.thumbnailFile[0].path;
                try {
                    await youtube.thumbnails.set({
                        videoId: youtubeVideoId,
                        media: {
                            body: fs.createReadStream(thumbnailFilePath),
                        },
                    });
                    io.to(userId.toString()).emit('upload_status', { videoId, message: 'Thumbnail berhasil diunggah.' });
                } catch (thumbError) {
                    console.error("Gagal mengunggah thumbnail:", thumbError);
                    io.to(userId.toString()).emit('upload_error', { videoId, message: 'Gagal mengunggah thumbnail.' });
                } finally {
                    fs.unlinkSync(thumbnailFilePath); // Clean up thumbnail file
                }
            }

            // Simpan ke riwayat
            const db = await getDb;
            if (!db.data.uploadHistory) db.data.uploadHistory = [];
            if (!db.data.counters) db.data.counters = { historyId: 1 };

            const historyEntry = {
                id: db.data.counters.historyId++,
                userId: userId,
                videoId: response.data.id,
                title: title,
            
                uploadedAt: new Date().toISOString(),
                accountName: token.account_name,
                status: 'Berhasil'
            };
            db.data.uploadHistory.push(historyEntry);
            await db.write();

            res.status(200).json({ message: "Video berhasil diunggah", videoId: response.data.id });

        } catch (error) {
            console.error("Gagal mengunggah video:", error);
            io.to(userId.toString()).emit('upload_error', { videoId, message: 'Gagal mengunggah video.' });
            res.status(500).send("Gagal mengunggah video.");
        } finally {
            // Cleanup all temporary files
            if (fs.existsSync(originalVideoPath)) fs.unlinkSync(originalVideoPath);
            if (audioFilePath && fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);
            if (mergedVideoPath && fs.existsSync(mergedVideoPath)) fs.unlinkSync(mergedVideoPath);
        }
    });

    return router;
};