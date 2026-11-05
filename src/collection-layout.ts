import {games,type Game} from './games';

export const shelfCapacity=8;
export const shelfWidth=3.3;
export const genreGroups=[...new Set(games.map(g=>g.genre))]
 .sort((a,b)=>a.localeCompare(b,'es'))
 .map(genre=>({id:genre,title:genre,genre,games:games.filter(g=>g.genre===genre)}));
export type CollectionFilter='favorites'|'most-played';
export type ShelfGroup={id:string;title:string;genre?:string;collection?:CollectionFilter;games:Game[]};
export function collectionShelves(favorites:number[]):ShelfGroup[]{
 return [...genreGroups,
  {id:'favorites',title:'Favoritos',collection:'favorites',games:games.filter(g=>favorites.includes(g.id))},
  {id:'most-played',title:'Más jugados',collection:'most-played',games:[...games].sort((a,b)=>b.hours-a.hours||a.title.localeCompare(b.title,'es'))}
 ];
}
export const baySpacing=3.36;
export const cameraDistance=35;
export type ShelfPlacement={bay:number;position:[number,number,number];rotation:number;height:number;rows:number};
export function bayPosition(bay:number):[number,number,number]{
 const angle=(bay-2)*baySpacing/cameraDistance;
 return [Math.sin(angle)*cameraDistance,Math.cos(angle)*-cameraDistance+cameraDistance,-angle];
}
// Stack modular shelves along five shallow wall facets, all turned towards the entrance.
export function arrangeShelves(groups:ShelfGroup[]):ShelfPlacement[]{
 const heights=Array(5).fill(0),placed=new Map<number,ShelfPlacement>();
 const put=(index:number,bay:number)=>{
  const rows=Math.min(shelfCapacity,groups[index].games.length)>4?2:1,height=rows===2?2.72:1.45;
  const [x,z,rotation]=bayPosition(bay),y=heights[bay];
  placed.set(index,{bay,position:[x,y,z],rotation,height,rows});heights[bay]+=height+.24;
 };
 put(12,2);put(13,2);put(0,1);put(3,4);
 const remaining=groups.map((_,index)=>index).filter(index=>!placed.has(index)).sort((a,b)=>Number(groups[b].games.length>4)-Number(groups[a].games.length>4)||a-b);
 const priority=[0,4,3,1,2];
 for(const index of remaining){const bay=[...priority].sort((a,b)=>heights[a]-heights[b])[0];put(index,bay);}
 return groups.map((_,index)=>placed.get(index)!);
}
