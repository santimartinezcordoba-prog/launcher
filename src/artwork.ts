import type { Game } from './games';
const steamIds:(number|null)[]=[367520,1245620,413150,1174180,1086940,1091500,1145360,504230,1551360,1172620,1057090,null,292030,620,1426210,1222700,2344520,2357570,null,null,null,null,null,null,3035570,2369390,2221490,916440,null,null,870780,2138710,632470,275850,753640,1562430,782330,1190460,2050650,588650,268910,105600,892970,264710,255710,289070,1466860,1240440,607080,962130,1817230,1205520,1328670,1222670,1774580,1222690,683320,638230,1135690,1055540];
const other:Record<number,string>={11:'Minecraft_cover.png',18:'World_of_Warcraft.png',19:'Hearthstone_cover_art.png',20:'Valorant_cover.jpg',21:'League_of_Legends_cover.png',22:'Teamfight_Tactics.png',23:'Legends_of_Runeterra_cover_art.png',28:'Alan_Wake_2_box_art.jpg',29:'Fortnite_cover.jpg'};
export const steamAppId=(game:Game)=>steamIds[game.id]??undefined;
export function artworkSources(game:Game){
 const id=steamIds[game.id];
 if(id)return [`https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_600x900.jpg`,`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`,`https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`];
 if(game.id===23)return ['https://dd.b.pvp.net/latest/set1/en_us/img/cards/01DE012-full.png','https://dd.b.pvp.net/5_12_0/set1/en_us/img/cards/01DE012-full.png'];
 if(game.id===21||game.id===22)return [`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${game.id===21?'Ahri':'Jinx'}_0.jpg`];
 return [`https://en.wikipedia.org/wiki/Special:FilePath/${other[game.id]}`];
}
export const artworkUrl=(game:Game)=>artworkSources(game)[0];
// Shared decoded images keep the 50 spines from making duplicate requests on preference changes.
export type Artwork=HTMLImageElement|ImageBitmap;
const cache=new Map<number,Promise<Artwork|undefined>>();
export function loadArtwork(game:Game){
 let pending=cache.get(game.id);if(pending)return pending;
 pending=(async()=>{for(const src of artworkSources(game)){
  const img=new Image();img.crossOrigin='anonymous';img.decoding='async';img.src=src;
  try{await img.decode();if(typeof createImageBitmap==='function'){try{return await createImageBitmap(img,{resizeWidth:128,resizeHeight:Math.max(1,Math.round(128*img.naturalHeight/img.naturalWidth))});}catch{return img;}}return img;}catch{/* Try the next store asset; a failed source is not an absent game. */}
 }return undefined;})();cache.set(game.id,pending);return pending;
}
