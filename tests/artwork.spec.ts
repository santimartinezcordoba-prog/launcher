import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route(/^https:/,route=>route.abort());});
test('biblioteca bajo el mueble y contorno de silueta almacenado sin renders al mover el ratón',async({page})=>{
 await page.goto('/');const room=page.getByTestId('room-3d');await expect(room).toHaveAttribute('data-rendered','true');
 const computer=(await page.locator('[data-anchor="computer"]').boundingBox())!,canvas=room.locator('canvas');const frame=await room.getAttribute('data-frame');
 await canvas.dispatchEvent('pointermove',{clientX:computer.x+computer.width/2,clientY:computer.y+computer.height/2});
 await expect(room).toHaveAttribute('data-highlight','computer');await expect(page.locator('.interaction-outline image')).toBeVisible();
 const shape=await page.locator('.interaction-outline image').evaluate(async el=>{
  const img=new Image();img.src=el.getAttribute('href')!;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let minX=c.width,maxX=0,minY=c.height,maxY=0,count=0,interior=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  for(let y=minY+5;y<maxY-5;y++)for(let x=minX+5;x<maxX-5;x++)if(p[(y*c.width+x)*4+3])interior++;
  return {count,interior};
 });
 expect(shape.count).toBeGreaterThan(150);expect(shape.interior).toBeGreaterThan(100);await expect(room).toHaveAttribute('data-frame',frame!);
 await page.getByRole('button',{name:'Acercarse a la estantería'}).press('Enter');await expect(room).toHaveAttribute('data-camera','shelf');await expect(room).toHaveAttribute('data-motion','idle');
 const button=(await page.getByRole('button',{name:'Abrir biblioteca',exact:true}).boundingBox())!,bounds=(await canvas.boundingBox())!;
 expect(button.y).toBeGreaterThan(bounds.y+bounds.height*.8);expect(button.y+button.height).toBeLessThanOrEqual(bounds.y+bounds.height);
 expect(Math.abs(button.x+button.width/2-(bounds.x+bounds.width/2))).toBeLessThan(60);
});
test('carátulas completas en ficha y galería; arte de cajas y recuperación de fuentes alternativas',async({page})=>{
 await page.unroute(/^https:/);
 // Fixture portrait has border lines and a full title; the app must not crop it.
 const poster='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#25628a"/><rect x="5" y="5" width="590" height="890" fill="none" stroke="#ffe6a1" stroke-width="10"/><path d="M0 600L300 180l300 420Z" fill="#18282f"/><text x="30" y="840" fill="white" font-size="65">GAME COVER</text></svg>';
 await page.route(/^https:/,route=>route.fulfill({body:poster,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'}}));
 await page.goto('/');const room=page.getByTestId('room-3d');await expect(room).toHaveAttribute('data-rendered','true');
 await expect.poll(async()=>Number(await room.getAttribute('data-spine-art'))).toBe(50);
 await page.keyboard.press('Control+k');const first=page.locator('.game-art').first();await expect(first.locator('img')).toHaveCSS('object-fit','contain');
 const box=(await first.boundingBox())!;expect(box.width/box.height).toBeCloseTo(2/3,1);
 await page.getByRole('textbox',{name:'Buscar en mi biblioteca'}).fill('Hollow');await page.getByRole('button',{name:'Ver Hollow Knight',exact:true}).click();
 const art=page.getByRole('dialog').locator('.detail-art');await expect(art.locator('img')).toHaveCSS('object-fit','contain');const b=(await art.boundingBox())!;expect(b.width/b.height).toBeCloseTo(2/3,1);
 await page.getByRole('button',{name:'Cerrar detalles'}).click();await page.unroute(/^https:/);
 await page.route(/^https:/,route=>route.abort());await page.getByRole('button',{name:'Ver Hollow Knight',exact:true}).click();
 await expect(page.getByRole('button',{name:'Reintentar',exact:true})).toBeVisible();
 await page.unroute(/^https:/);await page.route(/^https:/,route=>route.fulfill({body:poster,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'}}));
 await page.getByRole('button',{name:'Reintentar',exact:true}).click();await expect(page.getByRole('dialog').getByRole('img',{name:'Póster de Hollow Knight'})).toBeVisible();
});
