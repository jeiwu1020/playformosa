# Landmark art v10

## Scope and reference interpretation
The owner requested recognisable local scenery and no repeated 101. This is a stylised travel miniature, not an exact reconstruction. All v9 route coordinates, progression, mileage and gameplay are unchanged. Each stop now owns exactly one landmark group; ordinary buildings, vegetation and terrain may repeat with deterministic variation.

Official references used for shape, not copied runtime images:
- [Taipei City: 101 architecture](https://english.gov.taipei/News_Content.aspx?n=96870FBF0C35AC0A&s=99D3DFE5C9A05627): eight flared bamboo-like sections, base and spire.
- [Keelung colourful harbour houses](https://www.klcg.gov.tw/tw/klcg1/973-95929.html), [Kaohsiung Music Center construction](https://ncd.kcg.gov.tw/News_Content.aspx?n=1EB5B25D698645A9&s=3ABA9DAF86A74480&sms=EC0B3F39C6CD71A1): different port identities rather than a shared crane.
- [National Taichung Theater architecture](https://www.npac-ntt.org/about/architecture/design): pinched/bottle-shaped facade openings.
- [Alishan Forestry](https://www.forest.gov.tw/EN/0000184), [Tainan Chihkan route](https://www.twtainan.net/zh-tw/application/activity/4/), [Kinmen Juguang Tower](https://kinmen.travel/zh-tw/travel/attraction/389): forest/clouds rather than snowy cones; brick podium/pavilions and substantial tower bases.
- [Seoul palaces](https://english.seoul.go.kr/service/amusement/traditional-culture/2-five-palaces/), [Osaka Castle official guide](https://www.osakacastle.net/pdf/leaflet/english_2025.pdf): broad palace versus tall stacked keep.
- [Tokyo Tower](https://en.tokyotower.co.jp/plan/towerpedia/), [National Park Service: Liberty](https://www.nps.gov/npnh/learn/news/fact-sheet-stli.htm?fullweb=1), [Auckland Sky Tower](https://www.aucklandnz.com/explore/sky-tower-skycity-auckland): correct previously generic torii/city/mountain silhouettes near the existing route coordinates.
- [Sydney Opera House spherical solution](https://www.sydneyoperahouse.com/our-story/the-spherical-solution): curved shell roofs instead of straight cones.

Some county scenes combine local motifs rather than claiming the approximate coordinate is a precise street-view location. Full route remains explicitly a compressed adventure itinerary.

## Rendering and performance
Shared primitive vocabulary is compiled into one vertex-coloured mesh per district chunk and one per unique landmark. A seven-chunk sliding window disposes generated geometry when culled; source geometries/material are shared. No texture downloads, external models or postprocessing added. Landmark scale is composed for the existing orthographic view; depth alone does not reduce projected size. The athlete, controls, game camera and lighting are untouched.

## Test-contract migration
The v9 scenery resource test previously counted six shared primitive geometries while allowing 650 independent meshes. The new batches intentionally have more generated geometry objects but far fewer draw calls: test bounds are now fewer than32 live scenery meshes/geometries, one material, fewer than100000 vertices, plus disposal/revisit assertions. This is not a weakened physics test. All v8/v9 physical/input tests and the golden feel fixture remain unchanged.

CPU previews show actual source meshes/vertex colours, not browser screenshots. Landmark contact sheets use an explicit review camera; separately labelled actual-input frames use the real gameplay camera/state. WebGL/device performance and phone touch still require a real supported browser.
