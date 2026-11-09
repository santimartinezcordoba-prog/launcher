const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('roomDesktop',Object.freeze({getWallpaper:()=>ipcRenderer.invoke('room:get-wallpaper')}));
