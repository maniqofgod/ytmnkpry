import React, { useState, useEffect } from 'react';
import './DefaultSettingsPanel.css';

function DefaultSettingsPanel({ settings, onSave }) {
    const [currentSettings, setCurrentSettings] = useState({
        ...settings,
        privacyStatus: settings.privacyStatus || 'public'
    });

    useEffect(() => {
        setCurrentSettings({
            ...settings,
            privacyStatus: settings.privacyStatus || 'public'
        });
    }, [settings]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        // Remap id to state key
        const keyMap = {
            'prefix-judul': 'prefix',
            'tags-default': 'tags',
            'deskripsi-default': 'description',
            'komentar-default': 'comment',
            'kategori-default': 'category',
            'privacy-default': 'privacyStatus'
        };
        setCurrentSettings(prev => ({ ...prev, [keyMap[id]]: value }));
    };

    const handleSave = () => {
        onSave(currentSettings);
    };

    return (
        <>
            <div className="panel-container-grid">
                <div className="form-group">
                    <label htmlFor="prefix-judul">Prefix Judul:</label>
                    <input type="text" id="prefix-judul" value={currentSettings.prefix} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="tags-default">Tags Default:</label>
                    <input type="text" id="tags-default" value={currentSettings.tags} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="deskripsi-default">Deskripsi Default:</label>
                    <textarea id="deskripsi-default" rows="3" value={currentSettings.description} onChange={handleChange}></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="komentar-default">Komentar Default:</label>
                    <textarea id="komentar-default" rows="3" value={currentSettings.comment} onChange={handleChange}></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="kategori-default">Kategori Default:</label>
                    <select id="kategori-default" value={currentSettings.category} onChange={handleChange}>
                        <option value="1">Film & Animation</option>
                        <option value="2">Autos & Vehicles</option>
                        <option value="10">Music</option>
                        <option value="15">Pets & Animals</option>
                        <option value="17">Sports</option>
                        <option value="19">Travel & Events</option>
                        <option value="20">Gaming</option>
                        <option value="22">People & Blogs</option>
                        <option value="23">Comedy</option>
                        <option value="24">Entertainment</option>
                        <option value="25">News & Politics</option>
                        <option value="26">Howto & Style</option>
                        <option value="27">Education</option>
                        <option value="28">Science & Technology</option>
                        <option value="29">Nonprofits & Activism</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="privacy-default">Status Privasi Default:</label>
                    <select id="privacy-default" value={currentSettings.privacyStatus} onChange={handleChange}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="unlisted">Unlisted</option>
                    </select>
                </div>
            </div>
            <div className="actions-container">
                <button onClick={handleSave} className="primary-button">Save</button>
            </div>
        </>
    );
}

export default DefaultSettingsPanel;