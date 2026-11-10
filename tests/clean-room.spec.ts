import {computerApp} from './computer-helpers';
import {test,expect} from '@playwright/test';
import {chooseFloor,chooseShelf} from './editor-helpers';

test('contorno de puerta sin render extra y biblioteca desde la sala',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();const room=page.getByTestId('room-3d');
 await expect(room).toHaveAttribute('data-rendered','true');await expect(room).toHaveAttribute('data-motion','idle');
 await expect(page.locator('.welcome,.room-hover')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Entrar en la sala de colección'})).toBeVisible();
 const frame=await room.getAttribute('data-frame');
 const tag=(await page.locator('[data-anchor="shelf"]').boundingBox())!;
 await room.locator('canvas').dispatchEvent('pointermove',{clientX:tag.x+tag.width/2,clientY:tag.y+tag.height/2});
 await expect(room).toHaveAttribute('data-highlight','shelf');
 await expect(page.locator('.interaction-outline')).toBeVisible();
 expect((await page.locator('.interaction-outline polygon').getAttribute('points'))!.split(' ')).toHaveLength(4);
 await expect(room).toHaveAttribute('data-frame',frame!);
 await page.getByRole('button',{name:'Entrar en la sala de colección'}).press('Enter');
 await page.getByRole('button',{name:'Biblioteca completa',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Buscar en mi biblioteca'})).toBeVisible();
 const width=await page.locator('.library').evaluate(el=>el.getBoundingClientRect().width);
 expect(width).toBeGreaterThan(900);
 await page.getByRole('textbox',{name:'Buscar en mi biblioteca'}).fill('Hollow');
 await expect(page.locator('.game-card')).toHaveCount(1);
});

test('muebles y figuras: plano, baldas, colisiones, giro, cancelación y persistencia',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('room-collection-v1'))localStorage.setItem('room-collection-v1',JSON.stringify({claimed:['shelf','discover','mood'],owned:['cat'],equipped:[],seen:[0,1,2],shelf:true,mood:true}));});
 await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();const room=page.getByTestId('room-3d');await expect(room).toHaveAttribute('data-rendered','true');
 await computerApp(page,'Tienda');
 await page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Planta de interior'})}).getByRole('button').click();
 await expect(page.getByTestId('points')).toHaveText('240');
 await page.getByRole('button',{name:'Inventario',exact:true}).click();
 await expect(page.getByLabel('Sitio de Gato de medianoche')).toHaveCount(0);
 await expect(page.locator('.placement-select')).toHaveCount(0);
 const plant=page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Planta de interior'})});
 await plant.getByRole('button',{name:'Colocar en habitación'}).click();
 await chooseFloor(page,-1.8,-.8);await expect(page.getByRole('button',{name:'Guardar posición'})).toBeDisabled();
 await chooseFloor(page,0,.4);await page.getByRole('button',{name:'Girar a la derecha'}).click();
 await page.getByRole('button',{name:'Guardar posición'}).click();
 await page.getByRole('button',{name:'Inventario',exact:true}).click();
 const cat=page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Gato de medianoche'})});
 await cat.getByRole('button',{name:'Colocar en habitación'}).click();
 await chooseFloor(page,0,.4);await expect(page.getByRole('button',{name:'Guardar posición'})).toBeDisabled();
 await page.getByRole('navigation',{name:'Superficies de colocación'}).getByRole('button',{name:'Baldas de colección',exact:true}).click();await chooseShelf(page);
 await page.getByRole('button',{name:'Guardar posición'}).click();
 await page.keyboard.press('Escape');
 await expect(room).toHaveAttribute('data-placed',/cat/);await expect(room).toHaveAttribute('data-placed',/plant/);
 await page.reload();await page.getByRole('button',{name:/Entrar en la habitación/}).click();await expect(room).toHaveAttribute('data-positions',/"plant":\[0,0,0.4\]/);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('room-collection-v1')!));
 expect(saved.arranged.plant.rotation).toBe(15);expect(saved.arranged.cat.surface).toBe('shelves');
 await computerApp(page,'Tienda');
 await page.getByRole('button',{name:'Inventario',exact:true}).click();
 await page.locator('.shop-items article').filter({has:page.getByRole('heading',{name:'Planta de interior'})}).getByRole('button',{name:'Mover objeto'}).click();
 await chooseFloor(page,1,1);await page.getByRole('button',{name:'Cancelar colocación'}).click();
 await expect(room).toHaveAttribute('data-positions',/"plant":\[0,0,0.4\]/);
});

test('la ficha usa una imagen real y conserva una ilustración si no hay red',async({page})=>{
 await page.route('https://cdn.cloudflare.steamstatic.com/**',async route=>route.fulfill({path:'public/images/artwork-offline.svg',contentType:'image/svg+xml'}));
 await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();await expect(page.getByTestId('room-3d')).toHaveAttribute('data-rendered','true');await page.keyboard.press('Control+k');
 await page.getByRole('textbox',{name:'Buscar en mi biblioteca'}).fill('Hollow');
 await page.getByRole('button',{name:'Ver Hollow Knight',exact:true}).click();
 const image=page.getByRole('dialog').getByRole('img',{name:'Póster de Hollow Knight'});
 await expect(image).toBeVisible();expect(await image.evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBeGreaterThan(0);
 await expect(image).toHaveAttribute('src',/367520\/library_600x900/);
 await page.getByRole('button',{name:'Cerrar detalles'}).click();
 await page.unroute('https://cdn.cloudflare.steamstatic.com/**');await page.route(/^https:/,route=>route.abort());
 await page.getByRole('button',{name:'Ver Hollow Knight',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('img',{name:'Ilustración de reserva para Hollow Knight'})).toBeVisible();
});

test('las posiciones antiguas del inventario se conservan al migrar al editor',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('room-collection-v1'))localStorage.setItem('room-collection-v1',JSON.stringify({claimed:['shelf','discover','mood'],owned:['cat','robot'],equipped:['cat','robot'],placements:{cat:'nightstand',robot:'desk-left'},rotations:{cat:90,robot:180},seen:[0,1,2],shelf:true,mood:true}));});
 await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();const room=page.getByTestId('room-3d');
 await expect(room).toHaveAttribute('data-positions',/"cat":\[-2.74,0.685,-1.91\]/);
 await expect(room).toHaveAttribute('data-positions',/"robot":\[2.5,0.82,-0.94\]/);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('room-collection-v1')!));
 expect(saved.arranged.cat.rotation).toBe(90);expect(saved.arranged.robot.rotation).toBe(180);
 await page.reload();await page.getByRole('button',{name:/Entrar en la habitación/}).click();await expect(room).toHaveAttribute('data-placed','cat|robot');
});
