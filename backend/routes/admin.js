const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { verifyToken, verifyAdmin } = require('./auth');
const userStore = require('../userStore');
const clientSecretStore = require('../clientSecretStore');
const geminiStore = require('../geminiStore');
const geminiService = require('../services/geminiService');

const saltRounds = 10;

// Rute ini hanya memerlukan pengguna untuk login, tidak harus admin.
// Ini memungkinkan semua pengguna untuk melihat daftar nama CS Server.
router.get('/client-secrets', verifyToken, async (req, res) => {
    try {
        const secrets = await clientSecretStore.getAllSecretsForClient();
        res.json(secrets);
    } catch (error) {
        res.status(500).send("Error mengambil client secrets.");
    }
});

// Terapkan middleware admin untuk semua rute di bawah ini
router.use(verifyToken, verifyAdmin);

// --- Rute Pengguna ---
router.get('/users', async (req, res) => {
    try {
        const users = await userStore.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).send("Error mengambil data pengguna.");
    }
});

router.post('/users', async (req, res) => {
    try {
        const { username, password, role = 'user' } = req.body;
        if (!username || !password) {
            return res.status(400).send("Username dan password diperlukan.");
        }
        if (await userStore.findUserByUsername(username)) {
            return res.status(409).send("Username sudah ada.");
        }

        const passwordHash = await bcrypt.hash(password, saltRounds);
        const newUser = await userStore.addUser({
            username,
            passwordHash,
            role,
        });
        
        const { passwordHash: _, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);

    } catch (error) {
        res.status(500).send("Error saat menambahkan pengguna.");
    }
});

// Rute edit pengguna diperbarui untuk menyertakan role
router.put('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { username, password, role } = req.body; // Tambahkan role

        if (isNaN(userId)) {
            return res.status(400).send("ID pengguna tidak valid.");
        }
        if (!username) {
            return res.status(400).send("Username diperlukan.");
        }

        const updateData = { username, role }; // Sertakan role dalam data pembaruan
        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, saltRounds);
        }

        const updatedUser = await userStore.updateUser(userId, updateData);
        if (updatedUser) {
            const { passwordHash: _, ...userToReturn } = updatedUser;
            res.status(200).json(userToReturn);
        } else {
            res.status(404).send("Pengguna tidak ditemukan.");
        }
    } catch (error) {
        res.status(500).send("Error saat memperbarui pengguna.");
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).send("ID pengguna tidak valid.");
        }
        if (req.user.userId === userId) {
            return res.status(403).send("Tidak dapat menghapus akun sendiri.");
        }
        if (await userStore.deleteUser(userId)) {
            res.status(200).send("Pengguna berhasil dihapus.");
        } else {
            res.status(404).send("Pengguna tidak ditemukan.");
        }
    } catch (error) {
        res.status(500).send("Error saat menghapus pengguna.");
    }
});

// --- Rute Manajemen Client Secret (Hanya Admin) ---
router.post('/client-secrets', async (req, res) => {
    try {
        const { name, clientId, clientSecret } = req.body;
        if (!name || !clientId || !clientSecret) {
            return res.status(400).send("Nama, Client ID, dan Client Secret diperlukan.");
        }
        const newSecret = await clientSecretStore.addSecret({ name, clientId, clientSecret });
        res.status(201).json(newSecret);
    } catch (error) {
        res.status(500).send("Error saat menambahkan client secret.");
    }
});

router.delete('/client-secrets/:id', async (req, res) => {
    try {
        const secretId = parseInt(req.params.id, 10);
        if (isNaN(secretId)) {
            return res.status(400).send("ID secret tidak valid.");
        }
        if (await clientSecretStore.deleteSecret(secretId)) {
            res.status(200).send("Client secret berhasil dihapus.");
        } else {
            res.status(404).send("Client secret tidak ditemukan.");
        }
    } catch (error) {
        res.status(500).send("Error saat menghapus client secret.");
    }
});

// --- Rute Manajemen Gemini API ---
router.get('/gemini-apis', async (req, res) => {
    try {
        const apis = await geminiStore.getAllApis();
        // Jangan kirim apiKey lengkap ke frontend
        const sanitizedApis = apis.map(api => ({
            id: api.id,
            maskedKey: api.apiKey.substring(0, 8) + '...' + api.apiKey.substring(api.apiKey.length - 4),
            createdAt: api.createdAt
        }));
        res.json(sanitizedApis);
    } catch (error) {
        res.status(500).send("Error mengambil Gemini APIs.");
    }
});

router.post('/gemini-apis', async (req, res) => {
    try {
        const { apiKey } = req.body;
        console.log('Received API key:', apiKey ? 'Length: ' + apiKey.length : 'Empty');

        if (!apiKey || apiKey.trim().length === 0) {
            return res.status(400).send("API Key diperlukan.");
        }

        // Validasi API key dengan Gemini
        const isValid = await geminiService.validateApiKey(apiKey.trim());
        if (!isValid) {
            return res.status(400).send("API Key Gemini tidak valid.");
        }

        const newApi = await geminiStore.addApi(apiKey.trim());
        res.status(201).json({
            id: newApi.id,
            maskedKey: apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4),
            createdAt: newApi.createdAt
        });
    } catch (error) {
        console.error('Error adding Gemini API:', error);
        res.status(500).send("Error saat menambahkan Gemini API: " + error.message);
    }
});

