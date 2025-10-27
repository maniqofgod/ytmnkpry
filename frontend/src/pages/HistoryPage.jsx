import React, { useState, useEffect, useCallback } from 'react';
import { getUploadHistory } from '../api';
import './HistoryPage.css';

function HistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State untuk filter
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                search: searchTerm,
                sortBy: sortBy,
                sortOrder: sortOrder,
            };
            const response = await getUploadHistory(params);
            setHistory(response.data);
        } catch (err) {
            setError('Gagal memuat riwayat unggahan.');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, sortBy, sortOrder]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="history-container">
            <h2>Riwayat Unggahan</h2>
            
            <div className="filter-controls">
                <input
                    type="text"
                    placeholder="Cari berdasarkan judul..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                    <option value="date">Urutkan berdasarkan Tanggal</option>
                    <option value="title">Urutkan berdasarkan Judul</option>
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="sort-select">
                    <option value="desc">Menurun</option>
                    <option value="asc">Menaik</option>
                </select>
            </div>

            {loading ? (
                <div>Memuat riwayat...</div>
            ) : (
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Akun</th>
                            <th>Judul Video</th>
                            <th>Status</th>
                            <th>Tautan YouTube</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length > 0 ? (
                            history.map(item => (
                                <tr key={item.id}>
                                    <td>{new Date(item.uploadedAt).toLocaleString()}</td>
                                    <td>{item.accountName}</td>
                                    <td>{item.title}</td>
                                    <td>{item.status}</td>
                                    <td>
                                        <a 
                                            href={`https://www.youtube.com/watch?v=${item.videoId}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            Tonton
                                        </a>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5">Tidak ada hasil yang cocok atau belum ada riwayat.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default HistoryPage;