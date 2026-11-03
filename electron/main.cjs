const { app, BrowserWindow, session, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
// A local secure origin lets GLTFLoader fetch packaged GLB files without
// disabling browser security or depending on a development HTTP server.
protocol.registerSchemesAsPrivileged([
  { scheme: 'room', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);
app.whenReady().then(() => {
  const dist = path.resolve(__dirname, '..', 'dist');
  protocol.handle('room', async request => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'launcher') return new Response('Not found', { status: 404 });
      const filename = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
      const relative = path.relative(dist, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 });
      return await net.fetch(pathToFileURL(filename).href, { method: request.method });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1000, minHeight: 650,
    backgroundColor: '#171716', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.loadURL('room://launcher/index.html');
});
app.on('window-all-closed', () => app.quit());
