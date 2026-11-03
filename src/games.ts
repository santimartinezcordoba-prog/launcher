export const stores = ['Steam', 'Epic Games', 'Ubisoft Connect', 'Xbox / Game Pass', 'EA', 'Battle.net', 'Riot Games', 'GOG'] as const;
export type Store = typeof stores[number];
export type Game = { id: number; title: string; store: Store; genre: string; installed: boolean; hours: number; color: string; year: number; synopsis: string; requirements: string[] };
const titles = [
  ['Hollow Knight','Aventura'], ['Elden Ring','RPG'], ['Stardew Valley','Simulación'], ['Red Dead Redemption 2','Aventura'],
  ['Baldur’s Gate 3','RPG'], ['Cyberpunk 2077','RPG'], ['Hades','Acción'], ['Celeste','Plataformas'],
  ['Forza Horizon 5','Carreras'], ['Sea of Thieves','Aventura'], ['Ori and the Will of the Wisps','Plataformas'], ['Minecraft','Creatividad'],
  ['The Witcher 3','RPG'], ['Portal 2','Puzles'], ['It Takes Two','Cooperativo'], ['A Way Out','Cooperativo'],
  ['Diablo IV','RPG'], ['Overwatch 2','Acción'], ['World of Warcraft','RPG'], ['Hearthstone','Estrategia'],
  ['VALORANT','Acción'], ['League of Legends','Estrategia'], ['Teamfight Tactics','Estrategia'], ['Legends of Runeterra','Estrategia'],
  ['Assassin’s Creed Mirage','Aventura'], ['Far Cry 6','Acción'], ['The Division 2','Acción'], ['Anno 1800','Estrategia'],
  ['Alan Wake 2','Aventura'], ['Fortnite','Acción'], ['Control','Acción'], ['Sifu','Acción'],
  ['Disco Elysium','RPG'], ['No Man’s Sky','Exploración'], ['Outer Wilds','Exploración'], ['Dredge','Aventura'],
  ['DOOM Eternal','Acción'], ['Death Stranding','Aventura'], ['Resident Evil 4','Acción'], ['Dead Cells','Plataformas'],
  ['Cuphead','Plataformas'], ['Terraria','Creatividad'], ['Valheim','Supervivencia'], ['Subnautica','Supervivencia'],
  ['Cities: Skylines','Simulación'], ['Civilization VI','Estrategia'], ['Age of Empires IV','Estrategia'], ['Halo Infinite','Acción'],
  ['Psychonauts 2','Plataformas'], ['Grounded','Supervivencia'], ['Hi-Fi RUSH','Acción'], ['Pentiment','Aventura'],
  ['Mass Effect Legendary Edition','RPG'], ['The Sims 4','Simulación'], ['Star Wars Jedi: Survivor','Aventura'], ['Dragon Age: Inquisition','RPG'],
  ['Gris','Plataformas'], ['Journey','Exploración'], ['Unpacking','Puzles'], ['A Short Hike','Exploración']
];
const palette = ['#1d4050','#726248','#467267','#6e282c','#5a466d','#b79b35','#a74a35','#435b78','#2b6980','#5b5b36'];
const descriptions: Record<number,string> = {
  0: 'Desciende a Hallownest, un reino de insectos olvidado. Explora cavernas conectadas, descubre sus secretos y domina combates que premian la paciencia y la curiosidad.',
  1: 'Recorre las Tierras Intermedias en una aventura de fantasía oscura. Encuentra tu propio camino entre ruinas, criaturas imponentes y misterios por descubrir.',
  2: 'Cambia el ruido de la ciudad por una pequeña granja. Cultiva, pesca, explora las minas y crea una nueva vida entre los vecinos de Pelican Town.',
  3: 'Acompaña a Arthur Morgan y a la banda de Van der Linde en el ocaso del salvaje oeste. Un viaje de lealtad y supervivencia por un mundo abierto lleno de vida.'
};
function storeFor(i: number): Store {
  if(i>=8 && i<=11 || i>=46 && i<=51) return 'Xbox / Game Pass';
  if(i>=14 && i<=15 || i>=52 && i<=55) return 'EA';
  if(i>=16 && i<=19) return 'Battle.net';
  if(i>=20 && i<=23) return 'Riot Games';
  if(i>=24 && i<=27) return 'Ubisoft Connect';
  if(i>=28 && i<=31) return 'Epic Games';
  if(i===32 || i===12) return 'GOG';
  return 'Steam';
}
export const games: Game[] = titles.map(([title,genre],id)=>({
  id, title, genre, store: storeFor(id), installed: id%4!==3, hours: Math.max(0, 172 - id*3),
  color: palette[id%palette.length], year: [2017,2022,2016,2018,2023,2020][id%6],
  synopsis: descriptions[id] ?? `Descubre ${title} en tu biblioteca. Esta ficha de ejemplo muestra cómo consultarás la información de tus juegos sin salir de la habitación.`,
  requirements: id===0 ? ['Windows 10 (64 bits)', 'Intel Core 2 Duo E5200', '4 GB de RAM', 'GeForce 9800 GTX (1 GB)', '9 GB disponibles'] : ['Windows 10 / 11 (64 bits)', 'Procesador de cuatro núcleos', '16 GB de RAM', 'Gráfica compatible con DirectX 12', '70 GB disponibles']
}));
export function shelfGames(favorites: number[]) { return [...games].sort((a,b)=> Number(favorites.includes(b.id))-Number(favorites.includes(a.id)) || b.hours-a.hours).slice(0,50); }
