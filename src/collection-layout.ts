import {games,type Game} from './games';

export const shelfColumns=5;
export const shelfRows=2;
export const shelfCapacity=shelfColumns*shelfRows;
export const caseWidth=.96;
export const caseHeight=1.44;
export const columnSpacing=1;
export const rowSpacing=1.58;
export const shelfWidth=5.18;
export const shelfHeight=3.28;
export const roomScale=1.56;
export function shelfSlot(slot:number){
 return {x:(slot%shelfColumns-(shelfColumns-1)/2)*columnSpacing,y:.86+(shelfRows-1-Math.floor(slot/shelfColumns))*rowSpacing};
}
export const genreGroups=[...new Set(games.map(g=>g.genre))]
 .sort((a,b)=>a.localeCompare(b,'es'))
 .map(genre=>({id:genre,title:genre,genre,games:games.filter(g=>g.genre===genre)}));
export type CollectionFilter='favorites'|'most-played'|'recently-played';
export type ShelfGroup={id:string;title:string;genre?:string;collection?:CollectionFilter;games:Game[]};
export function collectionShelves(favorites:number[]):ShelfGroup[]{
 return [...genreGroups,
  {id:'favorites',title:'Favoritos',collection:'favorites',games:games.filter(g=>favorites.includes(g.id))},
  {id:'most-played',title:'Más jugados de siempre',collection:'most-played',games:[...games].sort((a,b)=>b.hours-a.hours||a.title.localeCompare(b.title,'es'))},
  {id:'recently-played',title:'Más jugados recientemente',collection:'recently-played',games:games.filter(g=>g.recentHours>0).sort((a,b)=>b.recentHours-a.recentHours||b.hours-a.hours)}
 ];
}
export const baySpacing=5.24;
export const cameraDistance=5*roomScale;
export type ShelfPlacement={bay:number;position:[number,number,number];rotation:number;height:number;rows:number};
export function bayPosition(bay:number):[number,number,number]{
 if(bay===0)return [-6.3*roomScale,-4*roomScale,Math.PI/3];
 if(bay===4)return [6.3*roomScale,-4*roomScale,-Math.PI/3];
 return [(bay-2)*baySpacing,-5.5*roomScale,0];
}
// The ten-slot footprint and wall positions are independent of the owned games.
const wallGroups=[['Acción','RPG','Supervivencia'],['Estrategia','Creatividad','Simulación'],['favorites','most-played','recently-played'],['Aventura','Carreras','Puzles'],['Cooperativo','Plataformas','Exploración']];
export function arrangeShelves(groups:ShelfGroup[]):ShelfPlacement[]{
 return groups.map(group=>{
  const bay=wallGroups.findIndex(ids=>ids.includes(group.id)),tier=wallGroups[bay].indexOf(group.id);
  const [x,z,rotation]=bayPosition(bay);
  return {bay,position:[x,tier*(shelfHeight+.24),z],rotation,height:shelfHeight,rows:shelfRows};
 });
}
