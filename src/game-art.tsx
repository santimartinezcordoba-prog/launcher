import { useState } from 'react';
import type { Game } from './games';
import { artworkSources } from './artwork';
export { artworkUrl } from './artwork';
export function GameArt({game,eager=false,preload=false}:{game:Game;eager?:boolean;preload?:boolean}){
 const [source,setSource]=useState(0),[retry,setRetry]=useState(0);const urls=artworkSources(game),failed=source>=urls.length;
 return <><img key={`${game.id}-${source}-${retry}`} className="game-poster" src={failed?'./images/artwork-offline.svg':urls[source]} alt={failed?`Ilustración de reserva para ${game.title}`:`Póster de ${game.title}`} loading={eager||preload?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" onError={()=>{if(!failed)setSource(s=>s+1);}}/>{failed&&<span className="artwork-offline">No se pudo cargar la carátula {eager&&<button type="button" onClick={e=>{e.stopPropagation();setSource(0);setRetry(r=>r+1);}}>Reintentar</button>}</span>}</>;
}
