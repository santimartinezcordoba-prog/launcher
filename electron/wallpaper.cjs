const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {fileURLToPath}=require('node:url');
const run=promisify(execFile);
async function command(name,args){try{return (await run(name,args,{timeout:4000,maxBuffer:1024*1024,windowsHide:true})).stdout.trim();}catch{return '';}}
function localPath(value){const v=value.trim().replace(/^['"]|['"]$/g,'');try{return v.startsWith('file:')?fileURLToPath(v):path.isAbsolute(v)?v:null;}catch{return null;}}
async function wallpaperPaths(){
 if(process.platform==='win32'){
  const output=await command('reg',['query','HKCU\\Control Panel\\Desktop','/v','WallPaper']);
  const match=output.match(/WallPaper\s+REG_SZ\s+(.+)/i);
  return [match?.[1],process.env.APPDATA&&path.join(process.env.APPDATA,'Microsoft','Windows','Themes','TranscodedWallpaper')].filter(Boolean);
 }
 if(process.platform==='darwin')return [await command('osascript',['-e','tell application "System Events" to get picture of current desktop'])];
 const candidates=[],desktop=(process.env.XDG_CURRENT_DESKTOP??'').toLowerCase();
 let kde=[];try{const config=await fs.readFile(path.join(os.homedir(),'.config','plasma-org.kde.plasma.desktop-appletsrc'),'utf8');kde=Array.from(config.matchAll(/^Image=(.+)$/gm),m=>m[1]);}catch{}
 if(desktop.includes('kde')&&kde.length)return kde;
 const mode=await command('gsettings',['get','org.gnome.desktop.interface','color-scheme']);
 for(const key of mode.includes('prefer-dark')?['picture-uri-dark','picture-uri']:['picture-uri','picture-uri-dark'])candidates.push(await command('gsettings',['get','org.gnome.desktop.background',key]));
 if(!desktop.includes('kde'))candidates.push(...kde);
 return candidates;
}
async function getWallpaper(){
 for(const value of await wallpaperPaths()){
  let filename=localPath(value);if(!filename)continue;
  try{if((await fs.stat(filename)).isDirectory()){let images=[];const folders=['contents/images','contents/images_dark'];for(const folder of folders){try{images=(await fs.readdir(path.join(filename,folder))).filter(name=>/\.(png|jpe?g|webp|bmp)$/i.test(name)).sort((a,b)=>{const size=s=>{const m=s.match(/(\d+)x(\d+)/);return m?Number(m[1])*Number(m[2]):0;};return size(b)-size(a);}).map(name=>path.join(filename,folder,name));if(images.length)break;}catch{}}if(!images.length)continue;filename=images[0];}const stat=await fs.stat(filename);if(!stat.isFile()||stat.size>20*1024*1024||stat.size<12)continue;const data=await fs.readFile(filename);let mime;
   if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
   else if(data[0]===255&&data[1]===216) mime='image/jpeg';
   else if(data.toString('ascii',0,2)==='BM')mime='image/bmp';
   else if(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP')mime='image/webp';
   if(mime)return `data:${mime};base64,${data.toString('base64')}`;
  }catch{}
 }
 return null;
}
module.exports={getWallpaper,localPath};
