import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const {localWallpaperApi}=createRequire(import.meta.url)('../electron/local-wallpaper-api.cjs');
test('el fondo del servidor solo se entrega a solicitudes locales de su propio origen',async()=>{
 let reads=0;const middleware=localWallpaperApi(async()=>{reads++;return 'data:image/png;base64,local';});
 const request=async(host:string,remoteAddress:string,origin?:string,method='GET')=>{const res={statusCode:200,body:'',setHeader(){},end(body:string){this.body=body;}};await middleware({url:'/api/local-wallpaper',method,headers:{host,origin},socket:{remoteAddress}},res,()=>{});return res;};
 expect((await request('localhost:5190','127.0.0.1','http://localhost:5190')).body).toContain('data:image/png');expect(reads).toBe(1);
 for(const [host,address,origin] of [['evil.example:5190','127.0.0.1',undefined],['localhost:5190','192.168.1.2',undefined],['localhost:5190','127.0.0.1','https://evil.example']])expect((await request(host!,address!,origin)).statusCode).toBe(403);
 expect(reads).toBe(1);expect((await request('localhost:5190','127.0.0.1',undefined,'POST')).statusCode).toBe(405);
});

test('npm run dev expone el servicio local de fondo',async({request})=>{
 const response=await request.get('/api/local-wallpaper');expect(response.status()).toBe(200);expect(response.headers()['cache-control']).toBe('no-store');const data=await response.json();expect(data.image===null||String(data.image).startsWith('data:image/')).toBe(true);
});

test('KDE puede leer un fondo configurado como carpeta de tema',async()=>{
 const fs=createRequire(import.meta.url)('node:fs/promises'),os=createRequire(import.meta.url)('node:os'),path=createRequire(import.meta.url)('node:path');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'room-wallpaper-test-')),previousHome=os.homedir,previousDesktop=process.env.XDG_CURRENT_DESKTOP;
 try{const theme=path.join(dir,'theme'),images=path.join(theme,'contents','images');await fs.mkdir(images,{recursive:true});await fs.mkdir(path.join(dir,'.config'));const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7mQAAAAASUVORK5CYII=','base64');await fs.writeFile(path.join(images,'1920x1080.png'),bytes);await fs.writeFile(path.join(dir,'.config','plasma-org.kde.plasma.desktop-appletsrc'),`[Containments][1][Wallpaper][org.kde.image][General]\nImage=${theme}\n`);os.homedir=()=>dir;process.env.XDG_CURRENT_DESKTOP='KDE';const {getWallpaper}=createRequire(import.meta.url)('../electron/wallpaper.cjs');expect(await getWallpaper()).toBe(`data:image/png;base64,${bytes.toString('base64')}`);
 }finally{os.homedir=previousHome;if(previousDesktop===undefined)delete process.env.XDG_CURRENT_DESKTOP;else process.env.XDG_CURRENT_DESKTOP=previousDesktop;await fs.rm(dir,{recursive:true,force:true});}
});
