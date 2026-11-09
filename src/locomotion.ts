// Ground-plane movement shared by the bedroom and the collection room.
export type WalkPoint={x:number;z:number};
export type WalkObstacle={minX:number;maxX:number;minZ:number;maxZ:number};
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
const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
export class WalkKeyboard{
 private held=new Set<string>();
 constructor(private enabled:()=>boolean){window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.clear);document.addEventListener('visibilitychange',this.visibility);}
 private down=(event:KeyboardEvent)=>{
  if(!this.enabled()||event.ctrlKey||event.metaKey||event.altKey||!movementCodes.has(event.code))return;
  const target=event.target as HTMLElement|null;if(target?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
  event.preventDefault();this.held.add(event.code);
 };
 private up=(event:KeyboardEvent)=>{this.held.delete(event.code);};
 private visibility=()=>{if(document.hidden)this.clear();};
 clear=()=>{this.held.clear();};
 direction(yaw=0):WalkPoint{
  if(!this.enabled()){this.clear();return {x:0,z:0};}
  const x=Number(this.held.has('KeyD')||this.held.has('ArrowRight'))-Number(this.held.has('KeyA')||this.held.has('ArrowLeft'));
  const z=Number(this.held.has('KeyS')||this.held.has('ArrowDown'))-Number(this.held.has('KeyW')||this.held.has('ArrowUp'));
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
