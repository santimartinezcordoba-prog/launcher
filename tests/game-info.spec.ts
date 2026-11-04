import {test,expect} from '@playwright/test';
test('ficha ampliada: tienda, actividad, idiomas, capturas y tráiler sin reproducción automática',async({page})=>{
 await page.route('https://cdn.cloudflare.steamstatic.com/test-screen.jpg',r=>r.fulfill({path:'public/images/artwork-offline.svg',contentType:'image/svg+xml'}));
 await page.route('**/models/room.glb',r=>r.abort());
 await page.route('**/api/store-details/367520',r=>r.fulfill({json:{name:'Hollow Knight',genres:['Acción','Aventura'],modes:['Un jugador'],controller:'Compatibilidad completa',languages:'Español, Inglés*',screenshots:['https://cdn.cloudflare.steamstatic.com/test-screen.jpg'],trailers:[{name:'Tráiler oficial',url:'https://cdn.cloudflare.steamstatic.com/test.webm'}]}}));
 await page.goto('/');await page.getByRole('button',{name:'Abrir biblioteca',exact:true}).click();await page.getByRole('textbox',{name:'Buscar en mi biblioteca'}).fill('Hollow');await page.getByRole('button',{name:'Ver Hollow Knight',exact:true}).click();
 const info=page.getByRole('region',{name:'Información ampliada'});
 await expect(info).toContainText('Compatibilidad completa');await expect(info).toContainText('Español, Inglés*');await expect(info).toContainText('1 jugador');
 await page.screenshot({path:'test-results/game-info.png'});
 await expect(info.getByRole('link',{name:/Abrir en la tienda/})).toHaveAttribute('href','https://store.steampowered.com/app/367520/');
 await info.getByRole('button',{name:'Tu actividad',exact:true}).click();await expect(info).toContainText('172 horas · Ejemplo');await expect(info).toContainText('Sin sincronizar');
 await info.getByRole('button',{name:'Galería',exact:true}).click();await info.getByRole('button',{name:'Ampliar captura 1'}).click();await expect(info.getByRole('img',{name:'Captura ampliada de Hollow Knight'})).toBeVisible();
 await expect(info.locator('video')).toHaveAttribute('preload','none');await expect(info.locator('video')).not.toHaveAttribute('autoplay');
});
test('sin tienda disponible, datos desconocidos y reintento conservan la ficha',async({page})=>{
 await page.route('**/models/room.glb',r=>r.abort());await page.route('**/api/store-details/**',r=>r.fulfill({status:502,json:{error:'Sin conexión'}}));
 await page.goto('/');await page.getByRole('button',{name:'Abrir biblioteca',exact:true}).click();await page.getByRole('textbox',{name:'Buscar en mi biblioteca'}).fill('Hollow');await page.getByRole('button',{name:'Ver Hollow Knight',exact:true}).click();
 const info=page.getByRole('region',{name:'Información ampliada'});await expect(info).toContainText('No se pudo consultar la tienda');await expect(info).toContainText('Sin lectura del ordenador');
 await page.unroute('**/api/store-details/**');await page.route('**/api/store-details/**',r=>r.fulfill({json:{name:'Hollow Knight',genres:[],modes:[],controller:'Compatibilidad completa',languages:'Español',screenshots:[],trailers:[]}}));
 await info.getByRole('button',{name:'Actualizar información de Steam'}).click();await expect(info).toContainText('Compatibilidad completa');
});
