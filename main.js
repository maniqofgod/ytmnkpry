const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs').promises;

let mainWindow;
let backendProcess;
let frontendProcess;

// Konfigurasi sesuai dengan ecosystem.config.js
const BACKEND_PORT = 7033;
const FRONTEND_PORT = 6033;

// Fungsi untuk mencari file backend server secara rekursif
async function findBackendServer(searchDir) {
  try {
    const files = await fs.readdir(searchDir);

    for (const file of files) {
      const filePath = path.join(searchDir, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory() && file === 'backend') {
        const backendServerPath = path.join(filePath, 'server.js');
        try {
          await fs.access(backendServerPath);
          return backendServerPath;
        } catch (error) {
          // File tidak ada, lanjutkan pencarian
        }
      } else if (stat.isDirectory()) {
        const found = await findBackendServer(filePath);
        if (found) return found;
      }
    }
  } catch (error) {
    console.error('Error searching for backend server:', error);
  }
  return null;
}

// Fungsi untuk mencari file frontend server secara rekursif
async function findFrontendServer(searchDir) {
  try {
    const files = await fs.readdir(searchDir);

    for (const file of files) {
      const filePath = path.join(searchDir, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory() && file === 'frontend') {
        const frontendDistPath = path.join(filePath, 'dist', 'server.js');
        try {
          await fs.access(frontendDistPath);
          return {
            scriptPath: frontendDistPath,
            workingDir: path.join(filePath, 'dist')
          };
        } catch (error) {
          // File tidak ada, lanjutkan pencarian
        }
      } else if (stat.isDirectory()) {
        const found = await findFrontendServer(filePath);
        if (found) return found;
      }
    }
  } catch (error) {
    console.error('Error searching for frontend server:', error);
  }
  return null;
}

// Fungsi untuk restart backend dengan path yang baru ditemukan
function startBackendWithPath(backendPath, resolve, reject) {
  const backendDir = path.dirname(backendPath);

  console.log('Restarting backend with found path:', backendPath);

  const { exec } = require('child_process');
  const nodeCommand = `"${backendPath}"`;
  const newBackendProcess = exec(`node ${nodeCommand}`, {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: BACKEND_PORT.toString(),
      ELECTRON_RUN_AS_NODE: '1'
    }
  });

  // Handle output seperti sebelumnya
  newBackendProcess.stdout.on('data', (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  newBackendProcess.stderr.on('data', (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  newBackendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  // Check if server is ready
  const checkServer = () => {
    const req = http.request({
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: '/',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        setTimeout(checkServer, 500);
      }
    });

    req.on('error', () => {
      setTimeout(checkServer, 500);
    });

    req.on('timeout', () => {
      setTimeout(checkServer, 500);
    });

    req.end();
  };

  setTimeout(checkServer, 2000);
}

// Fungsi untuk restart frontend dengan path yang baru ditemukan
function startFrontendWithPath(found, resolve, reject) {
  console.log('Restarting frontend with found path:', found);

  const { exec } = require('child_process');
  const nodeCommand = `"${found.scriptPath}"`;
  const newFrontendProcess = exec(`node ${nodeCommand}`, {
    cwd: found.workingDir,
    env: { ...process.env, NODE_ENV: 'production', PORT: FRONTEND_PORT }
  });

  // Handle output seperti sebelumnya
  newFrontendProcess.stdout.on('data', (data) => {
    console.log(`Frontend stdout: ${data}`);
    if (data.toString().includes('Local:') || data.toString().includes('Server running')) {
      resolve();
    }
  });

  newFrontendProcess.stderr.on('data', (data) => {
    console.error(`Frontend stderr: ${data}`);
  });

  newFrontendProcess.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
  });

  // Timeout fallback
  setTimeout(() => {
    resolve();
  }, 5000);
}

