import {test,expect} from '@playwright/test';
const portrait='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#285872"/><rect x="8" y="8" width="584" height="884" fill="none" stroke="#efd09d" stroke-width="16"/><path d="M0 650L300 220l300 430Z" fill="#18352d"/><text x="60" y="830" fill="white" font-size="50">PORTADA COMPLETA</text></svg>';
async function enter(page:import('@playwright/test').Page){
 await page.route(/^https:/,route=>route.fulfill({body:portrait,contentType:'image/svg+xml'}));await page.goto('/');await page.getByRole('button',{name:'Entrar en la sala de colección'}).click();await expect(page.getByTestId('collection-room')).toHaveAttribute('data-rendered','true');
}
test('favoritos se actualizan al quitar estrellas y su biblioteca conserva el filtro',async({page})=>{
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
