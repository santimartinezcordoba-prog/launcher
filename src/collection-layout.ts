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
// Four shelves on the back wall; Acción and Cooperativo move to the side walls.
export function shelfPosition(index:number):[number,number,number,number]{
 const left=[0,4,5,6,7],right=[3,8,9,10,11];
 if(left.includes(index))return [-7.35,0,-7.95+left.indexOf(index)*3.75,Math.PI/2];
 if(right.includes(index))return [7.35,0,-7.95+right.indexOf(index)*3.75,-Math.PI/2];
 if(index===1)return [-5.325,0,-10.35,0];
 if(index===2)return [5.325,0,-10.35,0];
 return [index===12?-1.775:1.775,0,-10.35,0];
}
