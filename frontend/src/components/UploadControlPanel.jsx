import React, { useState, useRef } from 'react';
import { uploadVideo } from '../api';
import axios from 'axios';
import './UploadControlPanel.css';
import { useLogger } from '../contexts/LogContext';

const SuccessPopup = ({ message, onClose }) => (
    <div className="popup-overlay-small">
        <div className="popup-content-small">
            <p>{message}</p>
            <button onClick={onClose} className="btn-standard">OK</button>
        </div>
    </div>
);

function UploadControlPanel({ videos, accountId, onUpdateVideoStatus }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentUploadingFile, setCurrentUploadingFile] = useState('');
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const abortControllerRef = useRef(null);
    const { addLog, clearLogs } = useLogger();

    const handleUploadToggle = async () => {
        if (isUploading) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                addLog('Proses unggah dihentikan oleh pengguna.', 'WARN');
            }
            setIsUploading(false);
            return;
        }

        if (!accountId) {
            const msg = "Gagal memulai: Silakan pilih akun Google terlebih dahulu.";
            alert(msg);
            addLog(msg, 'ERROR');
            return;
        }

        setIsUploading(true);
        const videosToUpload = videos.filter(v => v.status === 'Menunggu' || v.status === 'Edited');
        let successfulUploads = 0;
        addLog(`Memulai proses unggah untuk ${videosToUpload.length} video.`);

        for (const video of videosToUpload) {
            abortControllerRef.current = new AbortController();

            setCurrentUploadingFile(video.file.name);
            setUploadProgress(0);
            onUpdateVideoStatus(video.id, 'Mengunggah...');
            addLog(`Mengunggah file: ${video.file.name}...`);

            const formData = new FormData();
            formData.append('videoId', video.id);
            formData.append('videoFile', video.file);
            formData.append('accountId', accountId);
            formData.append('title', video.title || '');
            formData.append('description', video.description || '');
            formData.append('categoryId', video.category || '22');
            formData.append('privacyStatus', video.privacyStatus || 'public');
            formData.append('tags', video.tags || '');
if (video.thumbnail) {
    formData.append('thumbnailFile', video.thumbnail);
}
if (video.audioFile) {
    formData.append('audioFile', video.audioFile);
}

            try {
                await uploadVideo(
                    formData, 
                    (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    },
                    abortControllerRef.current.signal
                );
                onUpdateVideoStatus(video.id, 'Sukses');
                addLog(`Unggah berhasil: ${video.file.name}`, 'SUCCESS');
                successfulUploads++;
            } catch (err) {
                if (axios.isCancel(err)) {
                    onUpdateVideoStatus(video.id, 'Dibatalkan');
                    addLog(`Unggahan dibatalkan: ${video.file.name}`, 'WARN');
                } else {
                    const errorMsg = err.response?.data || err.message;
                    onUpdateVideoStatus(video.id, 'Gagal');
                    addLog(`Unggah gagal: ${video.file.name}. Alasan: ${errorMsg}`, 'ERROR');
                }
                break; 
            }
        }

        addLog('Proses unggah selesai.');
        setIsUploading(false);
        setCurrentUploadingFile('');
        setUploadProgress(0);
        abortControllerRef.current = null;

        if (successfulUploads > 0) {
            setSuccessMessage(`${successfulUploads} video berhasil diunggah.`);
            setShowSuccessPopup(true);
        }
    };

    const getVideosToUploadCount = () => {
        return videos.filter(v => v.status === 'Menunggu' || v.status === 'Edited').length;
    }

    return (
        <>
            {showSuccessPopup && <SuccessPopup message={successMessage} onClose={() => setShowSuccessPopup(false)} />}
            <div className="upload-control-container glass-card">
                <div className="upload-buttons">
                    <button 
                        className={`upload-toggle-btn ${isUploading ? 'stop' : 'start'}`}
                        onClick={handleUploadToggle}
                        disabled={!isUploading && getVideosToUploadCount() === 0}
                    >
                        {isUploading ? 'STOP UPLOAD' : `START UPLOAD (${getVideosToUploadCount()})`}
                    </button>
                </div>
                <div className="upload-options">
                    <label>
                        <input type="checkbox" defaultChecked />
                        Hapus video sukses dari daftar
                    </label>
                    <button onClick={clearLogs} className="clear-log-btn">Hapus Log Status</button>
                </div>
                <div className="upload-progress">
                    <span>{isUploading ? `Mengunggah: ${currentUploadingFile}` : 'Proses Upload'}</span>
                    <progress value={uploadProgress} max="100"></progress>
                </div>
            </div>
        </>
    );
}

export default UploadControlPanel;