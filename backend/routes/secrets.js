const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const userStore = require('../userStore');

// Semua rute di sini memerlukan token yang valid
router.use(verifyToken);

// GET /api/secrets - Mendapatkan semua secret manual untuk pengguna yang login
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const secrets = await userStore.getManualSecretsForUser(userId);
        res.json(secrets);
    } catch (error) {
        res.status(500).send("Error mengambil data secret.");
    }
});

// POST /api/secrets - Menambahkan secret manual baru untuk pengguna
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, clientId, clientSecret } = req.body;

        if (!name || !clientId || !clientSecret) {
            return res.status(400).send("Nama, Client ID, dan Client Secret diperlukan.");
        }

        const newSecret = await userStore.addManualSecret(userId, { name, clientId, clientSecret });
        if (newSecret) {
            res.status(201).json({ id: newSecret.id, name: newSecret.name });
        } else {
            res.status(404).send("Pengguna tidak ditemukan.");
        }
    } catch (error) {
        res.status(500).send("Error saat menambahkan secret.");
    }
});

// Fungsi update dan delete untuk manual secret belum diimplementasikan di userStore
// Jika diperlukan, fungsi-fungsi ini harus ditambahkan ke userStore.js terlebih dahulu.
// Untuk saat ini, saya akan mengomentarinya agar tidak menyebabkan error.
/*
router.put('/:id', async (req, res) => {
    // ... logika update
});

router.delete('/:id', async (req, res) => {
    // ... logika delete
});
*/

module.exports = router;