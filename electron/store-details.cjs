// Only a numeric Steam app ID reaches the fixed public store endpoint.
const cache=new Map();
async function storeDetails(id,fetcher=fetch){
 if(!/^\d{1,10}$/.test(id))throw Error('ID inválido');
 if(cache.has(id))return cache.get(id);
 const response=await fetcher(`https://store.steampowered.com/api/appdetails?appids=${id}&l=spanish`,{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('La tienda no responde');
 const json=await response.json(),data=json[id]?.success&&json[id].data;if(!data)throw Error('Ficha no disponible');
 const plain=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,3000);
 const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&/(^|\.)(steamstatic\.com|steamusercontent\.com|akamaihd\.net)$/.test(u.hostname)?u.href:undefined;}catch{return undefined;}};
 const result={name:plain(data.name),genres:(data.genres??[]).map(g=>plain(g.description)),modes:(data.categories??[]).filter(c=>[1,2,9,24,27,37,38,39,49].includes(c.id)).map(c=>plain(c.description)),controller:data.controller_support==='full'?'Compatibilidad completa':data.controller_support==='partial'?'Compatibilidad parcial':'No confirmada',languages:plain(data.supported_languages),screenshots:(data.screenshots??[]).slice(0,6).map(s=>safe(s.path_full)).filter(Boolean),trailers:(data.movies??[]).slice(0,2).map(m=>({name:plain(m.name),url:safe(m.webm?.max??m.mp4?.max)})).filter(m=>m.url)};
 cache.set(id,result);if(cache.size>100)cache.delete(cache.keys().next().value);return result;
}
module.exports={storeDetails};
