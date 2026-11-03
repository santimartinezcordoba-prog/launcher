const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1000, minHeight: 650,
    backgroundColor: '#171716', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
});
app.on('window-all-closed', () => app.quit());
