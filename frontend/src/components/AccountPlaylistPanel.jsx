import React, { useState, useEffect } from 'react';
import { getAccounts, getPlaylists, generateGoogleAuthUrl, deleteToken, deleteAllTokens } from '../api.js';

const AccountPlaylistPanel = ({ credentials, onAccountChange }) => {
    const [accounts, setAccounts] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedPlaylist, setSelectedPlaylist] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, [credentials]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const response = await getAccounts();
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlaylists = async (accountId) => {
        try {
            const response = await getPlaylists(accountId);
            setPlaylists(response.data);
        } catch (error) {
            console.error('Error fetching playlists:', error);
        }
    };

    const handleAccountChange = (event) => {
        const accountId = event.target.value;
        setSelectedAccount(accountId);
        setSelectedPlaylist('');
        onAccountChange(accountId);
        if (accountId) {
            fetchPlaylists(accountId);
        }
    };

    const handlePlaylistChange = (event) => {
        setSelectedPlaylist(event.target.value);
    };

    const handleAddAccount = async () => {
        try {
            const response = await generateGoogleAuthUrl(credentials);
            window.open(response.data.url, '_blank', 'width=600,height=700');
        } catch (error) {
            console.error('Error generating auth URL:', error);
        }
    };

    const handleAuthWindowClosed = () => {
        fetchAccounts(); // Refresh accounts after potential new account addition
    };

    const handleDeleteAccount = async (accountId) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus akun ini?')) {
            try {
                await deleteToken(accountId);
                fetchAccounts(); // Refresh accounts
                if (selectedAccount === accountId) {
                    setSelectedAccount('');
                    setSelectedPlaylist('');
                    onAccountChange(''); // Reset selected account in parent
                }
            } catch (error) {
                console.error('Error deleting account:', error);
            }
        }
    };

    const handleDeleteAllAccounts = async () => {
        if (window.confirm('Apakah Anda yakin ingin menghapus semua akun?')) {
            try {
                await deleteAllTokens();
                setAccounts([]); // Clear accounts list
                setSelectedAccount('');
                setSelectedPlaylist('');
                onAccountChange(''); // Reset selected account in parent
            } catch (error) {
                console.error('Error deleting all accounts:', error);
            }
        }
    };

    return (
        <div className="panel-container account-playlist-panel">
            <h3>Akun & Playlist</h3>
            <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                <button onClick={handleAddAccount}>Tambah Akun</button>
                {accounts.length > 0 && (
                    <>
                        <button onClick={handleDeleteAllAccounts} style={{ backgroundColor: '#dc3545', color: 'white' }}>Hapus Semua</button>
                    </>
                )}
            </div>
            {loading ? <p>Loading accounts...</p> : (
                <div>
                    <div style={{ marginBottom: '10px' }}>
                        <label htmlFor="account-select">Pilih Akun YouTube:</label>
                        <br />
                        <select
                        id="account-select"
                        value={selectedAccount}
                        onChange={handleAccountChange}
                        style={{ marginRight: '10px', width: '200px' }}
                    >
                        <option value="">Pilih Akun</option>
                        {accounts.map(account => (
                            <option key={account.id} value={account.id}>
                                {account.name || `Akun ${account.id}`}
                            </option>
                        ))}
                    </select>
                    {selectedAccount && (
                        <button onClick={() => handleDeleteAccount(selectedAccount)} style={{ backgroundColor: '#dc3545', color: 'white' }}>
                            Hapus
                        </button>
                    )}
                    </div>

                    {selectedAccount && (
                        <div style={{ marginTop: '10px' }}>
                            <label htmlFor="playlist-select">Pilih Playlist:</label>
                            <br />
                            <select
                                id="playlist-select"
                                value={selectedPlaylist}
                                onChange={handlePlaylistChange}
                                style={{ width: '200px', marginTop: '5px' }}
                            >
                                <option value="">Default (Unggahan)</option>
                                {playlists.map(playlist => (
                                    <option key={playlist.id} value={playlist.id}>
                                        {playlist.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default AccountPlaylistPanel;
