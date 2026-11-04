import {test,expect} from '@playwright/test';
import {chooseFloor} from './editor-helpers';
async function canvasPoint(page:import('@playwright/test').Page,x:number,z:number){
 return page.locator('.placement-grid').evaluate((svg,{x,z})=>{const l=svg.querySelectorAll<SVGPolylineElement>('.grid-line'),a=l[0].points.getItem(0),b=l[0].points.getItem(1),c=l[32].points.getItem(0),r=svg.getBoundingClientRect();return {x:r.x+a.x+(c.x-a.x)*(x+3.2)/6.4,y:r.y+a.y+(b.y-a.y)*(z+3.5)/7};},{x,z});
}
async function openInventory(page:import('@playwright/test').Page){await page.getByRole('button',{name:'Abrir ajustes desde el ordenador'}).press('Enter');await page.getByRole('button',{name:'Inventario',exact:true}).click();}
test('arrastra en el plano, confirma la posición final y conserva adornos sobre una mesa al moverla',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('room-collection-v1'))localStorage.setItem('room-collection-v1',JSON.stringify({owned:['table','cat'],equipped:['table','cat'],claimed:['shelf','discover','mood'],seen:[0,1,2],arranged:{table:{surface:'floor',x:0,y:0,z:.4,rotation:0},cat:{surface:'table',x:0,y:.69,z:.4,rotation:0}}}));});
 await page.goto('/');const room=page.getByTestId('room-3d');await expect(room).toHaveAttribute('data-placed','cat|table');
 await expect(page.getByRole('button',{name:'Abrir biblioteca',exact:true})).toHaveCount(0);
 await openInventory(page);
 await page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Mesa auxiliar'})}).getByRole('button',{name:'Mover objeto'}).click();
 await expect(room).toHaveAttribute('data-camera','edit-floor');await expect(room).toHaveAttribute('data-motion','idle');
 const a=await canvasPoint(page,0,.4),b=await canvasPoint(page,.8,1.6);
 await page.mouse.move(a.x,a.y);await page.mouse.down();await expect(room).toHaveAttribute('data-dragging','true');
 await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();await expect(room).toHaveAttribute('data-dragging','false');
 await expect(room).toHaveAttribute('data-positions',/"table":\[0.8,0,1.6\]/);
 await expect(room).toHaveAttribute('data-positions',/"cat":\[0.8,0.69,1.6\]/);
 await page.getByRole('button',{name:'Guardar posición'}).click();await page.getByRole('button',{name:'Cerrar ajustes'}).click();
 await page.reload();await expect(room).toHaveAttribute('data-positions',/"cat":\[0.8,0.69,1.6\]/);
 await openInventory(page);
 await page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Mesa auxiliar'})}).getByRole('button',{name:'Guardar en inventario'}).click();
 await expect(room).toHaveAttribute('data-placed','');
});
test('mesilla, escritorio, armario y mesa comprada tienen vistas cercanas sin etiquetas flotantes',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('room-collection-v1',JSON.stringify({owned:['cat','table'],equipped:['table'],arranged:{table:{surface:'floor',x:0,y:0,z:1,rotation:0}},claimed:['shelf','discover','mood'],seen:[0,1,2]})));
 await page.goto('/');await openInventory(page);
 await page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Gato de medianoche'})}).getByRole('button',{name:'Colocar en habitación'}).click();
 const room=page.getByTestId('room-3d');
 for(const [surface,name,width] of [['nightstand','Mesilla',.54],['desk','Escritorio',.38],['cabinet','Sobre la estantería',1.95],['table','Mesa auxiliar',.85]] as const){
  await page.getByRole('navigation',{name:'Superficies de colocación'}).getByRole('button',{name,exact:true}).click();
  await expect(room).toHaveAttribute('data-camera',`edit-${surface}`);await expect(room).toHaveAttribute('data-motion','idle');
  await expect(page.locator('.editor-surfaces')).toHaveCount(0);
  const point=await page.locator('.placement-grid').evaluate((svg,width)=>{const l=svg.querySelectorAll<SVGPolylineElement>('.grid-line'),a=l[0].points.getItem(0),b=l[0].points.getItem(1),n=Math.floor((width+.001)/.05),c=l[n].points.getItem(0),d=l[n].points.getItem(1),r=svg.getBoundingClientRect();return {clientX:r.x+(a.x+b.x+c.x+d.x)/4,clientY:r.y+(a.y+b.y+c.y+d.y)/4};},width);
  await room.locator('canvas').dispatchEvent('click',point);await expect(page.getByRole('button',{name:'Guardar posición'})).toBeEnabled();
 }
 await page.getByRole('button',{name:'Cancelar colocación'}).click();await page.getByRole('button',{name:'Cerrar ajustes'}).click();
 await expect(room).toHaveAttribute('data-placed','table');
});
