import {useEffect,useState} from 'react';
export const wallpaperKey='room-wallpaper-v1';
export const defaultWallpaper='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><path fill="#183b48" d="M0 0h1280v720H0z"/><path fill="#2f6870" d="M0 480h160V320h160v160h160V240h160v80h160v160h160V160h160v320h160v240H0z"/><path fill="#83b8a0" d="M0 640h320V480h160v80h320V400h160v160h320v160H0z"/><path fill="#f0c879" d="M960 80h80v80h-80z"/></svg>');
export function currentWallpaper(){try{const value=localStorage.getItem(wallpaperKey);return value?.startsWith('data:image/')?value:defaultWallpaper;}catch{return defaultWallpaper;}}
declare global{interface Window{roomDesktop?:{getWallpaper:()=>Promise<string|null>}}}
export async function resizeWallpaper(source:string){
 const image=new Image();image.src=source;await image.decode();const scale=Math.min(1,1600/image.width,1000/image.height),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.85);
}
export function useWallpaper(){
 const [wallpaper,setWallpaper]=useState(currentWallpaper),[error,setError]=useState('');
 const save=(image:string,automatic=false)=>{try{localStorage.setItem(wallpaperKey,image);localStorage.setItem('room-wallpaper-mode',automatic?'auto':'manual');setWallpaper(image);setError('');window.dispatchEvent(new CustomEvent('room-wallpaper',{detail:image}));}catch{setError('No se ha podido guardar el fondo. Prueba una imagen más pequeña.');}};
 const sync=async()=>{try{const image=await window.roomDesktop?.getWallpaper();if(image)save(await resizeWallpaper(image),true);else setError('No se ha podido leer el fondo del sistema. Selecciona la imagen que utilizas como fondo.');}catch{setError('No se ha podido leer el fondo del sistema. Puedes seleccionar la imagen.');}};
 useEffect(()=>{if(window.roomDesktop&&localStorage.getItem('room-wallpaper-mode')!=='manual')void sync();},[]);
 return {wallpaper,error,sync,reset:()=>save(defaultWallpaper),importFile:async(file:File)=>{if(!/^image\/(jpeg|png|webp|avif|bmp)$/.test(file.type)||file.size>20*1024*1024){setError('Elige una imagen JPG, PNG, WebP, AVIF o BMP de hasta 20 MB.');return;}const url=URL.createObjectURL(file);try{save(await resizeWallpaper(url));}catch{setError('No se ha podido abrir esta imagen.');}finally{URL.revokeObjectURL(url);}}};
}
