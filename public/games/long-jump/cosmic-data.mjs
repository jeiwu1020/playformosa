// Exploration chapters, never physical transfer distances. All lengths use the
// existing game coordinate; real astronomy below has its own labelled origin.
export const COSMIC_STOPS=Object.freeze([
 ['uranus','天王星',384,['#172d43','#506d7c','#a5d9d5']],
 ['neptune','海王星',384,['#182d45','#456478','#94c5d3']],
 ['pluto_kuiper','冥王星與柯伊伯帶',384,['#232a43','#74717b','#d8c6b3']],
 ['heliopause','航海家・日球層頂',480,['#1c263d','#454c66','#edd6a0']],
 ['oort_cloud','歐特雲',576,['#1b2540','#454e67','#bfd7dd']],
 ['proxima','比鄰星系',672,['#39263c','#715363','#f0a38b']],
 ['black_hole','黑洞轉乘口',384,['#241d3c','#504665','#ffbe85']],
 ['cosmic_laundry','宇宙洗衣機',384,['#253343','#637e88','#b6e5df']],
 ['galactic_market','銀河夜市',384,['#30253f','#725468','#f3c47d']],
 ['bubble_tea','巨型珍奶星',384,['#392c43','#98766a','#e7c39e']],
 ['alien_judges','外星裁判席',384,['#243543','#61766e','#c1daa6']],
 ['endless_multiverse','荒謬多重宇宙',384,['#252a43','#61647e','#a9dfdc']]
].map(row=>Object.freeze(row)));
export const COSMIC_CAMEOS=Object.freeze([
 Object.freeze({id:'asteroid_belt',name:'小行星帶飛掠',start:2640,end:2736}),
 Object.freeze({id:'jupiter',name:'木星飛掠',start:2736,end:2904})
]);
// Presentation-only combinations: neither distance nor saved route identity wraps.
export const MULTIVERSE_SEGMENT_LENGTH=192;
export const MULTIVERSE_VARIANTS=Object.freeze([
 {id:'saturn_market',name:'土星環夜市',scenes:['saturn','galactic_market']},
 {id:'neptune_judges',name:'海王星評審團',scenes:['neptune','alien_judges']},
 {id:'comet_laundry',name:'彗星自助洗衣店',scenes:['oort_cloud','cosmic_laundry']},
 {id:'tea_moons',name:'珍奶衛星群',scenes:['moon','bubble_tea']},
 {id:'pluto_market',name:'冥王星續攤夜市',scenes:['pluto_kuiper','galactic_market']},
 {id:'proxima_judges',name:'紅矮星外星頒獎台',scenes:['proxima','alien_judges']}
].map(v=>Object.freeze({...v,scenes:Object.freeze(v.scenes)})));
export function cosmicSceneAt(distance,region){
 if(region?.id==='endless_multiverse'&&Number.isFinite(distance)&&distance>=region.start){
  const segment=Math.floor((distance-region.start)/MULTIVERSE_SEGMENT_LENGTH),variant=MULTIVERSE_VARIANTS[segment%MULTIVERSE_VARIANTS.length];
  return {...region,variantId:variant.id,variantName:variant.name};
 }
 return COSMIC_CAMEOS.find(c=>distance>=c.start&&distance<c.end)||region;
}
export const ASTRONOMY_REFERENCES=Object.freeze([
 {id:'moon',label:'月球｜平均距地球約 384,400 km',origin:'earth',url:'https://science.nasa.gov/moon/facts/'},
 {id:'solar_planets',label:'平均距太陽：火星 2.28 億、木星 7.78 億、土星 14.3 億、天王星 28.7 億、海王星 45.0 億、冥王星 59 億 km。冥王星是矮行星。',origin:'sun',url:'https://science.nasa.gov/solar-system/planet-sizes-and-locations-in-our-solar-system/'},
 {id:'asteroid_belt',label:'主小行星帶約距太陽 2.2–3.2 AU，實際天體非常稀疏。',origin:'sun',url:'https://science.nasa.gov/mission/dawn/faq/'},
 {id:'pluto_kuiper',label:'柯伊伯帶主要區域距太陽約 30–50 AU，冥王星就在其中。',origin:'sun',url:'https://science.nasa.gov/solar-system/kuiper-belt/facts/'},
 {id:'heliopause',label:'航海家 1 號於 2012 年在約距太陽 122 AU 處越過日球層頂；這不是固定球形牆，也不是太陽系重力的終點。',origin:'sun',url:'https://science.nasa.gov/missions/voyager-program/10-things-going-interstellar/'},
 {id:'oort_cloud',label:'歐特雲是推測中的冰體區域：內緣估計距太陽 2,000–5,000 AU，外緣 10,000–100,000 AU。',origin:'sun',url:'https://science.nasa.gov/solar-system/oort-cloud/facts/'},
 {id:'proxima',label:'比鄰星距我們約 4.25 光年；是鄰近紅矮星，不是太陽系行星。',origin:'observer',url:'https://science.nasa.gov/exoplanets/other-stars-other-worlds/our-nearest-celestial-neighbor-an-exotic-3-star-system/'},
 {id:'constellations',label:'獵戶、大熊、小熊是地球天空中的視覺星群圖案，成員不在同一距離；遊戲只讓它們客串，不把它們當可抵達的地點。',origin:'apparent-sky',url:'https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question9.html'}
].map(Object.freeze));
// Additive badges are computed for the current jump only. Never migrate stored best/visited.
export const COSMIC_BADGES=Object.freeze({uranus:'天王星飛掠達成',neptune:'海王星飛掠達成',pluto_kuiper:'柯伊伯帶探索達成',heliopause:'與航海家同行',oort_cloud:'歐特雲想像巡遊',proxima:'拜訪比鄰星系',black_hole:'黑洞轉乘成功',cosmic_laundry:'宇宙洗衣店常客',galactic_market:'銀河夜市續攤',bubble_tea:'珍奶宇宙大杯升級',alien_judges:'外星裁判認證',endless_multiverse:'多重宇宙持續探索'});
