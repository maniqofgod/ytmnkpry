const express = require('express');
const router = express.Router();
const { verifyToken: authMiddleware } = require('./auth');
const { getUserTokens, getPlaylistsForToken, deleteToken, deleteAllUserTokens } = require('../services/googleAuthService');

// Middleware untuk semua rute di file ini
router.use(authMiddleware);

// GET /api/account/all - Mendapatkan semua akun (token) yang terhubung milik pengguna
router.get('/all', async (req, res) => {
    try {
        console.log(`[DEBUG] Meminta akun untuk pengguna ID: ${req.user.userId}`);
        const tokens = await getUserTokens(req.user.userId);
        console.log(`[DEBUG] Token yang ditemukan di database:`, JSON.stringify(tokens, null, 2));
        
        const accounts = tokens.map(token => ({
            id: token.id,
            name: token.account_name || `Akun ${token.id}`,
        }));
        
        console.log(`[DEBUG] Akun yang dikirim ke frontend:`, JSON.stringify(accounts, null, 2));
        res.json(accounts);
    } catch (error) {
        console.error('[ERROR] Gagal mengambil daftar akun:', error);
        res.status(500).json({ message: 'Gagal mengambil daftar akun' });
    }
});

// GET /api/account/:accountId/playlists - Mendapatkan playlist untuk akun tertentu
router.get('/:accountId/playlists', async (req, res) => {
    try {
        const { accountId } = req.params;
        const playlists = await getPlaylistsForToken(req.user.userId, accountId);
        res.json(playlists);
    } catch (error) {
        console.error('[ERROR] Gagal mengambil daftar playlist:', error);
        res.status(500).json({ message: 'Gagal mengambil daftar playlist' });
    }
});

// DELETE /api/account/:accountId/token - Menghapus token untuk akun tertentu
router.delete('/:accountId/token', async (req, res) => {
    try {
        const { accountId } = req.params;
        await deleteToken(req.user.userId, accountId);
        res.status(200).json({ message: 'Token berhasil dihapus' });
    } catch (error) {
        console.error('[ERROR] Gagal menghapus token:', error);
        res.status(500).json({ message: 'Gagal menghapus token' });
    }
});

// DELETE /api/account/all-tokens - Menghapus semua token milik pengguna
router.delete('/all-tokens', async (req, res) => {
    try {
        await deleteAllUserTokens(req.user.userId);
        res.status(200).json({ message: 'Semua token berhasil dihapus' });
    } catch (error) {
        console.error('[ERROR] Gagal menghapus semua token:', error);
        res.status(500).json({ message: 'Gagal menghapus semua token' });
    }
});

module.exports = router;