import {test,expect} from '@playwright/test';
import {canStand,walkStep,safeSpawn,jumpStep,type WalkArea} from '../src/locomotion';
const room:WalkArea={minX:-3,maxX:3,minZ:-3,maxZ:3,obstacles:[{minX:.5,maxX:1.5,minZ:-1,maxZ:1}]};
test('caminar en diagonal mantiene la velocidad y respeta las paredes',()=>{
 const straight=walkStep({x:0,z:2},{x:0,z:-1},.05,room),diagonal=walkStep({x:0,z:2},{x:1,z:-1},.05,room);
 expect(Math.hypot(straight.x,straight.z-2)).toBeCloseTo(.22);expect(Math.hypot(straight.x,straight.z-2)).toBeCloseTo(Math.hypot(diagonal.x,diagonal.z-2));
 let point={x:-2.5,z:2};for(let step=0;step<500;step++)point=walkStep(point,{x:-1,z:0},.016,room);
 expect(canStand(point,.22,room)).toBe(true);expect(point.x).toBeGreaterThanOrEqual(-2.78);
});
test('los muebles bloquean el paso y permiten deslizarse por su borde',()=>{
 let point={x:0,z:0};for(let step=0;step<30;step++)point=walkStep(point,{x:1,z:.2},.016,room);
 expect(canStand(point,.22,room)).toBe(true);expect(point.x).toBeLessThan(.3);expect(point.z).toBeGreaterThan(.2);
 const paused=walkStep({x:0,z:2},{x:1,z:0},100,room);expect(paused.x).toBeCloseTo(.44);
});

test('si un mueble ocupa el punto de entrada el personaje aparece en un espacio libre',()=>{const point=safeSpawn({x:1,z:0},room);expect(canStand(point,.22,room)).toBe(true);expect(point).not.toEqual({x:1,z:0});expect(safeSpawn({x:0,z:2},room)).toEqual({x:0,z:2});});

test('el salto sube, cae al suelo y no acumula altura',()=>{let jump={height:0,velocity:5.4},peak=0;for(let i=0;i<100;i++){jump=jumpStep(jump,.016);peak=Math.max(peak,jump.height);expect(jump.height).toBeGreaterThanOrEqual(0);}expect(peak).toBeGreaterThan(.9);expect(peak).toBeLessThan(1);expect(jump).toEqual({height:0,velocity:0});});

test('se salta sobre muebles, se aterriza encima y se cae al salir de su borde',async()=>{
 const {playerStep,jumpSpeed}=await import('../src/locomotion');
 const area:WalkArea={minX:-5,maxX:5,minZ:-5,maxZ:5,obstacles:[{minX:.5,maxX:1.5,minZ:-1,maxZ:1,height:.62},{minX:2,maxX:3,minZ:-1,maxZ:1,height:1.8}]};
 let player={x:0,z:0,height:0,velocity:0,grounded:true};
 for(let i=0;i<30;i++)player=playerStep(player,{x:1,z:0},.016,area);
 expect(player.x).toBeLessThan(.3);
 player.velocity=jumpSpeed;player.grounded=false;
 for(let i=0;i<13;i++)player=playerStep(player,{x:1,z:0},.016,area);
 for(let i=0;i<120;i++)player=playerStep(player,{x:0,z:0},.016,area);
 expect(player.x).toBeGreaterThan(.5);expect(player.height).toBeCloseTo(.62);expect(player.grounded).toBe(true);
 player.velocity=jumpSpeed;player.grounded=false;
 for(let i=0;i<21;i++)player=playerStep(player,{x:1,z:0},.016,area);
 for(let i=0;i<120;i++)player=playerStep(player,{x:0,z:0},.016,area);
 expect(player.height).toBeCloseTo(1.8);expect(player.grounded).toBe(true);
 for(let i=0;i<60;i++)player=playerStep(player,{x:0,z:1},.016,area);
 for(let i=0;i<120;i++)player=playerStep(player,{x:0,z:0},.016,area);
 expect(player.height).toBe(0);expect(player.grounded).toBe(true);
 player={x:4.7,z:0,height:3,velocity:jumpSpeed,grounded:false};for(let i=0;i<30;i++)player=playerStep(player,{x:1,z:0},.1,area);
 expect(player.x).toBeLessThanOrEqual(4.78);expect(player.height).toBeGreaterThanOrEqual(0);
});
