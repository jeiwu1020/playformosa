// Rounded, hand-selected landmark coordinates. Great-circle estimates, not road distances.
// Columns: id, display name, approximate landmark latitude/longitude, silhouette, palette.
export const EARTH_STOPS=[
 ['taipei','台北市',25.034,121.565,'taipei101','city'],
 ['keelung','基隆市',25.130,121.744,'harbor','coast'],
 ['newtaipei','新北市',25.109,121.845,'lantern','town'],
 ['taoyuan','桃園市',25.080,121.235,'airport','city'],
 ['hsinchu_county','新竹縣',24.824,121.039,'rail','field'],
 ['hsinchu_city','新竹市',24.804,120.971,'gate','town'],
 ['miaoli','苗栗縣',24.350,120.774,'bridge','mountain'],
 ['taichung','台中市',24.162,120.640,'hall','city'],
 ['changhua','彰化縣',24.078,120.549,'buddha','town'],
 ['nantou','南投縣',23.864,120.915,'lake','mountain'],
 ['yunlin','雲林縣',23.710,120.434,'field','field'],
 ['chiayi_county','嘉義縣',23.511,120.805,'mountain','mountain'],
 ['chiayi_city','嘉義市',23.487,120.449,'train','town'],
 ['tainan','台南市',22.997,120.202,'fort','town'],
 ['kaohsiung','高雄市',22.619,120.281,'harbor','coast'],
 ['pingtung','屏東縣',21.902,120.852,'lighthouse','coast'],
 ['taitung','台東縣',22.914,121.124,'balloon','field'],
 ['hualien','花蓮縣',24.162,121.623,'gorge','mountain'],
 ['yilan','宜蘭縣',24.676,121.813,'field','field'],
 ['matsu','馬祖（連江縣）',26.157,119.922,'fort','coast'],
 ['kinmen','金門縣',24.433,118.318,'gate','town'],
 ['penghu','澎湖縣',23.576,119.579,'basalt','coast'],
 ['okinawa','日本・沖繩',26.217,127.719,'island','coast'],
 ['seoul','韓國・首爾',37.580,126.977,'palace','city'],
 ['osaka','日本・大阪',34.687,135.526,'palace','town'],
 ['tokyo','日本・東京',35.658,139.745,'torii','pink'],
 ['bangkok','泰國・曼谷',13.750,100.491,'temple','gold'],
 ['singapore','新加坡',1.283,103.860,'shiphotel','coast'],
 ['india','印度・阿格拉',27.175,78.042,'dome','gold'],
 ['dubai','阿聯酋・杜拜',25.197,55.274,'spire','sand'],
 ['egypt','埃及・開羅',29.979,31.134,'pyramid','sand'],
 ['rome','義大利・羅馬',41.890,12.492,'colosseum','town'],
 ['france','法國・巴黎',48.858,2.295,'tower','city'],
 ['london','英國・倫敦',51.501,-.125,'clock','city'],
 ['usa','美國・紐約',40.689,-74.045,'city','city'],
 ['rio','巴西・里約',-22.952,-43.211,'statue','mountain'],
 ['losangeles','美國・洛杉磯',34.134,-118.321,'city','gold'],
 ['hawaii','美國・夏威夷',21.262,-157.806,'island','coast'],
 ['australia','澳洲・雪梨',-33.857,151.215,'opera','coast'],
 ['newzealand','紐西蘭・奧克蘭',-36.848,174.763,'mountain','mountain'],
 ['world_complete','環球航線完成',-40,-178,'globe','coast']
];
export const PALETTES={
 city:['#cddff0','#c1c9ad','#6488a2'],coast:['#b8e8f1','#6bc0ca','#efbc77'],town:['#f0dec5','#d9ba90','#b9614e'],mountain:['#c1ded9','#8eac8d','#4e8873'],field:['#d3e8cc','#b7c27b','#d5a24f'],pink:['#efcddd','#d6bb9e','#cc4e58'],gold:['#f4e0b0','#d0b384','#c5983f'],sand:['#f7d9a3','#e1b86d','#be733e'],
 atmosphere:['#99b6dd','#7199be','#e4f6ff'],space:['#172543','#344365','#aec8ef'],moon:['#1b213b','#a0a3b0','#d9d8cf'],mars:['#372538','#b86e4e','#e7a375'],saturn:['#252441','#a79672','#edd6a6'],deep:['#151c32','#3b3c60','#b29ed9']
};
// Fictional connecting legs, NOT real orbital transfers or current interplanetary distances.
// Moon mean-distance reference384400km. Earth/Mars/Saturn mean solar radii149.6m/227.9m/1433.5m km.
// References: science.nasa.gov/moon/by-the-numbers/ and jpl.nasa.gov/edu/pdfs/scaless_reference.pdf
export const SPACE_STOPS=[
 ['atmosphere','大氣層',72,10,'clouds','atmosphere'],
 ['space','太空',96,90,'satellite','space'],
 ['moon','月球',192,384300,'moon','moon'],
 ['mars','火星',288,78300000,'mars','mars'],
 ['saturn','土星環',384,1205600000,'saturn','saturn'],
 ['deep_space','星際遠航',384,100000000,'stars','deep']
];
