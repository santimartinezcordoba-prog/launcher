import {test,expect} from '@playwright/test';
test('zoom, arrastre, restauración y títulos legibles al acercar una estantería',async({page})=>{
 await page.route(/^https:/,r=>r.abort());await page.goto('/');await page.getByRole('button',{name:'Entrar en la sala de colección'}).click();const room=page.getByTestId('collection-room');await expect(room).toHaveAttribute('data-zoom','1');
 const first=room.locator('[data-collection-game="13:2"]');const initial=(await first.boundingBox())!.width;
 await page.mouse.move(800,350);await page.mouse.wheel(0,-800);await expect.poll(async()=>Number(await room.getAttribute('data-zoom'))).toBeGreaterThan(3);expect((await first.boundingBox())!.width).toBeGreaterThan(initial*2.5);
 const background=await page.evaluate(()=>{for(let y=10;y<innerHeight-100;y+=50)for(let x=10;x<innerWidth-120;x+=50)if(document.elementFromPoint(x,y)?.tagName==='CANVAS')return {x,y};throw Error('No background to drag');});await page.mouse.move(background.x,background.y);await page.mouse.down();await page.mouse.move(background.x+100,background.y+50,{steps:5});await page.mouse.up();await expect(room).not.toHaveAttribute('data-pan','0,0');
 await page.getByRole('button',{name:'Restablecer vista',exact:true}).click();await expect(room).toHaveAttribute('data-zoom','1');await expect(room).toHaveAttribute('data-pan','0,0');expect(Math.abs((await first.boundingBox())!.width-initial)).toBeLessThan(1);
 await page.getByLabel('Elegir estantería por género').selectOption({label:'Acción'});await expect(room).toHaveAttribute('data-genre','Acción');const hades=page.getByRole('button',{name:'Ver Hades',exact:true});await expect(hades.locator('.collection-case-title')).toBeVisible();
 const title=await hades.locator('.collection-case-title').evaluate(n=>({font:parseFloat(getComputedStyle(n).fontSize),width:n.parentElement!.getBoundingClientRect().width}));expect(title.font*title.width/180).toBeGreaterThan(14);
 await hades.hover();await expect(page.getByRole('complementary',{name:'Portada ampliada'})).toBeVisible();await expect(page.locator('.collection-game-preview strong')).toHaveText('Hades');await page.screenshot({path:'test-results/collection-readable-titles.png'});
 await hades.click();await expect(page.getByRole('dialog',{name:'Detalles de Hades'})).toBeVisible();
});
