import React, { useState, useEffect } from 'react';
import { getUsers, addUser, updateUser, deleteUser, getClientSecrets, addClientSecret, deleteClientSecret, getGeminiApis, addGeminiApi, verifyGeminiApi, deleteGeminiApi } from '../api';
import './AdminPanel.css';

// Komponen Modal untuk Edit Pengguna
const EditUserModal = ({ user, onSave, onClose }) => {
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(user.role);

    const handleSubmit = (e) => {
        e.preventDefault();
        const updatedData = { username, role };
        if (password) {
            updatedData.password = password;
        }
        onSave(user.id, updatedData);
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h4>Edit Pengguna: {user.username}</h4>
                <form onSubmit={handleSubmit}>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Kosongkan jika tidak ingin mengubah password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                    />
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                    <div className="modal-actions">
                        <button type="submit">Simpan</button>
                        <button type="button" onClick={onClose}>Batal</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


function AdminPanel() {
    // State untuk Pengguna
    const [users, setUsers] = useState([]);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('user'); // State baru untuk role pengguna baru
    const [editingUser, setEditingUser] = useState(null);
    
    // State untuk Client Secret
    const [secrets, setSecrets] = useState([]);
    const [newSecretName, setNewSecretName] = useState('');
    const [newClientId, setNewClientId] = useState('');
    const [newClientSecret, setNewClientSecret] = useState('');

    // State untuk Gemini API
    const [geminiApis, setGeminiApis] = useState([]);
    const [newGeminiApiKey, setNewGeminiApiKey] = useState('');
    const [verifyingApi, setVerifyingApi] = useState(null);

    const [error, setError] = useState('');

    const fetchAllData = async () => {
        try {
            const [userRes, secretRes, geminiRes] = await Promise.all([getUsers(), getClientSecrets(), getGeminiApis()]);
            setUsers(userRes.data);
            setSecrets(secretRes.data);
            setGeminiApis(geminiRes.data);
        } catch {
            setError('Gagal memuat data admin.');
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            // Kirim role baru ke API
            await addUser({ username: newUsername, password: newPassword, role: newUserRole });
            setNewUsername('');
            setNewPassword('');
            setNewUserRole('user'); // Reset ke default
            fetchAllData();
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menambahkan pengguna.');
        }
    };

    const handleUpdateUser = async (userId, userData) => {
        try {
            await updateUser(userId, userData);
            setEditingUser(null);
            fetchAllData();
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memperbarui pengguna.');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
            try {
                await deleteUser(userId);
                fetchAllData();
            } catch (err) {
                setError(err.response?.data?.message || 'Gagal menghapus pengguna.');
            }
        }
    };

    const handleAddSecret = async (e) => {
        e.preventDefault();
        try {
            await addClientSecret({ name: newSecretName, clientId: newClientId, clientSecret: newClientSecret });
            setNewSecretName('');
            setNewClientId('');
            setNewClientSecret('');
            fetchAllData();
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menambahkan client secret.');
        }
    };

    const handleDeleteSecret = async (secretId) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus client secret ini?')) {
            try {
                await deleteClientSecret(secretId);
                fetchAllData();
            } catch (err) {
                setError(err.response?.data?.message || 'Gagal menghapus client secret.');
            }
        }
    };

    const handleAddGeminiApi = async (e) => {
        e.preventDefault();
        try {
            await addGeminiApi({ apiKey: newGeminiApiKey });
            setNewGeminiApiKey('');
            fetchAllData();
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menambahkan Gemini API.');
        }
    };

    const handleVerifyGeminiApi = async (apiId) => {
        setVerifyingApi(apiId);
        try {
            const response = await verifyGeminiApi(apiId);
            // Update status verifikasi di state
            setGeminiApis(prev => prev.map(api =>
                api.id === apiId
                    ? { ...api, isVerified: response.data.isValid, lastVerified: response.data.verifiedAt }
                    : api
            ));
            alert(response.data.isValid ? 'API Key valid!' : 'API Key tidak valid!');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memverifikasi Gemini API.');
            setGeminiApis(prev => prev.map(api =>
                api.id === apiId
                    ? { ...api, isVerified: false, lastVerified: new Date().toISOString() }
                    : api
            ));
        } finally {
            setVerifyingApi(null);
        }
    };

    const handleDeleteGeminiApi = async (apiId) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus Gemini API ini?')) {
            try {
                await deleteGeminiApi(apiId);
                fetchAllData();
            } catch (err) {
                setError(err.response?.data?.message || 'Gagal menghapus Gemini API.');
            }
        }
    };

    return (
        <>
            {editingUser && (
                <EditUserModal 
                    user={editingUser} 
                    onSave={handleUpdateUser} 
                    onClose={() => setEditingUser(null)} 
                />
            )}
            <div className="admin-panel-container">
                {error && <p className="error-message" style={{ gridColumn: '1 / -1' }}>{error}</p>}
                
                {/* Manajemen User */}
                <div className="management-section">
                    <h4>Manajemen User</h4>
                    <form onSubmit={handleAddUser} className="user-form">
                        <input type="text" placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
                        <input type="password" placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button type="submit">Tambah User</button>
                    </form>
                    <table className="user-table">
                        <thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>{user.role}</td>
                                    <td className="action-buttons">
                                        <button onClick={() => setEditingUser(user)} className="edit-button">Edit</button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="delete-button">Hapus</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Manajemen Client Secret */}
                <div className="management-section">
                    <h4>Manajemen Client Secret</h4>
                    <form onSubmit={handleAddSecret} className="user-form">
                        <input type="text" placeholder="Nama (e.g., Akun Utama)" value={newSecretName} onChange={(e) => setNewSecretName(e.target.value)} required />
                        <input type="text" placeholder="Client ID" value={newClientId} onChange={(e) => setNewClientId(e.target.value)} required />
                        <input type="password" placeholder="Client Secret" value={newClientSecret} onChange={(e) => setNewClientSecret(e.target.value)} required />
                        <button type="submit">Tambah Secret</button>
                    </form>
                    <table className="user-table">
                        <thead><tr><th>ID</th><th>Nama</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {secrets.map(secret => (
                                <tr key={secret.id}>
                                    <td>{secret.id}</td>
                                    <td>{secret.name}</td>
                                    <td><button onClick={() => handleDeleteSecret(secret.id)} className="delete-button">Hapus</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ⚠️ GEMINI API MANAGEMENT - BARU DITAMBAHKAN */}
                <div className="management-section gemini-api-section">
                    <h4>🔑 Manajemen API Gemini</h4>

                    <div style={{ marginBottom: '5px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Masukkan API Key Gemini Anda"
                                value={newGeminiApiKey}
                                onChange={(e) => setNewGeminiApiKey(e.target.value)}
                                required
                                style={{
                                    flex: 1
                                }}
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!newGeminiApiKey.trim()) {
                                        alert('Silakan masukkan API key terlebih dahulu');
                                        return;
                                    }
                                    try {
                                        await handleAddGeminiApi({ preventDefault: () => {} });
                                    } catch (error) {
                                        console.error('Error adding Gemini API:', error);
                                        setError('Gagal menambahkan API key. Silakan coba lagi.');
                                    }
                                }}
                            >
                                Tambah API Key
                            </button>
                        </div>
                    </div>

                    <div>
                        <h5>API Keys yang Tersimpan: {geminiApis.length} {geminiApis.length > 5 && `(Scroll aktif untuk melihat semua)`}</h5>
                        {geminiApis.length === 0 ? (
                            <div className="gemini-empty-state">
                                <p>📝 Belum ada API key Gemini yang ditambahkan</p>
                                <p style={{ fontSize: '12px' }}>
                                    Tambahkan API key dari Google AI Studio untuk mengaktifkan fitur AI
                                </p>
                            </div>
                        ) : (
                            <div className="gemini-scroll-wrapper">
                                <div className="gemini-api-grid">
                                    {geminiApis.map(api => (
                                        <div key={api.id} className="api-item">
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '4px', /* Dikurangi drastis dari 10px */
                                                background: '#161b22',
                                                border: '1px solid #21262d',
                                                borderRadius: '3px' /* Dikurangi dari 6px */
                                            }}>
                                                <div>
                                                    <div className="api-key-text">
                                                        {api.maskedKey || 'API Key'}
                                                        {api.isVerified !== undefined && (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                marginLeft: '3px', /* Dikurangi dari 4px */
                                                                padding: '0px 2px', /* Dikurangi dari 1px 3px */
                                                                borderRadius: '1px', /* Dikurangi dari 2px */
                                                                fontSize: '7px', /* Dikurangi dari 8px */
                                                                fontWeight: 'bold',
                                                                color: 'white',
                                                                backgroundColor: api.isVerified ? '#28a745' : '#d73a49'
                                                            }}>
                                                                {api.isVerified ? 'VALID' : 'INVALID'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="api-date-text">
                                                        Ditambahkan: {new Date(api.createdAt).toLocaleDateString('id-ID')}
                                                        {api.lastVerified && (
                                                            <div style={{
                                                                color: '#0366d6',
                                                                fontSize: '7px', /* Dikurangi dari 8px */
                                                                marginTop: '0px' /* Dikurangi dari 1px */
                                                            }}>
                                                                Diverifikasi: {new Date(api.lastVerified).toLocaleString('id-ID')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleVerifyGeminiApi(api.id)}
                                                    disabled={verifyingApi === api.id}
                                                    style={{
                                                        padding: '2px 4px', /* Dikurangi dari 3px 6px */
                                                        backgroundColor: verifyingApi === api.id ? '#6c757d' : '#28a745',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '1px', /* Dikurangi dari 2px */
                                                        cursor: verifyingApi === api.id ? 'not-allowed' : 'pointer',
                                                        fontSize: '9px', /* Dikurangi dari 10px */
                                                        marginRight: '1px' /* Dikurangi dari 2px */
                                                    }}
                                                >
                                                    {verifyingApi === api.id ? 'Verifying...' : 'Verifikasi'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGeminiApi(api.id)}
                                                    style={{
                                                        padding: '2px 4px', /* Dikurangi dari 3px 6px */
                                                        backgroundColor: '#d73a49',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '1px', /* Dikurangi dari 2px */
                                                        cursor: 'pointer',
                                                        fontSize: '9px' /* Dikurangi dari 10px */
                                                    }}
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default AdminPanel;