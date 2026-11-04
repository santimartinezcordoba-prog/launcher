import { placementSpots } from './placement';
export type Surface='floor'|'shelves'|'desk'|'nightstand'|'cabinet'|'table'|'stool';
export type Arrangement={surface:Surface;x:number;y:number;z:number;rotation:number};
export const furniture:Record<string,{width:number;depth:number;name:string}>={plant:{width:.5,depth:.5,name:'Planta de interior'},stool:{width:.55,depth:.55,name:'Taburete de roble'},table:{width:.85,depth:.6,name:'Mesa auxiliar'}};
export const surfaceNames:Record<Surface,string>={floor:'Suelo',shelves:'Baldas de colección',desk:'Escritorio',nightstand:'Mesilla',cabinet:'Sobre la estantería',table:'Mesa auxiliar',stool:'Taburete'};
export type SurfaceArea={x:number;z:number;y:number;width:number;depth:number;rotation:number};
export function surfaceArea(surface:Surface,arranged:Record<string,Arrangement>):SurfaceArea|undefined{
 const fixed:Partial<Record<Surface,SurfaceArea>>={
  floor:{x:0,z:0,y:0,width:6.4,depth:7,rotation:0},
  desk:{x:2.26,z:-2.7125,y:.8,width:.38,depth:.425,rotation:0},
  nightstand:{x:-2.89,z:-2.04,y:.685,width:.54,depth:.5,rotation:0},
  cabinet:{x:.195,z:-3.23,y:2.34,width:1.95,depth:.5,rotation:0}
 };
 if(surface==='table'||surface==='stool'){
  const host=arranged[surface];if(!host||host.surface!=='floor')return;
  const spec=furniture[surface];return {x:host.x,z:host.z,y:host.y+(surface==='table'?.69:.5),width:spec.width,depth:spec.depth,rotation:host.rotation};
 }
 return fixed[surface];
}
export function moveSupportedItems(id:string,position:Arrangement,arranged:Record<string,Arrangement>){
 const old=arranged[id],next={...arranged,[id]:position};if(!old||!['table','stool'].includes(id))return next;
 const angle=(position.rotation-old.rotation)*Math.PI/180;
 for(const [key,p] of Object.entries(arranged))if(p.surface===id){
  const x=p.x-old.x,z=p.z-old.z;
  next[key]={...p,x:position.x+x*Math.cos(angle)+z*Math.sin(angle),z:position.z-x*Math.sin(angle)+z*Math.cos(angle),y:p.y+position.y-old.y,rotation:(p.rotation+position.rotation-old.rotation+360)%360};
 }
 return next;
}
export const floorObstacles=[{x:-2.02,z:-.85,w:2.28,d:1.7},{x:.2,z:-3.22,w:2.36,d:.54},{x:2.12,z:-1.85,w:2.0,d:2.2},{x:-2.9,z:-2.05,w:.54,d:.5}];
// Old versions offered desk slots that overlap the PC. Keep existing saves, but use the free patch for new placements.
export function legacyDeskPosition(p:Arrangement){return p.surface==='desk'&&[p.x,p.y,p.z,p.rotation].every(Number.isFinite)&&p.x>=2.45&&p.x<=3.15&&p.z>=-1.16&&p.z<=-.73&&Math.abs(p.y-.82)<.001;}
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
  const area=surfaceArea(p.surface,others);
  if(!area)return 'Primero coloca el mueble que sostiene este objeto.';
  const angle=-area.rotation*Math.PI/180,dx=p.x-area.x,dz=p.z-area.z;
  const x=dx*Math.cos(angle)+dz*Math.sin(angle),z=-dx*Math.sin(angle)+dz*Math.cos(angle);
  const localAngle=(p.rotation-area.rotation)*Math.PI/180;
  const localW=(Math.abs(Math.cos(localAngle))*w+Math.abs(Math.sin(localAngle))*d)/2;
  const localD=(Math.abs(Math.sin(localAngle))*w+Math.abs(Math.cos(localAngle))*d)/2;
  if(Math.abs(x)+localW>area.width/2+.001||Math.abs(z)+localD>area.depth/2+.001||Math.abs(p.y-area.y)>.01)return 'El objeto debe quedar apoyado sobre la superficie.';
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
