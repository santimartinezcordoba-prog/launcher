import { placementSpots } from './placement';
export type Surface='floor'|'shelves'|'desk'|'nightstand'|'cabinet';
export type Arrangement={surface:Surface;x:number;y:number;z:number;rotation:number};
export const furniture:Record<string,{width:number;depth:number;name:string}>={plant:{width:.5,depth:.5,name:'Planta de interior'},stool:{width:.55,depth:.55,name:'Taburete de roble'},table:{width:.85,depth:.6,name:'Mesa auxiliar'}};
export const surfaceNames:Record<Surface,string>={floor:'Suelo',shelves:'Baldas de colección',desk:'Escritorio',nightstand:'Mesilla',cabinet:'Estantería de juegos'};
export const floorObstacles=[{x:-2.02,z:-.85,w:2.28,d:1.7},{x:.2,z:-3.22,w:2.36,d:.54},{x:2.12,z:-1.85,w:2.0,d:2.2},{x:-2.9,z:-2.05,w:.54,d:.5}];
export function legacyArrangement(id:string,placements:Record<string,string>,rotations:Record<string,number>):Arrangement|undefined{
 const spot=placementSpots.find(p=>p.id===placements[id]);if(!spot)return;
 const [x,y,z]=spot.position;return {surface:spot.id.startsWith('upper')||spot.id.startsWith('lower')?'shelves':spot.id.startsWith('desk')?'desk':spot.id.startsWith('cabinet')?'cabinet':'nightstand',x,y,z,rotation:rotations[id]??0};
}
export function snapPlacement(surface:Surface,x:number,y:number,z:number,rotation:number):Arrangement{
 const snap=(v:number,step:number)=>Math.round(v/step)*step;
 return {surface,x:snap(x,surface==='floor'?.2:.05),z:snap(z,surface==='floor'?.2:.05),y,rotation};
}
export function placementError(id:string,p:Arrangement,others:Record<string,Arrangement>):string{
 if(![p.x,p.y,p.z,p.rotation].every(Number.isFinite))return 'Selecciona un punto dentro de la habitación.';
 const item=furniture[id],w=item?.width??.24,d=item?.depth??.24;
 const radians=p.rotation*Math.PI/180;
 const hw=(Math.abs(Math.cos(radians))*w+Math.abs(Math.sin(radians))*d)/2;
 const hd=(Math.abs(Math.sin(radians))*w+Math.abs(Math.cos(radians))*d)/2;
 if(item&&p.surface!=='floor')return 'Este mueble se coloca sobre el suelo.';
 if(p.surface==='floor'){
  if(p.y!==0||Math.abs(p.x)+hw>3.2||Math.abs(p.z)+hd>3.5)return 'El objeto debe quedar dentro de la habitación.';
  if(floorObstacles.some(o=>Math.abs(p.x-o.x)<hw+o.w/2&&Math.abs(p.z-o.z)<hd+o.d/2))return 'Ese espacio está ocupado por un mueble de la habitación.';
 }else if(p.surface==='shelves'){
  if(Math.abs(p.x-3.11)>.01||![2.46,2.03].some(y=>Math.abs(p.y-y)<.01)||p.z-hd< -2.6||p.z+hd>-.9)return 'Selecciona un punto sobre una de las dos baldas.';
 }else{
  const bounds={desk:[2.45,3.15,-1.16,-.73,.82],nightstand:[-3.16,-2.62,-2.29,-1.79,.685],cabinet:[-.78,1.17,-3.48,-2.98,2.34]}[p.surface];
  if(!bounds||p.x-hw<bounds[0]-.001||p.x+hw>bounds[1]+.001||p.z-hd<bounds[2]-.001||p.z+hd>bounds[3]+.001||Math.abs(p.y-bounds[4])>.01)return 'El objeto debe quedar apoyado sobre la superficie.';
 }
 for(const [other,q] of Object.entries(others)){
  if(other===id||q.surface!==p.surface||Math.abs(q.y-p.y)>.05)continue;
  const spec=furniture[other],r=q.rotation*Math.PI/180;
  const ow=(Math.abs(Math.cos(r))*(spec?.width??.24)+Math.abs(Math.sin(r))*(spec?.depth??.24))/2;
  const od=(Math.abs(Math.sin(r))*(spec?.width??.24)+Math.abs(Math.cos(r))*(spec?.depth??.24))/2;
  if(Math.abs(q.x-p.x)<hw+ow-.001&&Math.abs(q.z-p.z)<hd+od-.001)return 'Hay otro objeto en ese punto. Elige un espacio libre.';
 }
 return '';
}
