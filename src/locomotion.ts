import {defaultControls,type Controls} from './controls';
// Ground-plane movement shared by the bedroom and the collection room.
export type WalkPoint={x:number;z:number};
export type WalkObstacle={minX:number;maxX:number;minZ:number;maxZ:number;height?:number};
export type WalkArea=WalkObstacle&{obstacles:WalkObstacle[]};
export function canStand(point:WalkPoint,radius:number,area:WalkArea){
 if(point.x-radius<area.minX||point.x+radius>area.maxX||point.z-radius<area.minZ||point.z+radius>area.maxZ)return false;
 return !area.obstacles.some(box=>{
  const x=Math.max(box.minX,Math.min(box.maxX,point.x)),z=Math.max(box.minZ,Math.min(box.maxZ,point.z));
  return (point.x-x)**2+(point.z-z)**2<radius**2;
 });
}
export function walkStep(position:WalkPoint,direction:WalkPoint,seconds:number,area:WalkArea,speed=4.4,radius=.22):WalkPoint{
 const length=Math.hypot(direction.x,direction.z);if(!length||seconds<=0)return {...position};
 const distance=speed*Math.min(seconds,.1),steps=Math.max(1,Math.ceil(distance/(radius*.4))),dx=direction.x/length*distance/steps,dz=direction.z/length*distance/steps;
 let next={...position};
 for(let step=0;step<steps;step++){
  const full={x:next.x+dx,z:next.z+dz};
  if(canStand(full,radius,area)){next=full;continue;}
  // Slide along a wall instead of sticking when walking diagonally into it.
  const horizontal={x:next.x+dx,z:next.z};if(canStand(horizontal,radius,area))next=horizontal;
  const vertical={x:next.x,z:next.z+dz};if(canStand(vertical,radius,area))next=vertical;
 }
 return next;
}

export class WalkKeyboard{
 private held=new Set<string>();
 constructor(private enabled:()=>boolean,private getControls:()=>Controls=()=>defaultControls){window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.clear);document.addEventListener('visibilitychange',this.visibility);}
 private down=(event:KeyboardEvent)=>{
  if(!this.enabled()||event.ctrlKey||event.metaKey||event.altKey||!(['forward','back','left','right'] as const).some(action=>this.getControls()[action].includes(event.code)))return;
  const target=event.target as HTMLElement|null;if(target?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
  event.preventDefault();this.held.add(event.code);
 };
 private up=(event:KeyboardEvent)=>{this.held.delete(event.code);};
 private visibility=()=>{if(document.hidden)this.clear();};
 clear=()=>{this.held.clear();};
 direction(yaw=0):WalkPoint{
  if(!this.enabled()){this.clear();return {x:0,z:0};}
  const controls=this.getControls();const isHeld=(keys:string[])=>keys.some(key=>this.held.has(key));const x=Number(isHeld(controls.right))-Number(isHeld(controls.left));
  const z=Number(isHeld(controls.back))-Number(isHeld(controls.forward));
  return {x:x*Math.cos(yaw)+z*Math.sin(yaw),z:z*Math.cos(yaw)-x*Math.sin(yaw)};
 }
 dispose(){this.clear();window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.clear);document.removeEventListener('visibilitychange',this.visibility);}
}
export function safeSpawn(position:WalkPoint,area:WalkArea,radius=.22):WalkPoint{
 if(canStand(position,radius,area))return {...position};
 for(let distance=.35;distance<6;distance+=.35)for(let step=0;step<24;step++){const angle=step*Math.PI/12,point={x:position.x+Math.sin(angle)*distance,z:position.z+Math.cos(angle)*distance};if(canStand(point,radius,area))return point;}
 for(let z=area.minZ+radius;z<=area.maxZ-radius;z+=.5)for(let x=area.minX+radius;x<=area.maxX-radius;x+=.5)if(canStand({x,z},radius,area))return {x,z};
 return {...position};
}

export type JumpState={height:number;velocity:number};
export function jumpStep(state:JumpState,seconds:number):JumpState{
 const dt=Math.max(0,Math.min(seconds,.1)),height=state.height+state.velocity*dt-7.5*dt*dt;
 return height<=0?{height:0,velocity:0}:{height,velocity:state.velocity-15*dt};
}

export type PlayerState=WalkPoint&JumpState&{grounded:boolean};
export const jumpSpeed=6;
function overlaps(point:WalkPoint,box:WalkObstacle,radius=.22){const x=Math.max(box.minX,Math.min(box.maxX,point.x)),z=Math.max(box.minZ,Math.min(box.maxZ,point.z));return (point.x-x)**2+(point.z-z)**2<radius*radius;}
/** Swept movement uses feet height: furniture has sides and a top you can land on. */
export function playerStep(state:PlayerState,direction:WalkPoint,seconds:number,area:WalkArea,maxHeight=Infinity):PlayerState{
 let next={...state};const count=Math.max(1,Math.ceil(Math.min(seconds,.1)/.008)),dt=Math.max(0,Math.min(seconds,.1))/count;
 for(let i=0;i<count;i++){
  const previousHeight=next.height;
  const walkArea={...area,obstacles:area.obstacles.filter(box=>(box.height??Infinity)>next.height+.015)};
  Object.assign(next,walkStep(next,direction,dt,walkArea));
  let height=next.height+next.velocity*dt-7.5*dt*dt;next.velocity-=15*dt;
  if(height>maxHeight){height=maxHeight;next.velocity=Math.min(0,next.velocity);}
  let floor=0;
  if(next.velocity<=0)for(const box of area.obstacles){const top=box.height??Infinity;if(top<=previousHeight+.015&&top>=height&&overlaps(next,box))floor=Math.max(floor,top);}
  next.grounded=height<=floor;
  if(next.grounded){height=floor;next.velocity=0;}
  next.height=height;
 }
 return next;
}
