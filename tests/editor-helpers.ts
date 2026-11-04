import { expect, type Page } from '@playwright/test';
export async function chooseFloor(page:Page,x=0,z=.4){
 const room=page.getByTestId('room-3d');await expect(room).toHaveAttribute('data-camera','edit-floor');await expect(room).toHaveAttribute('data-motion','idle');
 const p=await page.locator('.placement-grid').evaluate((svg,{x,z})=>{
  const lines=svg.querySelectorAll<SVGPolylineElement>('.grid-line');
  const a=lines[0].points.getItem(0),b=lines[0].points.getItem(1),c=lines[32].points.getItem(0),r=svg.getBoundingClientRect();
  return {clientX:r.x+a.x+(c.x-a.x)*(x+3.2)/6.4,clientY:r.y+a.y+(b.y-a.y)*(z+3.5)/7};
 },{x,z});
 await room.locator('canvas').dispatchEvent('click',p);
}
export async function chooseShelf(page:Page){
 const room=page.getByTestId('room-3d');await expect(room).toHaveAttribute('data-camera','edit-shelves');await expect(room).toHaveAttribute('data-motion','idle');
 const point=await page.locator('.placement-grid').evaluate(svg=>{const line=svg.querySelector<SVGPolylineElement>('.grid-line')!,a=line.points.getItem(0),b=line.points.getItem(1),r=svg.getBoundingClientRect();return {clientX:r.x+a.x+(b.x-a.x)*.5,clientY:r.y+a.y+(b.y-a.y)*.5-5};});
 await room.locator('canvas').dispatchEvent('click',point);
}