// Jalankan backend server sebagai child process
function startBackendServer() {
  return new Promise((resolve, reject) => {
    try {
      // Gunakan path yang kompatibel dengan production build
      const isPackaged = app.isPackaged;
      let backendPath, backendDir;

      if (isPackaged) {
        // Saat production, cari di dalam resources
        backendPath = path.join(process.resourcesPath, 'backend', 'server.js');
        backendDir = path.join(process.resourcesPath, 'backend');
      } else {
        // Saat development, gunakan path relatif
        backendPath = path.join(__dirname, 'backend', 'server.js');
        backendDir = path.join(__dirname, 'backend');
      }

      console.log('Is packaged:', isPackaged);
      console.log('Backend path:', backendPath);
      console.log('Backend directory:', backendDir);
      console.log('Resources path:', process.resourcesPath);
      console.log('Current working directory:', __dirname);
      console.log('Node executable:', process.execPath);

      // Jalankan backend server menggunakan child_process.exec dengan command shell
      const { exec } = require('child_process');

      console.log('Backend path:', backendPath);
      console.log('Backend directory:', backendDir);

      // Gunakan exec dengan command lengkap untuk menjalankan node
      const nodeCommand = `"${backendPath}"`;

      backendProcess = exec(`node ${nodeCommand}`, {
        cwd: backendDir,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: BACKEND_PORT.toString(),
          ELECTRON_RUN_AS_NODE: '1'
        }
      });

      // Handle spawn errors dengan informasi lebih detail
      backendProcess.on('error', (error) => {
        console.error('Failed to start backend process:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          errno: error.errno,
          path: backendPath,
          cwd: backendDir
        });

        // Coba cari file backend server secara rekursif
        findBackendServer(backendDir).then(foundPath => {
          if (foundPath) {
            console.log('Found backend server at:', foundPath);
            // Restart dengan path yang benar
            startBackendWithPath(foundPath, resolve, reject);
          } else {
            console.error('Backend server not found in any location');
            reject(error);
          }
        }).catch(() => {
          reject(error);
        });
      });

      // Tunggu hingga server backend siap
      const checkServer = () => {
      const req = http.request({
        hostname: 'localhost',
        port: BACKEND_PORT,
        path: '/',
        method: 'GET',
        timeout: 1000
      }, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(checkServer, 500);
        }
      });

      req.on('error', () => {
        setTimeout(checkServer, 500);
      });

      req.on('timeout', () => {
        setTimeout(checkServer, 500);
      });

      req.end();
    };

    // Log output dari backend
    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend stdout: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend stderr: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    // Mulai pengecekan server
    setTimeout(checkServer, 2000);
    } catch (error) {
      console.error('Error spawning backend process:', error);
      reject(error);
    }
  });
}

// Jalankan frontend server sesuai dengan ecosystem.config.js
function startFrontendServer() {
  return new Promise((resolve, reject) => {
    try {
      // Gunakan script yang sama dengan PM2: frontend/dist/server.js
      const isPackaged = app.isPackaged;
      let frontendScriptPath, frontendWorkingDir;

      if (isPackaged) {
        // Saat production, cari di dalam resources
        frontendScriptPath = path.join(process.resourcesPath, 'frontend', 'dist', 'server.js');
        frontendWorkingDir = path.join(process.resourcesPath, 'frontend', 'dist');
      } else {
        // Saat development, gunakan path relatif
        frontendScriptPath = path.join(__dirname, 'frontend', 'dist', 'server.js');
        frontendWorkingDir = path.join(__dirname, 'frontend', 'dist');
      }

      console.log('Frontend is packaged:', isPackaged);
      console.log('Frontend script path:', frontendScriptPath);
      console.log('Frontend working directory:', frontendWorkingDir);
  
      console.log('Frontend script path:', frontendScriptPath);
      console.log('Frontend working directory:', frontendWorkingDir);
      console.log('Node executable path:', process.execPath);
  
      // Jalankan script server.js seperti di ecosystem.config.js
      const { exec } = require('child_process');
      const nodeCommand = `"${frontendScriptPath}"`;
      frontendProcess = exec(`node ${nodeCommand}`, {
        cwd: frontendWorkingDir,
        env: { ...process.env, NODE_ENV: 'production', PORT: FRONTEND_PORT }
      });

      // Handle spawn errors dengan informasi lebih detail
      frontendProcess.on('error', (error) => {
        console.error('Failed to start frontend process with server.js, trying fallback:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          errno: error.errno,
          path: frontendScriptPath,
          cwd: frontendWorkingDir
        });

        // Coba cari file frontend server secara rekursif
        findFrontendServer(process.resourcesPath || __dirname).then(found => {
          if (found) {
            console.log('Found frontend server at:', found);
            // Restart dengan path yang benar
            startFrontendWithPath(found, resolve, reject);
          } else {
            console.error('Frontend server not found in any location, using fallback');
            // Fallback: Buat simple HTTP server sendiri
            startSimpleFrontendServer(resolve, reject);
          }
        }).catch(() => {
          // Fallback: Buat simple HTTP server sendiri
          startSimpleFrontendServer(resolve, reject);
        });
      });

      // Log output dari frontend server seperti PM2
      frontendProcess.stdout.on('data', (data) => {
        console.log(`Frontend stdout: ${data}`);
        // Jika serve berhasil start, resolve promise
        if (data.toString().includes('Local:') || data.toString().includes('Server running')) {
          resolve();
        }
      });

      frontendProcess.stderr.on('data', (data) => {
        console.error(`Frontend stderr: ${data}`);
      });

      frontendProcess.on('close', (code) => {
        console.log(`Frontend process exited with code ${code}`);
      });

      // Timeout fallback seperti PM2
      setTimeout(() => {
        resolve();
      }, 5000);
    } catch (error) {
      console.error('Error spawning frontend process:', error);
      startSimpleFrontendServer(resolve, reject);
    }
  });
}

