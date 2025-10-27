const { contextBridge, ipcRenderer } = require('electron');

// Ekspos API yang aman untuk renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // API untuk mendapatkan informasi backend
  getBackendInfo: () => ipcRenderer.invoke('get-backend-info'),

  // API untuk komunikasi dengan backend server
  sendToBackend: async (endpoint, data) => {
    try {
      const response = await fetch(`http://localhost:7033${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      return await response.json();
    } catch (error) {
      console.error('Error communicating with backend:', error);
      throw error;
    }
  },

  // API untuk upload file ke backend
  uploadToBackend: async (filePath, endpoint = '/api/upload') => {
    try {
      const formData = new FormData();
      formData.append('video', filePath);

      const response = await fetch(`http://localhost:6033${endpoint}`, {
        method: 'POST',
        body: formData
      });

      return await response.json();
    } catch (error) {
      console.error('Error uploading to backend:', error);
      throw error;
    }
  },

  // API untuk upload video ke backend
  uploadVideo: async (filePath, metadata) => {
    try {
      const formData = new FormData();
      formData.append('video', filePath);
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const response = await fetch('http://localhost:7033/api/upload', {
        method: 'POST',
        body: formData
      });

      return await response.json();
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  },

  // API untuk mendapatkan daftar video
  getVideos: async () => {
    try {
      const response = await fetch('http://localhost:7033/api/videos');
      return await response.json();
    } catch (error) {
      console.error('Error getting videos:', error);
      throw error;
    }
  },

  // API untuk mendapatkan informasi akun
  getAccountInfo: async () => {
    try {
      const response = await fetch('http://localhost:7033/api/account');
      return await response.json();
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  },

  // API untuk autentikasi
  login: async (credentials) => {
    try {
      const response = await fetch('http://localhost:7033/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      return await response.json();
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  },

  // API untuk mendapatkan Gemini service info
  getGeminiInfo: async () => {
    try {
      const response = await fetch('http://localhost:7033/api/gemini');
      return await response.json();
    } catch (error) {
      console.error('Error getting Gemini info:', error);
      throw error;
    }
  },

  // Platform info
  platform: process.platform,

  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});