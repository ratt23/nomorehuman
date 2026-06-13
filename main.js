const { app, BrowserWindow } = require('electron');
const path = require('path');
// Impor server yang sudah kita modifikasi
const { startServer } = require('./server.js');

function createWindow () {
  // Buat jendela browser.
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public/icon.png') // (Anda bisa menambahkan icon.png di folder public)
  });

  // Muat URL dari server Node.js kita
  win.loadURL('http://localhost:3000');
  
  // (Opsional) Buka DevTools untuk debugging
  // win.webContents.openDevTools();
}

// Panggil fungsi ini saat aplikasi Electron siap.
app.whenReady().then(() => {
  // Nyalakan server Node.js terlebih dahulu
  startServer().then(() => {
    // Setelah server siap, baru buat jendela aplikasi
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
});

// Keluar saat semua jendela ditutup (kecuali di macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});