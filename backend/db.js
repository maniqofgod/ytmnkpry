const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, {});

let dbInitialized = false;

async function initializeDatabase() {
    if (dbInitialized) return db;

    await db.read();
    
    db.data = db.data || {};
    db.data.users = db.data.users || [];
    db.data.clientSecrets = db.data.clientSecrets || [];
    db.data.uploadHistory = db.data.uploadHistory || []; // Tambahkan skema riwayat
    db.data.counters = db.data.counters || { userId: 1, manualSecretId: 1, googleAccountId: 1, clientSecretId: 1, historyId: 1 };

    const adminUser = db.data.users.find(u => u.role === 'admin');
    if (!adminUser) {
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (adminPassword) {
            const saltRounds = 10;
            const hash = await bcrypt.hash(adminPassword, saltRounds);
            db.data.users.push({
                id: db.data.counters.userId++,
                username: process.env.ADMIN_USERNAME || 'admin',
                passwordHash: hash,
                role: 'admin',
                googleAccounts: [],
                manualSecrets: []
            });
            console.log("Pengguna admin berhasil dibuat di database.");
            await db.write();
        } else {
            console.error("Variabel lingkungan ADMIN_PASSWORD tidak diatur. Admin tidak dibuat.");
        }
    }
    
    dbInitialized = true;
    console.log("Database berhasil diinisialisasi.");
    return db;
}

module.exports = initializeDatabase();