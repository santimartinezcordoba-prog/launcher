import {games,type Game} from './games';

export const shelfCapacity=8;
export const shelfWidth=3.4;
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
// The doorway is on the open front side (+Z); all special shelves sit on the back wall.
export function shelfPosition(index:number):[number,number,number,number]{
 if(index<4)return [[-8.875,-5.325,5.325,8.875][index],0,-8.35,0];
 if(index<8)return [-10.95,0,-6+(index-4)*3.7,Math.PI/2];
 if(index<12)return [10.95,0,-6+(index-8)*3.7,-Math.PI/2];
 return [index===12?-1.775:1.775,0,-8.35,0];
}