// Simple HTTP server sebagai fallback untuk frontend
function startSimpleFrontendServer(resolve, reject) {
  try {
    const http = require('http');
    const fs = require('fs');
    const path = require('path');

    const isPackaged = app.isPackaged;
    const frontendPath = isPackaged
      ? path.join(process.resourcesPath, 'frontend', 'dist')
      : path.join(__dirname, 'frontend', 'dist');

    frontendProcess = http.createServer((req, res) => {
      let filePath = path.join(frontendPath, req.url === '/' ? 'index.html' : req.url);

      // Set default to index.html for SPA routing
      if (req.url !== '/' && !path.extname(filePath)) {
        filePath = path.join(frontendPath, 'index.html');
      }

      const extname = String(path.extname(filePath)).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.webp': 'image/webp',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
      };

      const contentType = mimeTypes[extname] || 'application/octet-stream';

      fs.readFile(filePath, (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            // File not found, serve index.html for SPA routing
            fs.readFile(path.join(frontendPath, 'index.html'), (err, indexContent) => {
              if (err) {
                res.writeHead(500);
                res.end(`Error: ${err.code}`);
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(indexContent, 'utf-8');
              }
            });
          } else {
            res.writeHead(500);
            res.end(`Server Error: ${error.code}`);
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    }).listen(FRONTEND_PORT);

    console.log(`Simple frontend server running at http://localhost:${FRONTEND_PORT}`);
    resolve();

  } catch (error) {
    console.error('Error creating simple frontend server:', error);
    reject(error);
  }
}

function createWindow() {
  // Buat window utama
  const isPackaged = app.isPackaged;
  const preloadPath = isPackaged
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, 'preload.js');

  const iconPath = isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.png')
    : path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    icon: iconPath,
    show: false
  });

  // Tunggu hingga backend siap sebelum menampilkan window
  Promise.all([startBackendServer(), startFrontendServer()])
    .then(() => {
      // Load aplikasi frontend
      mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);

      // Show window ketika siap
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
      });

      // Buka DevTools di development
      if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
      }
    })
    .catch((error) => {
      console.error('Error starting servers:', error);
    });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;

    // Tutup backend dan frontend process ketika window ditutup
    if (backendProcess) {
      backendProcess.kill();
    }
    if (frontendProcess) {
      frontendProcess.kill();
    }
  });
}

// App event listeners
app.whenReady().then(() => {
  createWindow();

  // Untuk macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Tutup aplikasi ketika semua windows ditutup (kecuali macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }

  // Cleanup backend dan frontend process
  if (backendProcess) {
    backendProcess.kill();
  }
  if (frontendProcess) {
    frontendProcess.kill();
  }
});

// Handle app sebelum quit
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (frontendProcess) {
    frontendProcess.kill();
  }
});

// IPC handlers untuk komunikasi dengan renderer process
ipcMain.handle('get-backend-info', async () => {
  return {
    port: BACKEND_PORT,
    status: 'running'
  };
});