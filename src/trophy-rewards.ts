export const trophyPoints={bronze:1,silver:2,gold:4,platinum:8} as const;
export type TrophyTier=keyof typeof trophyPoints;
export const trophyLabels:Record<TrophyTier,string>={bronze:'Bronce',silver:'Plata',gold:'Oro',platinum:'Platino'};
export const trophyTiers:TrophyTier[]=['bronze','bronze','bronze','silver','silver','gold'];
export function trophyKey(game:number,index:number|'platinum'){return `${game}:${index}`;}
export function trophyReward(index:number|'platinum'){return trophyPoints[index==='platinum'?'platinum':trophyTiers[index]]??0;}
export function newlyEarnedTrophies(eligible:string[],observed:string[],claimed:string[]){
 const before=new Set([...observed,...claimed]);return [...new Set(eligible)].filter(key=>!before.has(key));
}
