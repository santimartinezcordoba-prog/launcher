import {test,expect} from '@playwright/test';
test('puerta, sala por géneros, portadas limitadas y biblioteca filtrada',async({page})=>{
 await page.route(/^https:/,r=>r.abort());await page.goto('/');
 await expect(page.getByTestId('room-3d')).toHaveAttribute('data-rendered','true');await expect(page.getByTestId('room-3d')).toHaveAttribute('data-slots','0');
 await expect(page.getByRole('button',{name:'Entrar en la sala de colección'})).toBeVisible();await page.screenshot({path:'test-results/bedroom-door.png'});
 await page.getByRole('button',{name:'Entrar en la sala de colección'}).click();const room=page.getByTestId('collection-room');await expect(room).toHaveAttribute('data-rendered','true');await expect.poll(()=>page.locator('.collection-cover:visible img').evaluateAll(nodes=>{const clip=document.querySelector('.collection-viewport')!.getBoundingClientRect();return nodes.every(n=>{const b=n.getBoundingClientRect();return b.right<=clip.left||b.left>=clip.right||b.bottom<=clip.top||b.top>=clip.bottom||((n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth>0);});})).toBe(true);await page.screenshot({path:'test-results/collection-overview.png'});
 await page.getByLabel('Elegir estantería por género').selectOption({label:'Acción'});await expect(room).toHaveAttribute('data-genre','Acción');await expect(room).toHaveAttribute('data-motion','idle');
 await expect(page.locator('.collection-cover:visible')).toHaveCount(8);await page.screenshot({path:'test-results/collection-genre.png'});
 await page.getByRole('button',{name:'Ver Hades',exact:true}).click();await expect(page.getByRole('dialog',{name:'Detalles de Hades'})).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Ver biblioteca de Acción →',exact:true}).click();await expect(page.getByLabel('Género',{exact:true})).toHaveValue('Acción');
 expect(await page.locator('.game-card').count()).toBeGreaterThan(4);await page.keyboard.press('Escape');await expect(page.getByRole('region',{name:'Sala de colección'})).toBeVisible();
 await page.getByRole('button',{name:'← Volver a mi habitación'}).click();await expect(page.getByRole('button',{name:'Entrar en la sala de colección'})).toBeVisible();
});
test('portadas legibles y biblioteca filtrada en tamaño compacto',async({page})=>{
 await page.setViewportSize({width:1024,height:650});await page.route(/^https:/,r=>r.abort());await page.goto('/');await page.getByRole('button',{name:'Entrar en la sala de colección'}).click();
 const room=page.getByTestId('collection-room');await expect(room).toHaveAttribute('data-rendered','true');await page.getByLabel('Elegir estantería por género').selectOption({label:'RPG'});await expect(room).toHaveAttribute('data-genre','RPG');await expect(room).toHaveAttribute('data-motion','idle');
 const covers=page.locator('.collection-cover:visible');expect(await covers.count()).toBeLessThanOrEqual(8);expect(await covers.count()).toBeGreaterThan(0);
 for(const box of await covers.evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})))){expect(box.width).toBeGreaterThanOrEqual(65);expect(box.height).toBeGreaterThanOrEqual(98);}
 await page.getByRole('button',{name:'Ver biblioteca de RPG →',exact:true}).click();await expect(page.getByLabel('Género',{exact:true})).toHaveValue('RPG');
});

test('los adornos de la estantería retirada vuelven al inventario sin perder compras',async({page})=>{
 await page.route(/^https:/,r=>r.abort());await page.addInitScript(()=>{if(!localStorage.getItem('room-collection-v1'))localStorage.setItem('room-collection-v1',JSON.stringify({owned:['cat'],equipped:['cat'],claimed:['shelf'],arranged:{cat:{surface:'cabinet',x:.2,y:2.34,z:-3.2,rotation:0}}}));});
 await page.goto('/');await expect(page.getByTestId('room-3d')).toHaveAttribute('data-rendered','true');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('room-collection-v1')!));expect(saved.owned).toEqual(['cat']);expect(saved.equipped).toEqual([]);expect(saved.arranged).toEqual({});
 await page.getByRole('button',{name:'Abrir ajustes desde el ordenador'}).press('Enter');await page.getByRole('button',{name:'Inventario',exact:true}).click();await expect(page.getByRole('heading',{name:'Gato de medianoche'})).toBeVisible();await expect(page.getByTestId('points')).toHaveText('0');
});
test('si no se puede crear la sala 3D se conserva la biblioteca',async({page})=>{
 await page.route(/^https:/,r=>r.abort());await page.goto('/');await expect(page.getByTestId('room-3d')).toHaveAttribute('data-rendered','true');
 await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:any[]){return String(args[0]).startsWith('webgl')?null:original.apply(this,args as any); } as typeof original;});
 await page.getByRole('button',{name:'Entrar en la sala de colección'}).click();await expect(page.getByText('No se pudo abrir la sala 3D.')).toBeVisible();await page.getByRole('button',{name:'Ver biblioteca completa',exact:true}).click();await expect(page.locator('.game-card')).toHaveCount(60);
});