router.post('/gemini-apis/:id/verify', async (req, res) => {
    try {
        const apiId = parseInt(req.params.id, 10);
        if (isNaN(apiId)) {
            return res.status(400).send("ID API tidak valid.");
        }

        const api = await geminiStore.getApiById(apiId);
        if (!api) {
            return res.status(404).send("Gemini API tidak ditemukan.");
        }

        const isValid = await geminiService.validateApiKey(api.apiKey);
        res.json({
            id: apiId,
            isValid: isValid,
            verifiedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error verifying Gemini API:', error);
        res.status(500).send("Error saat verifikasi Gemini API.");
    }
});

router.delete('/gemini-apis/:id', async (req, res) => {
    try {
        const apiId = parseInt(req.params.id, 10);
        if (isNaN(apiId)) {
            return res.status(400).send("ID API tidak valid.");
        }
        if (await geminiStore.deleteApi(apiId)) {
            res.status(200).send("Gemini API berhasil dihapus.");
        } else {
            res.status(404).send("Gemini API tidak ditemukan.");
        }
    } catch (error) {
        res.status(500).send("Error saat menghapus Gemini API.");
    }
});

// --- Rute Statistik Gemini API ---
router.get('/gemini-stats', async (req, res) => {
    try {
        const stats = await geminiStore.getUsageStats();
        if (stats) {
            res.json(stats);
        } else {
            res.status(500).send("Error mengambil statistik penggunaan API.");
        }
    } catch (error) {
        res.status(500).send("Error mengambil statistik penggunaan API.");
    }
});

router.get('/gemini-usage', async (req, res) => {
    try {
        const data = await fs.readFile(path.join(__dirname, '../db.json'), 'utf8');
        const db = JSON.parse(data);

        const usage = db.geminiUsage || [];
        const recentUsage = usage.slice(-50); // Ambil 50 log terbaru

        res.json(recentUsage);
    } catch (error) {
        res.status(500).send("Error mengambil log penggunaan API.");
    }
});

// --- Rute Informasi Gemini ---
router.get('/gemini-info', async (req, res) => {
    try {
        const promptTemplates = {
            indonesia: `Berdasarkan nama file video: "{fileName}", buat konten YouTube Shorts yang menarik dengan format JSON berikut: {"title": "judul yang catchy dan menarik (max 100 karakter)", "description": "deskripsi menarik yang menggambarkan konten video (max 500 karakter)", "hashtags": "beberapa hashtag relevan dipisah dengan koma"} Pastikan: - Judul catchy dan mengundang klik - Deskripsi informatif tapi singkat - Hashtag maksimal 10, relevan dengan konten - Gunakan bahasa Indonesia yang natural dan komunikatif - Sesuaikan dengan konten dari nama file - Jika nama file dalam bahasa Inggris, tetap gunakan bahasa Indonesia untuk output.`,

            english: `Based on the video file name: "{fileName}", create engaging YouTube Shorts content in the following JSON format: {"title": "catchy and attractive title (max 100 characters)", "description": "interesting description that describes the video content (max 500 characters)", "hashtags": "some relevant hashtags separated by commas"} Make sure: - Title is catchy and click-worthy - Description is informative but concise - Maximum 10 relevant hashtags - Use natural English language - Adapt to the content from the file name - If the file name is in Indonesian, still use English for output.`,

            sunda: `Dumasar nami file video: "{fileName}", jieun konten YouTube Shorts anu narik kalawan format JSON di handap: {"title": "judul anu catchy jeung narik (max 100 karakter)", "description": "deskripsi narik anu ngagambarkeun eusi video (max 500 karakter)", "hashtags": "sababaraha hashtag relevan dipisah koma"} Pastikeun: - Judul catchy jeung ngundang klik - Deskripsi informatif tapi singket - Hashtag maksimal 10, relevan jeung konten - Paké basa Sunda anu natural - Sesuaikeun jeung konten tina nami file - Upami nami file dina basa Inggris, tetep paké basa Sunda pikeun output.`
        };

        const availableModels = {
            'models/gemini-2.0-flash-exp': {
                name: 'Gemini 2.0 Flash Experimental',
                description: 'Model terbaru dan paling canggih untuk berbagai tugas',
                maxTokens: 32768
            },
            'models/gemini-2.0-flash': {
                name: 'Gemini 2.0 Flash',
                description: 'Model stabil dan cepat untuk berbagai tugas',
                maxTokens: 32768
            },
            'models/gemini-pro': {
                name: 'Gemini Pro Latest',
                description: 'Model stabil dan andal untuk berbagai tugas',
                maxTokens: 32768
            },
            'models/gemini-flash-latest': {
                name: 'Gemini Flash Latest',
                description: 'Model cepat dan efisien untuk response singkat',
                maxTokens: 8192
            },
            'models/gemini-1.5-flash': {
                name: 'Gemini 1.5 Flash',
                description: 'Model lama yang masih didukung untuk kompatibilitas',
                maxTokens: 8192
            },
            'models/gemini-1.5-pro': {
                name: 'Gemini 1.5 Pro',
                description: 'Model powerful untuk konten yang lebih kompleks',
                maxTokens: 32768
            }
        };

        res.json({
            promptTemplates: Object.keys(promptTemplates).map(key => ({
                key: key,
                name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
                preview: promptTemplates[key].substring(0, 100) + '...'
            })),
            availableModels: availableModels
        });
    } catch (error) {
        console.error('Error in gemini-info endpoint:', error);
        res.status(500).send("Error mengambil informasi Gemini.");
    }
});

module.exports = router;