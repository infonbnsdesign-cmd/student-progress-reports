const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Student Progress Reports - Nava Bharath National School',
    icon: path.join(__dirname, '../logo/nbns.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  // Remove default menu bar for clean app feel, but allow shortcuts
  Menu.setApplicationMenu(null);

  // Load the built HTML file
  win.loadFile(path.join(__dirname, '../dist/index.html'));

  // Maximize by default for nice presentation
  win.maximize();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
