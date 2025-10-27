import React, { useState, useEffect } from 'react';
import { getClientSecrets, getMyManualSecrets, addMyManualSecret } from '../api';
import './ClientSecretPanel.css';

const SecretModal = ({ onSave, onClose }) => {
    const [name, setName] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, clientId, clientSecret });
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h4>Tambah CS Manual</h4>
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="Nama (e.g., Akun Utama)" value={name} onChange={(e) => setName(e.target.value)} required />
                    <input type="text" placeholder="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} required />
                    <input type="password" placeholder="Client Secret" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} required />
                    <div className="modal-actions">
                        <button type="submit">Simpan</button>
                        <button type="button" onClick={onClose}>Batal</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

function ClientSecretPanel({ onCredentialsChange }) {
    const [useServerSecrets, setUseServerSecrets] = useState(false);
    
    const [serverSecrets, setServerSecrets] = useState([]);
    const [mySecrets, setMySecrets] = useState([]);
    
    const [selectedServerSecretId, setSelectedServerSecretId] = useState('');
    const [selectedManualSecretId, setSelectedManualSecretId] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');

    const fetchSecrets = async () => {
        try {
            const [serverRes, myRes] = await Promise.all([getClientSecrets(), getMyManualSecrets()]);
            setServerSecrets(serverRes.data);
            setMySecrets(myRes.data);

            if (serverRes.data.length > 0 && !selectedServerSecretId) setSelectedServerSecretId(serverRes.data[0].id);
            if (myRes.data.length > 0 && !selectedManualSecretId) setSelectedManualSecretId(myRes.data[0].id);
        } catch (err) {
            setError('Gagal memuat client secrets.');
        }
    };

    useEffect(() => {
        fetchSecrets();
    }, []);

    useEffect(() => {
        onCredentialsChange({
            useServerSecret: useServerSecrets,
            serverSecretId: selectedServerSecretId,
            manualSecretId: selectedManualSecretId,
        });
    }, [useServerSecrets, selectedServerSecretId, selectedManualSecretId]);

    const handleAddSecret = async (secretData) => {
        try {
            await addMyManualSecret(secretData);
            fetchSecrets();
        } catch (err) {
            setError('Gagal menyimpan secret manual.');
        } finally {
            setIsModalOpen(false);
        }
    };

    return (
        <div className="panel-container">
            {error && <p className="error-message">{error}</p>}
            
            <div className="form-group">
                <input 
                    type="checkbox" 
                    id="use-server-cs" 
                    checked={useServerSecrets}
                    onChange={(e) => setUseServerSecrets(e.target.checked)}
                />
                <label htmlFor="use-server-cs">Gunakan CS Server</label>
            </div>

            {useServerSecrets && (
                 <div className="form-group">
                    <label htmlFor="server-cs-choice">Pilihan CS Server:</label>
                    <select id="server-cs-choice" value={selectedServerSecretId} onChange={(e) => setSelectedServerSecretId(e.target.value)} disabled={serverSecrets.length === 0}>
                        {serverSecrets.length === 0 ? <option>Tidak ada</option> : serverSecrets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )}

            {!useServerSecrets && (
                <div>
                    <div className="form-group">
                        <label htmlFor="manual-cs-choice">Pilihan CS Manual:</label>
                        <select id="manual-cs-choice" value={selectedManualSecretId} onChange={(e) => setSelectedManualSecretId(e.target.value)} disabled={mySecrets.length === 0}>
                            {mySecrets.length === 0 ? <option>Belum ada CS manual</option> : mySecrets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setIsModalOpen(true)}>Tambah CS Manual</button>
                </div>
            )}

            {isModalOpen && <SecretModal onSave={handleAddSecret} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}

export default ClientSecretPanel;