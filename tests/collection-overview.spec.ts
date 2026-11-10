import {test,expect} from '@playwright/test';
const portrait='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#285872"/><rect x="8" y="8" width="584" height="884" fill="none" stroke="#efd09d" stroke-width="16"/><path d="M0 650L300 220l300 430Z" fill="#18352d"/><text x="60" y="830" fill="white" font-size="50">PORTADA COMPLETA</text></svg>';
async function enter(page:import('@playwright/test').Page){
 await page.route(/^https:/,route=>route.fulfill({body:portrait,contentType:'image/svg+xml'}));await page.goto('/');await page.getByRole('button',{name:/Entrar en la habitación/}).click();await page.getByRole('button',{name:'Entrar en la sala de colección'}).click();await expect(page.getByTestId('collection-room')).toHaveAttribute('data-rendered','true');
}
test('favoritos se actualizan al quitar estrellas y su biblioteca conserva el filtro',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('room-favorites',JSON.stringify([0,6,34])));await enter(page);
 await page.getByLabel('Elegir estantería por género').selectOption({label:'Favoritos'});await expect(page.getByTestId('collection-room')).toHaveAttribute('data-genre','Favoritos');
 const fixedLayout=await page.getByTestId('collection-room').getAttribute('data-rack-layout');
 const favoriteShelf=page.getByRole('article',{name:'Estantería de Favoritos',exact:true});await expect(page.locator('.display-case')).toHaveCount(3);
 await page.getByRole('button',{name:'Ver portada de Hollow Knight',exact:true}).click();await page.getByRole('button',{name:'Abrir Hollow Knight',exact:true}).click();await page.getByRole('button',{name:'Favorito fijado',exact:true}).click();await page.getByRole('button',{name:'Cerrar detalles'}).click();
 await expect(page.locator('.display-case')).toHaveCount(2);await expect(page.getByTestId('collection-room')).toHaveAttribute('data-rack-layout',fixedLayout!);await expect(page.getByText('2 de 10 huecos ocupados · 2 juegos',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Ver portada de Hollow Knight',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Ver biblioteca de Favoritos →',exact:true}).click();await expect(page.getByRole('navigation',{name:'Filtrar biblioteca'}).getByRole('button',{name:'Favoritos',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.card-details>button')).toHaveText(['Hades','Outer Wilds']);
});
test('más jugados muestra diez juegos en orden de horas y abre la biblioteca ordenada',async({page})=>{
 await enter(page);await page.getByLabel('Elegir estantería por género').selectOption({label:'Más jugados de siempre'});await expect(page.getByTestId('collection-room')).toHaveAttribute('data-genre','Más jugados de siempre');
 const shelf=page.getByRole('article',{name:'Estantería de Más jugados de siempre',exact:true});await expect(page.locator('.display-case')).toHaveCount(10);expect(await page.locator('.display-case').evaluateAll(nodes=>nodes.map(node=>Number((node as HTMLElement).dataset.gameId)))).toEqual([2,3,4,5,0,1,6,7,8,9]);await page.screenshot({path:'test-results/collection-most-played.png'});
 await page.getByRole('button',{name:'Ver biblioteca de Más jugados de siempre →',exact:true}).click();await expect(page.getByLabel('Ordenar juegos')).toHaveValue('Más jugados');await expect(page.getByLabel('Género',{exact:true})).toHaveValue('Todos los géneros');await expect(page.locator('.game-card')).toHaveCount(60);await expect(page.locator('.card-details>button').first()).toHaveText('Hollow Knight');
});

test('un apartado con un juego conserva los diez huecos y el mismo tamaño que uno lleno',async({page})=>{
 await enter(page);const room=page.getByTestId('collection-room');const fixedLayout=await room.getAttribute('data-rack-layout');
 await page.getByLabel('Elegir estantería por género').selectOption({label:'Carreras'});await expect(room).toHaveAttribute('data-genre','Carreras');await expect(room).toHaveAttribute('data-motion','idle');
 await expect(page.getByText('1 de 10 huecos ocupados · 1 juego',{exact:true})).toBeVisible();await expect(page.locator('.display-front.display-case')).toHaveCount(1);
 const sparseCover=await page.locator('.display-front.display-case').first().boundingBox();await page.screenshot({path:'test-results/collection-nine-free-slots.png'});
 await page.getByLabel('Elegir estantería por género').selectOption({label:'Más jugados de siempre'});await expect(room).toHaveAttribute('data-genre','Más jugados de siempre');await expect(room).toHaveAttribute('data-motion','idle');
 await expect(page.locator('.display-case')).toHaveCount(10);const fullCover=await page.locator('.display-front.display-case').first().boundingBox();expect(Math.abs(sparseCover!.width-fullCover!.width)).toBeLessThan(1);expect(Math.abs(sparseCover!.height-fullCover!.height)).toBeLessThan(1);await expect(room).toHaveAttribute('data-rack-layout',fixedLayout!);
});

test('recientemente usa horas de los últimos catorce días y conserva su orden en biblioteca',async({page})=>{
 await enter(page);await page.getByLabel('Elegir estantería por género').selectOption({label:'Más jugados recientemente'});const room=page.getByTestId('collection-room');await expect(room).toHaveAttribute('data-genre','Más jugados recientemente');
 const shelf=page.getByRole('article',{name:'Estantería de Más jugados recientemente',exact:true});await expect(page.locator('.display-case')).toHaveCount(10);expect(await page.locator('.display-case').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.gameId)))).toEqual([37,41,16,20,4,8,49,53,28,32]);
 await expect(page.getByText(/Últimos 14 días · Datos de ejemplo/)).toBeVisible();await page.getByRole('button',{name:'Ver biblioteca de Más jugados recientemente →',exact:true}).click();await expect(page.getByLabel('Ordenar juegos')).toHaveValue('Más jugados recientemente');await expect(page.locator('.card-details>button').first()).toHaveText('Baldur’s Gate 3');
});
