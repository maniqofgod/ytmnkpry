import React, { useState, useEffect, useRef } from 'react';
import './VideoDetailPopup.css';
import { generateContent } from '../api';
import { useLogger } from '../contexts/LogContext';

// Helper to get a default schedule time (e.g., 24 hours from now)
const getDefaultScheduleTime = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const dateString = date.toISOString().split('T')[0];
    const timeString = date.toTimeString().split(' ')[0].substring(0, 5);
    return { dateString, timeString };
};

const VideoDetailPopup = ({ video, onClose, onSave, defaultSettings, batchInfo }) => {
    const [details, setDetails] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationOptions, setGenerationOptions] = useState({
        promptTemplate: 'indonesia',
        language: 'indonesia',
        model: 'models/gemini-2.0-flash-exp'
    });
   const thumbnailFileRef = useRef(null);
   const audioFileRef = useRef(null);
   const { addLog } = useLogger();

  useEffect(() => {
    if (video) {
      const initialDetails = {
        ...defaultSettings,
        ...video,
        title: video.title || `${defaultSettings.prefix || ''}${video.file_path.split('.').slice(0, -1).join('.')}`,
        publishType: video.publishType || 'now',
        scheduleDate: video.scheduleDate || '',
        scheduleTime: video.scheduleTime || '',
        privacyStatus: video.privacyStatus || defaultSettings.privacyStatus || 'public',
      };
      setDetails(initialDetails);
    }
  }, [video, defaultSettings]);

  // Removed loadGeminiInfo since we don't need model selection anymore

  if (!video) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'publishType' && value === 'schedule') {
        // If switching to schedule and no date/time is set, provide a default
        if (!details.scheduleDate && !details.scheduleTime) {
            const { dateString, timeString } = getDefaultScheduleTime();
            setDetails(prev => ({ 
                ...prev, 
                publishType: 'schedule',
                scheduleDate: dateString,
                scheduleTime: timeString
            }));
        } else {
            setDetails(prev => ({ ...prev, publishType: 'schedule' }));
        }
    } else {
        setDetails(prev => ({ ...prev, [name]: type === 'radio' ? value : value }));
    }
  };

  const handleFileSelect = (fileRef, fieldName) => {
    const file = fileRef.current.files[0];
    if (file) {
        setDetails(prev => ({ ...prev, [fieldName]: file }));
        addLog(`File dipilih untuk ${fieldName}: ${file.name}`);
    }
  };

  const handleGenerateContent = async () => {
    if (!video?.file_path) return;

    setIsGenerating(true);
    try {
      console.log('Generating content with options:', generationOptions);
      const response = await generateContent(video.file_path, generationOptions);
      console.log('Generate response:', response);
      console.log('Response data:', response.data);

      // Use the generated result
      const resultData = response.data;

      // Update form fields with generated content
      setDetails(prev => {
        const newDetails = {
          ...prev,
          title: resultData.title || prev.title,
          description: resultData.description || prev.description,
          tags: resultData.tags || prev.tags
        };
        console.log('Updated details:', newDetails);
        return newDetails;
      });

      // Show detailed success message
      const modelInfo = resultData.modelInfo ? ` menggunakan model ${resultData.modelInfo.name}` : '';
      const languageInfo = generationOptions.language !== 'indonesia' ?
        ` dalam bahasa ${generationOptions.language === 'english' ? 'English' : generationOptions.language === 'sunda' ? 'Sunda' : generationOptions.language}` : '';

      addLog(`Konten berhasil di-generate${modelInfo}${languageInfo}`, 'SUCCESS');

      // Show additional info if available
      if (resultData.generated === false) {
        addLog(`AI tidak tersedia, menggunakan konten default: ${resultData.error || 'Tidak ada API key Gemini yang dikonfigurasi'}`, 'WARNING');
      }

      // Alert for debugging - removed for production
      console.log('Generate berhasil! Judul:', resultData.title, 'Deskripsi:', resultData.description, 'Tags:', resultData.tags);

    } catch (error) {
      console.error('Generate content error:', error);
      let errorMessage = error.response?.data || error.message;

      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        errorMessage = `Rate limit tercapai. ${errorMessage}`;
      }

      // Handle error - just show the fallback content that was already set in details
      console.log('Error occurred, using fallback content that was set in details');

      // Handle case when no Gemini API is available
      if (errorMessage.includes('Tidak ada API Gemini yang tersedia')) {
        addLog('Tidak ada API key Gemini yang dikonfigurasi. Silakan tambahkan API key di panel admin.', 'WARNING');
      } else {
        addLog(`Gagal generate konten: ${errorMessage}`, 'ERROR');
      }

      // Alert for debugging - removed for production
      // alert(`Error generate: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    const finalDetails = { ...details };

    if (finalDetails.publishType === 'schedule') {
        if (!finalDetails.scheduleDate || !finalDetails.scheduleTime) {
            alert('Silakan tentukan tanggal dan waktu penjadwalan.');
            setIsSaving(false);
            return;
        }
        // Combine date and time and convert to ISO 8601 UTC string
        const localDateTime = new Date(`${finalDetails.scheduleDate}T${finalDetails.scheduleTime}`);
        finalDetails.publishAt = localDateTime.toISOString();
    }

    // Clean up temporary fields before saving
    delete finalDetails.scheduleDate;
    delete finalDetails.scheduleTime;

    try {
      // Call onSave which handles batch editing logic
      await onSave(finalDetails);
      addLog(`Detail untuk video "${finalDetails.title}" berhasil disimpan.`, 'SUCCESS');
    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      addLog(`Gagal menyimpan detail untuk "${finalDetails.title}". Alasan: ${errorMsg}`, 'ERROR');
      alert('Gagal menyimpan detail video ke server.');
      setIsSaving(false);
      return;
    }

    // Only close popup if not in batch mode (let VideoList handle it)
    if (!batchInfo) {
      onClose();
    }

    setIsSaving(false);
  };

  return (
    <div className="popup-overlay">
      <input type="file" ref={thumbnailFileRef} style={{ display: 'none' }} accept="image/*" onChange={() => handleFileSelect(thumbnailFileRef, 'thumbnail')} />
      <input type="file" ref={audioFileRef} style={{ display: 'none' }} accept="audio/*" onChange={() => handleFileSelect(audioFileRef, 'audioFile')} />
      <div className="popup-content">
        <div className="popup-header">
          <h3>
            Detail Video: {details.file_path}
            {batchInfo && (
              <span style={{ fontSize: '14px', color: '#8b949e', marginLeft: '10px' }}>
                ({batchInfo.current + 1} dari {batchInfo.total})
              </span>
            )}
          </h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="popup-body">
          {/* AI Generation Controls */}
          <div className="form-section ai-generation-section" style={{
            background: '#161b22',
            border: '2px solid #0366d6',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h4 style={{ color: '#0366d6', marginTop: '0' }}>🤖 Generate Konten AI</h4>
            <div className="ai-controls-grid">
              <div className="control-group">
                <label style={{ color: '#c9d1d9' }}>Bahasa:</label>
                <select
                  value={generationOptions.language}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, language: e.target.value }))}
                  className="language-select"
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    backgroundColor: '#161b22',
                    color: '#c9d1d9',
                    fontSize: '14px',
                    width: '100%'
                  }}
                >
                  <option value="indonesia">Bahasa Indonesia</option>
                  <option value="english">English</option>
                  <option value="sunda">Basa Sunda</option>
                </select>
              </div>
              <div className="control-group">
                <label>&nbsp;</label>
                <button
                  className="btn-generate-main"
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: isGenerating ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    width: '100%'
                  }}
                >
                  {isGenerating ? '⏳ Generating...' : '🚀 Generate AI'}
                </button>
              </div>
            </div>
          </div>

          {/* Video Details Section */}
          <div className="form-section">
            <h4>Detail Video</h4>
            <div className="form-group">
              <label>Judul:</label>
              <input type="text" name="title" value={details.title || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Deskripsi:</label>
              <textarea name="description" value={details.description || ''} onChange={handleChange}></textarea>
            </div>
            <div className="form-group">
              <label>Tags (pisahkan koma):</label>
              <input type="text" name="tags" value={details.tags || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section">
            <h4>Otomatisasi Pasca-Upload</h4>
            <div className="form-group">
              <label>Pilih Playlist:</label>
              <select name="playlistId" value={details.playlistId || ''} onChange={handleChange}>
                <option value="">(Jangan tambahkan)</option>
                {/* Populate with actual playlists */}
              </select>
            </div>
            <div className="form-group">
              <label>Atau ID Playlist:</label>
              <input type="text" name="playlistIdManual" value={details.playlistIdManual || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Komentar Otomatis:</label>
              <textarea name="comment" value={details.comment || ''} onChange={handleChange}></textarea>
            </div>
          </div>

          <div className="form-section">
            <h4>Pengaturan Lain & Proses Audio (FFmpeg)</h4>
            <div className="form-group">
              <label>Kategori:</label>
              <select name="category" value={details.category || '22'} onChange={handleChange}>
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
              <label>Thumbnail Kustom:</label>
              <div className="file-input-group">
                <input type="text" disabled value={details.thumbnail?.name || ''} />
                <button className="btn-standard" onClick={() => thumbnailFileRef.current.click()}>Pilih...</button>
              </div>
            </div>
            <div className="form-group">
              <label>File Audio Tambahan (FFmpeg):</label>
              <div className="file-input-group">
                <input type="text" disabled value={details.audioFile?.name || ''} />
                <button className="btn-standard" onClick={() => audioFileRef.current.click()}>Pilih...</button>
              </div>
            </div>
            <div className="form-group">
              <label>Untuk Anak-Anak?:</label>
              <select name="madeForKids" value={details.madeForKids || 'false'} onChange={handleChange}>
                <option value="false">Tidak</option>
                <option value="true">Ya</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status Privasi:</label>
              <select name="privacyStatus" value={details.privacyStatus || 'public'} onChange={handleChange}>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
              </select>
              <small style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                ⚠️ Pastikan judul video tidak kosong sebelum upload
              </small>
            </div>
            <div className="form-group">
              <label>Publikasikan:</label>
              <div className="radio-group">
                <label><input type="radio" name="publishType" value="now" checked={details.publishType === 'now'} onChange={handleChange} /> Langsung</label>
                <label><input type="radio" name="publishType" value="schedule" checked={details.publishType === 'schedule'} onChange={handleChange} /> Jadwalkan</label>
              </div>
            </div>
            {details.publishType === 'schedule' && (
              <div className="form-group">
                <label>Detail Jadwal (Waktu Lokal Anda)</label>
                <div className="schedule-group">
                  <input type="date" name="scheduleDate" value={details.scheduleDate || ''} onChange={handleChange} />
                  <input type="time" name="scheduleTime" value={details.scheduleTime || ''} onChange={handleChange} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="popup-footer">
          <button className="btn-standard btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan & Proses Audio (jika ada)'}
          </button>
          <button className="btn-standard" onClick={onClose}>Lewati Video Ini (Gunakan Default)</button>
        </div>
      </div>
    </div>
  );
};

export default VideoDetailPopup;