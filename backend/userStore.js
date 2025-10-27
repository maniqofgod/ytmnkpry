const getDb = require('./db');

// --- Fungsi Pengguna ---

const findUserByUsername = async (username) => {
    const db = await getDb;
    return db.data.users.find(u => u.username === username);
};

const findUserById = async (id) => {
    const db = await getDb;
    return db.data.users.find(u => u.id === id);
};

const addUser = async (userData) => {
    const db = await getDb;
    const newUser = {
        ...userData,
        id: db.data.counters.userId++,
        googleAccounts: [],
        manualSecrets: []
    };
    db.data.users.push(newUser);
    await db.write();
    return newUser;
};

const updateUser = async (id, updateData) => {
    const db = await getDb;
    const user = db.data.users.find(u => u.id === id);
    if (user) {
        Object.assign(user, updateData);
        await db.write();
        return user;
    }
    return null;
};

const deleteUser = async (id) => {
    const db = await getDb;
    const index = db.data.users.findIndex(u => u.id === id);
    if (index !== -1) {
        db.data.users.splice(index, 1);
        await db.write();
        return true;
    }
    return false;
};

const getAllUsers = async () => {
    const db = await getDb;
    return db.data.users.map(({ passwordHash, googleAccounts, manualSecrets, ...user }) => user);
};

// --- Fungsi Akun Google ---

const upsertGoogleAccount = async (userId, accountData) => {
    const db = await getDb;
    const user = db.data.users.find(u => u.id === userId);
    if (!user) return false;

    const existingAccount = user.googleAccounts.find(acc => acc.account_name === accountData.account_name);

    if (existingAccount) {
        // Update token yang ada
        Object.assign(existingAccount, accountData);
    } else {
        // Tambahkan sebagai akun baru
        const newAccount = {
            id: db.data.counters.googleAccountId++,
            ...accountData
        };
        user.googleAccounts.push(newAccount);
    }
    
    await db.write();
    return true;
};

const getTokensByUserId = async (userId) => {
    const user = await findUserById(userId);
    return user ? user.googleAccounts : [];
};

const getTokenById = async (userId, accountId) => {
    const user = await findUserById(userId);
    if (!user) return null;
    return user.googleAccounts.find(acc => acc.id === parseInt(accountId, 10));
};

const deleteTokenById = async (userId, accountId) => {
    const db = await getDb;
    const user = db.data.users.find(u => u.id === userId);
    if (!user) return false;
    
    const index = user.googleAccounts.findIndex(acc => acc.id === parseInt(accountId, 10));
    if (index !== -1) {
        user.googleAccounts.splice(index, 1);
        await db.write();
        return true;
    }
    return false;
};

const deleteTokensByUserId = async (userId) => {
    const db = await getDb;
    const user = db.data.users.find(u => u.id === userId);
    if (!user) return false;
    user.googleAccounts = [];
    await db.write();
    return true;
};

// --- Fungsi Secret Manual ---

const addManualSecret = async (userId, { name, clientId, clientSecret }) => {
    const db = await getDb;
    const user = db.data.users.find(u => u.id === userId);
    if (!user) return null;
    
    const newSecret = { id: db.data.counters.manualSecretId++, name, clientId, clientSecret };
    user.manualSecrets.push(newSecret);
    await db.write();
    return newSecret;
};

const getManualSecretsForUser = async (userId) => {
    const user = await findUserById(userId);
    return user ? user.manualSecrets.map(({ id, name }) => ({ id, name })) : [];
};

const findManualSecretForUser = async (userId, secretId) => {
    const user = await findUserById(userId);
    return user ? user.manualSecrets.find(s => s.id === secretId) : null;
};

module.exports = {
    findUserByUsername,
    findUserById,
    addUser,
    updateUser, // Tambahkan fungsi baru
    deleteUser,
    getAllUsers,
    upsertGoogleAccount,
    getTokensByUserId,
    getTokenById,
    deleteTokenById,
    deleteTokensByUserId,
    addManualSecret,
    getManualSecretsForUser,
    findManualSecretForUser,
};