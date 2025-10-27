const { google } = require('googleapis');
const userStore = require('../userStore');
const clientSecretStore = require('../clientSecretStore');

// Fungsi untuk membuat klien OAuth2 yang sudah terotentikasi
async function getAuthenticatedClient(userId, accountId) {
    const token = await userStore.getTokenById(userId, accountId);
    if (!token) {
        throw new Error('Token tidak ditemukan atau tidak valid.');
    }

    // Logika untuk menemukan client secret yang benar perlu diperbaiki.
    // Untuk saat ini, kita asumsikan menggunakan secret default dari server.
    // Ini adalah placeholder dan mungkin perlu penyesuaian lebih lanjut
    // tergantung pada bagaimana Anda ingin mengelola secret mana yang digunakan untuk refresh.
    const clientSecret = await clientSecretStore.getDefault(); 
    if (!clientSecret) {
        throw new Error('Client secret tidak dikonfigurasi.');
    }

    const oauth2Client = new google.auth.OAuth2(
        clientSecret.clientId, // Perhatikan: ini mungkin tidak selalu benar
        clientSecret.clientSecret,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:7033/api/auth/google/callback'
    );

    oauth2Client.setCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        scope: token.scope,
        token_type: token.token_type,
        expiry_date: token.expiry_date,
    });

    return oauth2Client;
}

// Mengambil semua token yang terkait dengan user
async function getUserTokens(userId) {
    return await userStore.getTokensByUserId(userId);
}

// Mengambil playlist untuk token/akun tertentu
async function getPlaylistsForToken(userId, accountId) {
    try {
        const oauth2Client = await getAuthenticatedClient(userId, accountId);
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        const response = await youtube.playlists.list({
            mine: true,
            part: 'snippet,contentDetails',
            maxResults: 50,
        });

        return response.data.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
        }));
    } catch (error) {
        console.error("Error fetching playlists from Google:", error.message);
        if (error.response && error.response.data) {
             console.error("Google API Error:", error.response.data);
        }
        
        // Jika token refresh tidak valid, hapus dari database
        if (error.message.includes('invalid_grant') || (error.response && error.response.data.error === 'invalid_grant')) {
            await deleteToken(userId, accountId);
            throw new Error('Token tidak valid dan telah dihapus. Silakan otorisasi ulang.');
        }
        throw new Error('Gagal mengambil playlist dari YouTube.');
    }
}

// Menghapus satu token
async function deleteToken(userId, accountId) {
    return await userStore.deleteTokenById(userId, accountId);
}

// Menghapus semua token milik user
async function deleteAllUserTokens(userId) {
    return await userStore.deleteTokensByUserId(userId);
}

module.exports = {
    getUserTokens,
    getPlaylistsForToken,
    deleteToken,
    deleteAllUserTokens,
};