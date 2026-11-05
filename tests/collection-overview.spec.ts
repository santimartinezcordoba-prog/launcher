import {test,expect} from '@playwright/test';
const portrait='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#285872"/><rect x="8" y="8" width="584" height="884" fill="none" stroke="#efd09d" stroke-width="16"/><path d="M0 650L300 220l300 430Z" fill="#18352d"/><text x="60" y="830" fill="white" font-size="50">PORTADA COMPLETA</text></svg>';
async function enter(page:import('@playwright/test').Page){
 await page.route(/^https:/,route=>route.fulfill({body:portrait,contentType:'image/svg+xml'}));await page.goto('/');await page.getByRole('button',{name:'Entrar en la sala de colección'}).click();await page.getByRole('button',{name:'Índice frontal',exact:true}).click();await expect(page.getByTestId('collection-room')).toHaveAttribute('data-rendered','true');
}
test('entrada a 1600×770: todas las estanterías frontales, imágenes cargadas y cambio de tamaño sin F11',async({page})=>{
 await page.setViewportSize({width:1600,height:770});await enter(page);
 const shelves=page.getByRole('article');await expect(shelves).toHaveCount(14);
 const viewport=page.getByLabel('Todas las estanterías',{exact:true});
 for(const shelf of await shelves.all()){
  await shelf.scrollIntoViewIfNeeded();const covers=shelf.locator('.collection-cover:visible');expect(await covers.count()).toBeGreaterThan(0);expect(await covers.count()).toBeLessThanOrEqual(2);
  await expect.poll(()=>covers.locator('img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth===600))).toBe(true);
  const clip=(await viewport.boundingBox())!;
  for(const box of await covers.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}))){expect(box.width).toBeGreaterThanOrEqual(80);expect(box.height).toBeGreaterThanOrEqual(120);expect(box.x).toBeGreaterThanOrEqual(clip.x);expect(box.y).toBeGreaterThanOrEqual(clip.y);expect(box.x+box.width).toBeLessThanOrEqual(clip.x+clip.width+1);expect(box.y+box.height).toBeLessThanOrEqual(clip.y+clip.height+1);}
 }
 await viewport.evaluate(node=>node.scrollTo(0,0));await page.screenshot({path:'test-results/collection-normal-window.png'});
 for(const height of [900,770]){await page.setViewportSize({width:1600,height});const favorites=page.getByRole('article',{name:'Estantería de Favoritos',exact:true});await favorites.scrollIntoViewIfNeeded();await expect(favorites.locator('.collection-cover:visible')).toHaveCount(2);await expect(favorites.locator('.collection-cover:visible img').first()).toHaveCSS('object-fit','contain');}
 await expect(page.getByTestId('collection-room')).toHaveAttribute('data-genre','all');
});
test('favoritos centrales se actualizan al quitar estrellas y su biblioteca conserva el filtro',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('room-favorites',JSON.stringify([0,6,34])));await enter(page);
 await page.getByLabel('Elegir estantería por género').selectOption({label:'Favoritos'});await expect(page.getByTestId('collection-room')).toHaveAttribute('data-genre','Favoritos');
 const favoriteShelf=page.getByRole('article',{name:'Estantería de Favoritos',exact:true});await expect(favoriteShelf.locator('.collection-cover:visible')).toHaveCount(3);
 await favoriteShelf.getByRole('button',{name:'Ver Hollow Knight',exact:true}).click();await page.getByRole('button',{name:'Favorito fijado',exact:true}).click();await page.getByRole('button',{name:'Cerrar detalles'}).click();
 await expect(favoriteShelf.locator('.collection-cover:visible')).toHaveCount(2);await expect(favoriteShelf.getByRole('button',{name:'Ver Hollow Knight',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Ver biblioteca de Favoritos →',exact:true}).click();await expect(page.getByRole('navigation',{name:'Filtrar biblioteca'}).getByRole('button',{name:'Favoritos',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.card-details>button')).toHaveText(['Hades','Outer Wilds']);
});
test('más jugados muestra ocho juegos en orden de horas y abre la biblioteca ordenada',async({page})=>{
 await enter(page);await page.getByLabel('Elegir estantería por género').selectOption({label:'Más jugados'});await expect(page.getByTestId('collection-room')).toHaveAttribute('data-genre','Más jugados');
 const shelf=page.getByRole('article',{name:'Estantería de Más jugados',exact:true});await expect(shelf.locator('.collection-cover:visible')).toHaveCount(8);expect(await shelf.locator('.collection-cover:visible').evaluateAll(nodes=>nodes.map(node=>Number((node as HTMLElement).dataset.gameId)))).toEqual([0,1,2,3,4,5,6,7]);await page.screenshot({path:'test-results/collection-most-played.png'});
 await page.getByRole('button',{name:'Ver biblioteca de Más jugados →',exact:true}).click();await expect(page.getByLabel('Ordenar juegos')).toHaveValue('Más jugados');await expect(page.getByLabel('Género',{exact:true})).toHaveValue('Todos los géneros');await expect(page.locator('.game-card')).toHaveCount(60);await expect(page.locator('.card-details>button').first()).toHaveText('Hollow Knight');
});
