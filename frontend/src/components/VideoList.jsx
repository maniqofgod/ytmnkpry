import React, { useState, useRef } from 'react';
import './VideoList.css';
import VideoDetailPopup from './VideoDetailPopup';

function VideoList({ videos, onAddVideo, setVideos, defaultSettings }) {
    const [selectedVideos, setSelectedVideos] = useState(new Set());
    const [editingVideo, setEditingVideo] = useState(null);
    const [batchEditQueue, setBatchEditQueue] = useState([]);
    const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            onAddVideo(file);
        });

        event.target.value = null; 
    };
    
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allVideoIds = new Set(videos.map(v => v.id));
            setSelectedVideos(allVideoIds);
        } else {
            setSelectedVideos(new Set());
        }
    };

    const handleSelectOne = (videoId) => {
        const newSelection = new Set(selectedVideos);
        if (newSelection.has(videoId)) {
            newSelection.delete(videoId);
        } else {
            newSelection.add(videoId);
        }
        setSelectedVideos(newSelection);
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedVideos.size} video yang dipilih?`)) {
            setVideos(currentVideos => currentVideos.filter(v => !selectedVideos.has(v.id)));
            setSelectedVideos(new Set());
        }
    };

    const handleAddVideoClick = () => {
        fileInputRef.current.click();
    };

    const handleEditClick = (video) => {
        setEditingVideo(video);
    };
    
    const handleEditDetailClick = () => {
        if (selectedVideos.size !== 1) return;
        const videoId = selectedVideos.values().next().value;
        const videoToEdit = videos.find(v => v.id === videoId);
        setEditingVideo(videoToEdit);
    };

    const handleBatchEditClick = () => {
        if (selectedVideos.size === 0) return;

        // Create queue of videos to edit
        const queue = Array.from(selectedVideos).map(videoId =>
            videos.find(v => v.id === videoId)
        ).filter(Boolean);

        setBatchEditQueue(queue);
        setCurrentBatchIndex(0);
        setEditingVideo(queue[0]);
    };

    const handleClosePopup = () => {
        setEditingVideo(null);
    };

    const handleSaveDetails = (updatedVideo) => {
        setVideos(currentVideos =>
            currentVideos.map(v =>
                v.id === updatedVideo.id
                ? { ...updatedVideo, status: 'Edited' }
                : v
            )
        );

        // Handle batch editing - move to next video
        if (batchEditQueue.length > 0) {
            const nextIndex = currentBatchIndex + 1;
            if (nextIndex < batchEditQueue.length) {
                setCurrentBatchIndex(nextIndex);
                setEditingVideo(batchEditQueue[nextIndex]);
            } else {
                // Batch editing complete
                setBatchEditQueue([]);
                setCurrentBatchIndex(0);
                setEditingVideo(null);
                setSelectedVideos(new Set());
            }
        } else {
            handleClosePopup();
        }
    };

    return (
        <div className="video-list-wrapper">
            <h4>Daftar Video</h4>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="video/*" multiple />
            <div className="video-table-container">
                <table className="video-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" onChange={handleSelectAll} checked={selectedVideos.size === videos.length && videos.length > 0} /></th>
                            <th>#</th>
                            <th>Status</th>
                            <th>File Video</th>
                            <th>Judul YouTube</th>
                        </tr>
                    </thead>
                    <tbody>
                        {videos.length > 0 ? (
                            videos.map((video, index) => (
                                <tr key={video.id} 
                                    onDoubleClick={() => handleEditClick(video)}
                                    className={selectedVideos.has(video.id) ? 'selected' : ''}>
                                    <td><input type="checkbox" checked={selectedVideos.has(video.id)} onChange={() => handleSelectOne(video.id)} /></td>
                                    <td>{index + 1}</td>
                                    <td>{video.status}</td>
                                    <td>{video.file_path}</td>
                                    <td>{video.title}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="empty-table-message">
                                    Tidak ada video. Klik "Tambah Video" untuk memulai.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="video-list-actions">
                <div className="actions-left">
                    <button className="btn-standard" onClick={handleAddVideoClick}>Tambah Video</button>
                    <button className="btn-standard" onClick={handleEditDetailClick} disabled={selectedVideos.size !== 1}>Edit Detail</button>
                    <button className="btn-standard" onClick={handleBatchEditClick} disabled={selectedVideos.size === 0}>Batch Edit Terpilih</button>
                    <button className="btn-standard" onClick={handleDeleteSelected} disabled={selectedVideos.size === 0}>Hapus Terpilih</button>
                </div>
                <div className="actions-right">
                    {/* Tombol Simpan dan Muat Daftar telah dihapus */}
                </div>
            </div>
            <VideoDetailPopup
                video={editingVideo}
                onClose={handleClosePopup}
                onSave={handleSaveDetails}
                defaultSettings={defaultSettings}
                batchInfo={batchEditQueue.length > 0 ? {
                    current: currentBatchIndex,
                    total: batchEditQueue.length
                } : null}
            />
        </div>
    );
}

export default VideoList;