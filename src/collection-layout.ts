import {games,type Game} from './games';

export const shelfCapacity=8;
export const shelfWidth=4.24;
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
export function shelfPosition(index:number):[number,number,number,number]{
 if(index<4)return [-6.6+index*4.4,0,-9.7,0];
 if(index<8)return [-9.45,0,-7.2+(index-4)*4.6,Math.PI/2];
 if(index<12)return [9.45,0,-7.2+(index-8)*4.6,-Math.PI/2];
 return [index===12?-2.35:2.35,0,5,0];
}
