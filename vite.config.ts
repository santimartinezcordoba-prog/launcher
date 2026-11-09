import { defineConfig } from 'vite';
import { createRequire } from 'node:module';
const { storeDetails } = createRequire(import.meta.url)('./electron/store-details.cjs');
const {localWallpaperApi}=createRequire(import.meta.url)('./electron/local-wallpaper-api.cjs');
function storeApi(server: any) {
    server.middlewares.use(localWallpaperApi());
    server.middlewares.use(async (req: any, res: any, next: any) => {
        const match = /^\/api\/store-details\/(\d{1,10})$/.exec((req.url ?? '').split('?')[0]); if (!match) return next();
        if (req.method !== 'GET') { res.statusCode = 405; return res.end(); }
        res.setHeader('Content-Type', 'application/json');
        try { res.end(JSON.stringify(await storeDetails(match[1]))); } catch { res.statusCode = 502; res.end(JSON.stringify({ error: 'No se pudo consultar la tienda. Vuelve a intentarlo.' })); }
    });
}
export default defineConfig({ base: './', plugins: [{ name: 'public-store-details', configureServer: storeApi, configurePreviewServer: storeApi }] });
