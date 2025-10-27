const getDb = require('./db');

const addSecret = async ({ name, clientId, clientSecret }) => {
    const db = await getDb;
    const newSecret = { 
        id: db.data.counters.clientSecretId++, 
        name, 
        clientId, 
        clientSecret 
    };
    db.data.clientSecrets.push(newSecret);
    await db.write();
    return newSecret;
};

const deleteSecret = async (id) => {
    const db = await getDb;
    const index = db.data.clientSecrets.findIndex(s => s.id === id);
    if (index !== -1) {
        db.data.clientSecrets.splice(index, 1);
        await db.write();
        return true;
    }
    return false;
};

const getAllSecretsForClient = async () => {
    const db = await getDb;
    // Hanya mengembalikan id dan nama, BUKAN client secret-nya
    return db.data.clientSecrets.map(({ id, name }) => ({ id, name }));
};

const findSecretById = async (id) => {
    const db = await getDb;
    return db.data.clientSecrets.find(s => s.id === id);
};

// Fungsi untuk mendapatkan secret default (misalnya yang pertama)
// Ini mungkin perlu disesuaikan jika ada logika pemilihan default yang lebih kompleks
const getDefault = async () => {
    const db = await getDb;
    if (db.data.clientSecrets.length > 0) {
        return db.data.clientSecrets[0];
    }
    return null;
};


module.exports = {
    addSecret,
    deleteSecret,
    getAllSecretsForClient,
    findSecretById,
    getDefault,
};