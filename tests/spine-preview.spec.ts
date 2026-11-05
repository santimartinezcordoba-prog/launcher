import {test,expect} from '@playwright/test';
test('carátula grande al señalar un lomo, sin renders 3D adicionales',async({page})=>{
 await page.route(/^https:/,r=>r.abort());await page.goto('/');const room=page.getByTestId('room-3d');await expect(room).toHaveAttribute('data-rendered','true');
 await page.getByRole('button',{name:'Acercarse a la estantería'}).press('Enter');await expect(room).toHaveAttribute('data-camera','shelf');await expect(room).toHaveAttribute('data-motion','idle');
 const frame=await room.getAttribute('data-frame');const first=page.locator('.three-game-hit').first();await first.hover();
 await expect(page.getByRole('complementary',{name:'Carátula del juego señalado'})).toContainText('Hollow Knight');await expect(room).toHaveAttribute('data-frame',frame!);
 await expect(page.locator('.preview-poster img')).toHaveAttribute('src','./images/artwork-offline.svg');
 await expect.poll(()=>page.locator('.preview-poster img').evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBeGreaterThan(0);
 await page.screenshot({path:'test-results/spine-preview.png'});
 await page.mouse.move(10,10);await expect(page.getByRole('complementary',{name:'Carátula del juego señalado'})).toHaveCount(0);
});
