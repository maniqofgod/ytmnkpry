const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const router = express.Router();
const userStore = require('../userStore');
const clientSecretStore = require('../clientSecretStore');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_yang_sangat_aman_dan_panjang';

// --- Middleware ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).send("Token diperlukan");
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).send("Token tidak valid");
    }
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).send("Akses ditolak. Memerlukan hak admin.");
        }
        next();
    });
};

// --- Endpoint Autentikasi ---
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await userStore.findUserByUsername(username);
        if (user && await bcrypt.compare(password, user.passwordHash)) {
            const token = jwt.sign({ userId: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '365d' });
            // Kirim kembali informasi pengguna yang aman
            const userPayload = {
                id: user.id,
                username: user.username,
                role: user.role
            };
            res.json({ token, user: userPayload });
        } else {
            res.status(401).send("Username atau password salah.");
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Terjadi kesalahan saat login.");
    }
});

// --- Endpoint Koneksi Google ---
router.post('/google/generate-url', verifyToken, async (req, res) => {
    try {
        const { useServerSecret, serverSecretId, manualSecretId } = req.body;
        let secret;
        let secretId;

        if (useServerSecret) {
            secretId = parseInt(serverSecretId, 10);
            secret = await clientSecretStore.findSecretById(secretId);
        } else {
            secretId = parseInt(manualSecretId, 10);
            secret = await userStore.findManualSecretForUser(req.user.userId, secretId);
        }

        if (!secret) {
            return res.status(404).send('Client Secret yang dipilih tidak ditemukan.');
        }
        
        const state = Buffer.from(JSON.stringify({ 
            userId: req.user.userId, 
            secretId: secretId,
            useServerSecret: useServerSecret 
        })).toString('base64');

        const oauth2Client = new google.auth.OAuth2(
            secret.clientId,
            secret.clientSecret,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:7033/api/auth/google/callback'
        );

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.force-ssl'],
            state: state
        });

        res.json({ url });
    } catch (error) {
        console.error("Generate URL error:", error);
        res.status(500).send("Gagal menghasilkan URL otentikasi.");
    }
});

router.get('/google/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
        return res.status(400).send('Parameter tidak lengkap.');
    }

    let decodedState;
    try {
        decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    } catch (error) {
        return res.status(400).send('State tidak valid.');
    }

    const { userId, secretId, useServerSecret } = decodedState;
    let secret;

    try {
        if (useServerSecret) {
            secret = await clientSecretStore.findSecretById(secretId);
        } else {
            secret = await userStore.findManualSecretForUser(userId, secretId);
        }

        if (!secret) {
            return res.status(400).send('Sesi otentikasi tidak valid atau client secret tidak ditemukan.');
        }

        const oauth2Client = new google.auth.OAuth2(
            secret.clientId,
            secret.clientSecret,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:7033/api/auth/google/callback'
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: profile } = await oauth2.userinfo.get();

        // Get YouTube channel info
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        let channelTitle = profile.name || profile.email || `Akun Google`;

        try {
            const channelResponse = await youtube.channels.list({
                part: 'snippet',
                mine: true
            });

            if (channelResponse.data.items && channelResponse.data.items.length > 0) {
                channelTitle = channelResponse.data.items[0].snippet.title;
                console.log('Channel title found:', channelTitle);
            }
        } catch (channelError) {
            console.warn('Could not fetch channel info, using profile name:', channelError.message);
        }

        const accountData = {
            ...tokens,
            account_name: channelTitle
        };

        await userStore.upsertGoogleAccount(userId, accountData);

        res.send('<script>window.close();</script>');
    } catch (error) {
        console.error('Error during Google callback:', error);
        res.status(500).send('Gagal mendapatkan token Google.');
    }
});

module.exports = { router, verifyToken, verifyAdmin };