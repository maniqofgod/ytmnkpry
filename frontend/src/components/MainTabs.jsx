import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MainTabs.css';
import ClientSecretPanel from './ClientSecretPanel';
import AccountPlaylistPanel from './AccountPlaylistPanel';
import VideoList from './VideoList';
import DefaultSettingsPanel from './DefaultSettingsPanel';
import AdminPanel from './AdminPanel';
import HistoryPage from '../pages/HistoryPage';
import UploadControlPanel from './UploadControlPanel';
import { useLogger } from '../contexts/LogContext';

const LogPanel = () => {
    const { logs } = useLogger();
    const logAreaRef = useRef(null);

    useEffect(() => {
        if (logAreaRef.current) {
            logAreaRef.current.scrollTop = logAreaRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="panel-container log-panel">
            <textarea ref={logAreaRef} readOnly value={logs.join('\n')} />
        </div>
    );
};

// State dan panel dikembalikan ke dalam DashboardContent
const DashboardContent = ({ defaultSettings }) => {
    const [credentials, setCredentials] = useState({
        useServerSecret: false,
        serverSecretId: '',
        manualSecretId: '',
    });
    const [videos, setVideos] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState(''); // State baru
    const { addLog } = useLogger();

    const handleCredentialsChange = useCallback((newCredentials) => {
        setCredentials(newCredentials);
        addLog('Pengaturan Client Secret diperbarui.');
    }, [addLog]);

    const handleAccountChange = (accountId) => {
        setSelectedAccountId(accountId);
        addLog(`Akun dipilih: ${accountId}`);
    };

    const handleAddVideo = (file) => {
        const videoLimit = 10;
        if (videos.length >= videoLimit) {
            const message = `Gagal menambahkan video: Maksimal ${videoLimit} video dalam satu sesi.`;
            alert(message);
            addLog(message, 'ERROR');
            return;
        }
        const newVideo = {
            id: `video-${Date.now()}-${Math.random()}`,
            file: file,
            title: `${defaultSettings.prefix}${file.name.split('.').slice(0, -1).join('.')}`,
            status: 'Menunggu',
            file_path: file.name,
            description: defaultSettings.description,
            tags: defaultSettings.tags,
            category: defaultSettings.category,
        };
        setVideos(prevVideos => [...prevVideos, newVideo]);
        addLog(`Video ditambahkan: ${file.name}`);
    };

    const handleUpdateVideoStatus = (videoId, newStatus) => {
        setVideos(currentVideos =>
            currentVideos.map(v => v.id === videoId ? { ...v, status: newStatus } : v)
        );
    };

    return (
        <>
            <div className="dashboard-layout">
                <div className="top-panels">
                    <ClientSecretPanel onCredentialsChange={handleCredentialsChange} />
                    <AccountPlaylistPanel credentials={credentials} onAccountChange={handleAccountChange} />
                </div>
                <div className="main-content-area">
                    <VideoList videos={videos} onAddVideo={handleAddVideo} setVideos={setVideos} defaultSettings={defaultSettings} />
                    <LogPanel />
                </div>
            </div>
            <div className="bottom-upload-bar">
                <UploadControlPanel 
                    videos={videos} 
                    accountId={selectedAccountId} // Gunakan state baru
                    onUpdateVideoStatus={handleUpdateVideoStatus} 
                />
            </div>
        </>
    );
};

function MainTabs({ user }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { addLog } = useLogger();
    const [defaultSettings, setDefaultSettings] = useState({
        prefix: '',
        tags: 'shorts,fyp,viral',
        description: '',
        comment: '',
        category: '22',
        privacyStatus: 'public',
    });

    const handleSaveSettings = (newSettings) => {
        setDefaultSettings(newSettings);
        addLog('Pengaturan default berhasil disimpan!');
        alert('Pengaturan default berhasil disimpan!');
    };

    const tabs = ['dashboard', 'History Upload', 'Pengaturan Default'];
    if (user && user.role === 'admin') {
        tabs.push('admin');
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardContent defaultSettings={defaultSettings} />;
            case 'History Upload':
                return <HistoryPage />;
            case 'Pengaturan Default':
                return <DefaultSettingsPanel settings={defaultSettings} onSave={handleSaveSettings} />;
            case 'admin':
                return user && user.role === 'admin' ? <AdminPanel /> : null;
            default:
                return null;
        }
    };

    return (
        <div className="main-tabs-container">
            <nav className="main-tabs-nav">
                {tabs.map(tab => (
                    <a
                        key={tab}
                        href="#"
                        className={`main-tab-item ${activeTab === tab ? 'active' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            setActiveTab(tab);
                        }}
                    >
                        {tab}
                    </a>
                ))}
            </nav>
            <div className="tab-content">
                {renderContent()}
            </div>
        </div>
    );
}

export default MainTabs;