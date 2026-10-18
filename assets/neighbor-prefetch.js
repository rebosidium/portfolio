(() => {
'use strict';
// Pure sizing policy shared by the live gallery and the background warmer.
// Crop factors mirror photo-gallery.css; browser checks compare actual boxes.
function galleryUnit(width,height,worldWidth,worldHeight,finePointer){
  const base=width<768 ? .49 : finePointer ? .75 : .68;
  return Math.max(base,width/(worldWidth*1.7),height/(worldHeight*1.7));
}
function photoCSSWidth(photo,unit){
  let width=photo.width*unit,height=photo.height*unit;
  if(photo.crop==='balloons')width*=2.2658;
  if(photo.crop==='coast'){width*=1.0017;height*=1.2093;}
  if(photo.crop==='coffee'){width*=1.3843*1.6866;height*=1.1857*1.0006;}
  if(photo.crop==='paddle'){width*=1.6237;height*=1.4756;}
  return Math.ceil(Math.max(width,height*photo.aspect));
}
function photoVariant(photo,unit,dpr){
  const required=Math.ceil(photoCSSWidth(photo,unit)*Math.max(1,dpr));
  return photo.variants.find(item=>item.width>=required)||photo.variants.at(-1);
}
function portraitQuality(cssWidth,dpr,saveData=false,androidTouch=false){
  const physical=cssWidth*Math.max(1,Math.min(dpr,androidTouch?2:Infinity));
  return saveData||physical<=600?'600':physical<=800?'800':'1200';
}

const catalog={"footerGalleryHeight":{"mobile":466.8,"desktop":600.8},"gallery":{"width":1800,"height":1467.3615488624491,"photos":[{"id":"team","width":319.33878771141315,"height":240.00619579568473,"crop":"cover","aspect":1.3305439330543933,"variants":[{"url":"/assets/photo-team-240.webp?v=00edf6a78cbf","bytes":12852,"width":240},{"url":"/assets/photo-team-360.webp?v=fe6dce186bcc","bytes":29436,"width":360},{"url":"/assets/photo-team-480.webp?v=5a24298914fb","bytes":50458,"width":480},{"url":"/assets/photo-team-640.webp?v=c419c8e4a34d","bytes":82342,"width":640},{"url":"/assets/photo-team-800.webp?v=56e9ee7142d9","bytes":124874,"width":800},{"url":"/assets/photo-team.webp?v=323c3117e86f","bytes":168080,"width":954}]},{"id":"helmet","width":259.298175066852,"height":343.7208367165248,"crop":"cover","aspect":0.7543859649122807,"variants":[{"url":"/assets/photo-helmet-240.webp?v=f77f88262ff2","bytes":19058,"width":240},{"url":"/assets/photo-helmet-360.webp?v=78a1b4b11e88","bytes":37476,"width":360},{"url":"/assets/photo-helmet-480.webp?v=eddf6b1bc15b","bytes":61774,"width":480},{"url":"/assets/photo-helmet-640.webp?v=4899c5a95b5c","bytes":104568,"width":640},{"url":"/assets/photo-helmet.webp?v=239752d85b61","bytes":151578,"width":774}]},{"id":"rapids","width":330.575612071719,"height":185.91572422913475,"crop":"cover","aspect":1.7780938833570412,"variants":[{"url":"/assets/photo-rapids-240.webp?v=51b184a45d42","bytes":16122,"width":240},{"url":"/assets/photo-rapids-360.webp?v=018b148c5361","bytes":35954,"width":360},{"url":"/assets/photo-rapids-480.webp?v=cdd039758b14","bytes":62732,"width":480},{"url":"/assets/photo-rapids-640.webp?v=d2599cf1ae98","bytes":111374,"width":640},{"url":"/assets/photo-rapids-800.webp?v=cdae3e521249","bytes":171962,"width":800},{"url":"/assets/photo-rapids-1040.webp?v=ee6332407b42","bytes":289774,"width":1040},{"url":"/assets/photo-rapids-1280.webp?v=5f9ea8be9cda","bytes":427508,"width":1280},{"url":"/assets/photo-rapids.webp?v=6d077187fc18","bytes":650438,"width":1600}]},{"id":"coast-selfie","width":330.575612071719,"height":185.91572422913475,"crop":"cover","aspect":1.7780938833570412,"variants":[{"url":"/assets/photo-coast-selfie-240.webp?v=3121233e787b","bytes":11542,"width":240},{"url":"/assets/photo-coast-selfie-360.webp?v=5bde6ec81da6","bytes":22376,"width":360},{"url":"/assets/photo-coast-selfie-480.webp?v=d85d5ce4009d","bytes":37690,"width":480},{"url":"/assets/photo-coast-selfie-640.webp?v=c90437db45c7","bytes":61756,"width":640},{"url":"/assets/photo-coast-selfie-800.webp?v=2bdf9c03f97c","bytes":93238,"width":800},{"url":"/assets/photo-coast-selfie-1040.webp?v=52e15888d508","bytes":152544,"width":1040},{"url":"/assets/photo-coast-selfie-1280.webp?v=c6c5055a737e","bytes":223334,"width":1280},{"url":"/assets/photo-coast-selfie.webp?v=ace6845b73d0","bytes":339444,"width":1600}]},{"id":"studio","width":258.84084510524957,"height":345.2666247525336,"crop":"cover","aspect":0.7496839443742098,"variants":[{"url":"/assets/photo-studio-240.webp?v=b84335a558e0","bytes":19168,"width":240},{"url":"/assets/photo-studio-360.webp?v=cc28d7abfa02","bytes":34738,"width":360},{"url":"/assets/photo-studio-480.webp?v=2bbaa3088878","bytes":54926,"width":480},{"url":"/assets/photo-studio-640.webp?v=6ca664d66c21","bytes":94670,"width":640},{"url":"/assets/photo-studio-800.webp?v=5d848746faf5","bytes":142552,"width":800},{"url":"/assets/photo-studio.webp?v=c34ab2135abc","bytes":206400,"width":960}]},{"id":"meeting","width":258.84084510524957,"height":345.2666247525336,"crop":"cover","aspect":0.7496839443742098,"variants":[{"url":"/assets/photo-meeting-240.webp?v=79df1e830a84","bytes":26282,"width":240},{"url":"/assets/photo-meeting-360.webp?v=212c9b74a726","bytes":49016,"width":360},{"url":"/assets/photo-meeting-480.webp?v=cde0026afa34","bytes":76276,"width":480},{"url":"/assets/photo-meeting-640.webp?v=7d6d27846f73","bytes":123852,"width":640},{"url":"/assets/photo-meeting-800.webp?v=60112adea6f6","bytes":174876,"width":800},{"url":"/assets/photo-meeting.webp?v=640abd03bcfb","bytes":235172,"width":960}]},{"id":"sail","width":259.298175066852,"height":345.87665510603705,"crop":"cover","aspect":0.7496839443742098,"variants":[{"url":"/assets/photo-sail-240.webp?v=79c38b17b7c4","bytes":17048,"width":240},{"url":"/assets/photo-sail-360.webp?v=4f1d2305b3c6","bytes":33352,"width":360},{"url":"/assets/photo-sail-480.webp?v=7a9f38d3e92a","bytes":54662,"width":480},{"url":"/assets/photo-sail-640.webp?v=bb01e487e8bc","bytes":95832,"width":640},{"url":"/assets/photo-sail-800.webp?v=a43d05126a8e","bytes":150654,"width":800},{"url":"/assets/photo-sail.webp?v=e8139709b51d","bytes":217952,"width":960}]},{"id":"dubai","width":254.98370185271295,"height":339.9782691369506,"crop":"cover","aspect":0.7496839443742098,"variants":[{"url":"/assets/photo-dubai-240.webp?v=00d345f3d89c","bytes":26186,"width":240},{"url":"/assets/photo-dubai-360.webp?v=2577af0f558b","bytes":52530,"width":360},{"url":"/assets/photo-dubai-480.webp?v=fc8fea7b39f7","bytes":87722,"width":480},{"url":"/assets/photo-dubai-640.webp?v=30e6d369124e","bytes":148946,"width":640},{"url":"/assets/photo-dubai-800.webp?v=7a9263df784b","bytes":229544,"width":800},{"url":"/assets/photo-dubai-1040.webp?v=7954fcb32b16","bytes":388712,"width":1040},{"url":"/assets/photo-dubai.webp?v=4f674412d2b8","bytes":525268,"width":1186}]},{"id":"airport","width":330.575612071719,"height":248.21377015623952,"crop":"cover","aspect":1.3337547408343868,"variants":[{"url":"/assets/photo-airport-240.webp?v=b5131cc4b25e","bytes":11846,"width":240},{"url":"/assets/photo-airport-360.webp?v=85a1f32d921a","bytes":22668,"width":360},{"url":"/assets/photo-airport-480.webp?v=89c6ef6684f2","bytes":36996,"width":480},{"url":"/assets/photo-airport-640.webp?v=b2a321978407","bytes":61428,"width":640},{"url":"/assets/photo-airport-800.webp?v=fb0cce8fae3a","bytes":87408,"width":800},{"url":"/assets/photo-airport-1040.webp?v=fd2e9f9e76f9","bytes":141918,"width":1040},{"url":"/assets/photo-airport-1280.webp?v=b7ccca3b2adf","bytes":207446,"width":1280},{"url":"/assets/photo-airport.webp?v=31b9e2723c4d","bytes":312090,"width":1600}]},{"id":"logs","width":330.575612071719,"height":247.67881871055437,"crop":"cover","aspect":1.3346938775510204,"variants":[{"url":"/assets/photo-logs-240.webp?v=9f994385ff31","bytes":26994,"width":240},{"url":"/assets/photo-logs.webp?v=d39b694a222e","bytes":48550,"width":327}]},{"id":"bike","width":330.575612071719,"height":248.21377015623952,"crop":"cover","aspect":1.3337547408343868,"variants":[{"url":"/assets/photo-bike-240.webp?v=1552cbc41e86","bytes":13348,"width":240},{"url":"/assets/photo-bike-360.webp?v=411c884d5500","bytes":24344,"width":360},{"url":"/assets/photo-bike-480.webp?v=a533abc039b9","bytes":38120,"width":480},{"url":"/assets/photo-bike-640.webp?v=2c276f5f3e4f","bytes":62570,"width":640},{"url":"/assets/photo-bike-800.webp?v=1cfdec05d00a","bytes":96032,"width":800},{"url":"/assets/photo-bike-1040.webp?v=5f80866df4db","bytes":171796,"width":1040},{"url":"/assets/photo-bike-1280.webp?v=a931094f3684","bytes":266972,"width":1280},{"url":"/assets/photo-bike.webp?v=a8137a2d7308","bytes":447960,"width":1600}]},{"id":"road","width":319.33878771141315,"height":319.33878771141315,"crop":"cover","aspect":1,"variants":[{"url":"/assets/photo-road-240.webp?v=dc72384d1a0b","bytes":21592,"width":240},{"url":"/assets/photo-road-360.webp?v=da29672a774b","bytes":49414,"width":360},{"url":"/assets/photo-road-480.webp?v=82852007ad2d","bytes":85082,"width":480},{"url":"/assets/photo-road-640.webp?v=9427daabf47e","bytes":152106,"width":640},{"url":"/assets/photo-road-800.webp?v=25ff784019fd","bytes":220912,"width":800},{"url":"/assets/photo-road.webp?v=f03e04da2e63","bytes":226772,"width":819}]},{"id":"rain","width":330.575612071719,"height":220.383741381146,"crop":"cover","aspect":1.5003663003663004,"variants":[{"url":"/assets/photo-rain-240.webp?v=70f5b3704d40","bytes":20540,"width":240},{"url":"/assets/photo-rain-360.webp?v=3ad977cd56ca","bytes":37062,"width":360},{"url":"/assets/photo-rain-480.webp?v=5f973d33c051","bytes":58024,"width":480},{"url":"/assets/photo-rain-640.webp?v=41e57b2eb1e0","bytes":90674,"width":640},{"url":"/assets/photo-rain-800.webp?v=bb8b215bdf95","bytes":131164,"width":800},{"url":"/assets/photo-rain-1040.webp?v=9fb10753131b","bytes":199490,"width":1040},{"url":"/assets/photo-rain-1280.webp?v=c83a4df0a01b","bytes":281218,"width":1280},{"url":"/assets/photo-rain.webp?v=d067100410b9","bytes":404962,"width":1600}]},{"id":"ski","width":319.33878771141315,"height":319.33878771141315,"crop":"cover","aspect":1,"variants":[{"url":"/assets/photo-ski-240.webp?v=2b4e78ed6aff","bytes":21564,"width":240},{"url":"/assets/photo-ski-360.webp?v=d3312a01ad09","bytes":46456,"width":360},{"url":"/assets/photo-ski-480.webp?v=094cb62e52b4","bytes":79300,"width":480},{"url":"/assets/photo-ski-640.webp?v=eff8be8f8ca7","bytes":138092,"width":640},{"url":"/assets/photo-ski-800.webp?v=4cdc013ffbb8","bytes":206782,"width":800},{"url":"/assets/photo-ski-1040.webp?v=4915a2e24513","bytes":307350,"width":1040},{"url":"/assets/photo-ski.webp?v=183317722edf","bytes":289926,"width":1080}]},{"id":"start","width":319.33878771141315,"height":239.7765641519143,"crop":"cover","aspect":1.3337547408343868,"variants":[{"url":"/assets/photo-start-240.webp?v=2bc475f76781","bytes":22076,"width":240},{"url":"/assets/photo-start-360.webp?v=ec2869ee40a2","bytes":45224,"width":360},{"url":"/assets/photo-start-480.webp?v=9e53df54d1c5","bytes":72530,"width":480},{"url":"/assets/photo-start-640.webp?v=7f0d8a597b4f","bytes":119816,"width":640},{"url":"/assets/photo-start-800.webp?v=c7774c3458f7","bytes":181272,"width":800},{"url":"/assets/photo-start-1040.webp?v=f6b5dae80acf","bytes":286220,"width":1040},{"url":"/assets/photo-start-1280.webp?v=4e244936a76e","bytes":411980,"width":1280},{"url":"/assets/photo-start.webp?v=3e385bad8bd1","bytes":603394,"width":1600}]},{"id":"office","width":258.84084510524957,"height":344.72894370835513,"crop":"cover","aspect":0.75,"variants":[{"url":"/assets/photo-office-240.webp?v=0a04187556b9","bytes":22554,"width":240},{"url":"/assets/photo-office-360.webp?v=225a5da243eb","bytes":44308,"width":360},{"url":"/assets/photo-office-480.webp?v=b13982785209","bytes":66698,"width":480},{"url":"/assets/photo-office-640.webp?v=bba3d6f38d8c","bytes":113670,"width":640},{"url":"/assets/photo-office-800.webp?v=16ebb738a4d4","bytes":162884,"width":800},{"url":"/assets/photo-office.webp?v=9dc04310a249","bytes":189108,"width":960}]},{"id":"0741","width":245.92287819205316,"height":327.5438334540708,"crop":"cover","aspect":0.75,"variants":[{"url":"/assets/photo-7b03b-240.webp?v=910aad8efc4c","bytes":30438,"width":240},{"url":"/assets/photo-7b03b-360.webp?v=0302f1e6a2e1","bytes":70128,"width":360},{"url":"/assets/photo-7b03b-480.webp?v=573ea960ef4c","bytes":121154,"width":480},{"url":"/assets/photo-7b03b-640.webp?v=6122e7916ab8","bytes":221370,"width":640},{"url":"/assets/photo-7b03b-800.webp?v=905deef5d6bb","bytes":332372,"width":800},{"url":"/assets/photo-7b03b-1040.webp?v=a8cea5dbedab","bytes":543848,"width":1040},{"url":"/assets/photo-7b03b.webp?v=932fcc828ed7","bytes":709900,"width":1200}]},{"id":"4440","width":254.98370185271295,"height":324.9349828919528,"crop":"balloons","aspect":1.7777777777777777,"variants":[{"url":"/assets/photo-3f816-240.webp?v=ce5437e78b92","bytes":11726,"width":240},{"url":"/assets/photo-3f816-360.webp?v=5f7489759aa5","bytes":23384,"width":360},{"url":"/assets/photo-3f816-480.webp?v=924447f3c5e8","bytes":38574,"width":480},{"url":"/assets/photo-3f816-640.webp?v=864bc147a805","bytes":64302,"width":640},{"url":"/assets/photo-3f816-800.webp?v=9c6cddbc2633","bytes":96662,"width":800},{"url":"/assets/photo-3f816-1040.webp?v=4d35dda15983","bytes":156416,"width":1040},{"url":"/assets/photo-3f816-1280.webp?v=5e924e2b7bfb","bytes":228014,"width":1280},{"url":"/assets/photo-3f816.webp?v=f902377d8448","bytes":340226,"width":1600}]},{"id":"8235","width":259.298175066852,"height":345.33802406630747,"crop":"cover","aspect":0.75,"variants":[{"url":"/assets/photo-e0372-240.webp?v=909cbfdce80f","bytes":31724,"width":240},{"url":"/assets/photo-e0372-360.webp?v=66bd5c0256e9","bytes":68910,"width":360},{"url":"/assets/photo-e0372-480.webp?v=9a2c01796864","bytes":121480,"width":480},{"url":"/assets/photo-e0372-640.webp?v=9683e7baf633","bytes":215376,"width":640},{"url":"/assets/photo-e0372-800.webp?v=f48e834a4666","bytes":336148,"width":800},{"url":"/assets/photo-e0372-1040.webp?v=b56e49699f23","bytes":573458,"width":1040},{"url":"/assets/photo-e0372.webp?v=2bda0870165d","bytes":754848,"width":1200}]},{"id":"7013","width":245.92287819205316,"height":362.4119240265003,"crop":"coffee","aspect":1.3333333333333333,"variants":[{"url":"/assets/photo-ab055-240.webp?v=f7da523158a7","bytes":14260,"width":240},{"url":"/assets/photo-ab055-360.webp?v=f9977c78d9d1","bytes":28518,"width":360},{"url":"/assets/photo-ab055-480.webp?v=f8c4b4783237","bytes":47028,"width":480},{"url":"/assets/photo-ab055-640.webp?v=c3393a615128","bytes":78474,"width":640},{"url":"/assets/photo-ab055-800.webp?v=8a97450d72ec","bytes":118916,"width":800},{"url":"/assets/photo-ab055-1040.webp?v=b74923ce4f50","bytes":203572,"width":1040},{"url":"/assets/photo-ab055-1280.webp?v=8e04405360b3","bytes":321656,"width":1280},{"url":"/assets/photo-ab055.webp?v=b185a70fb0eb","bytes":530550,"width":1600}]},{"id":"7375","width":245.92287819205316,"height":362.708171945357,"crop":"coast","aspect":0.5625,"variants":[{"url":"/assets/photo-e2d31-240.webp?v=ae9739d9d3a9","bytes":39108,"width":240},{"url":"/assets/photo-e2d31-360.webp?v=a73b11bfe0a2","bytes":84906,"width":360},{"url":"/assets/photo-e2d31-480.webp?v=911634dd4aa6","bytes":146236,"width":480},{"url":"/assets/photo-e2d31-640.webp?v=7ae731c76cac","bytes":251770,"width":640},{"url":"/assets/photo-e2d31-800.webp?v=b236a19890c8","bytes":381998,"width":800},{"url":"/assets/photo-e2d31.webp?v=925774b530e2","bytes":476082,"width":900}]},{"id":"5146","width":245.92287819205316,"height":327.33761943652127,"crop":"cover","aspect":0.75,"variants":[{"url":"/assets/photo-fd9a1-240.webp?v=4c1e2357b271","bytes":45480,"width":240},{"url":"/assets/photo-fd9a1-360.webp?v=20983ccbe976","bytes":99582,"width":360},{"url":"/assets/photo-fd9a1-480.webp?v=1d496c56bcb7","bytes":170974,"width":480},{"url":"/assets/photo-fd9a1-640.webp?v=ae18b62d4224","bytes":301552,"width":640},{"url":"/assets/photo-fd9a1-800.webp?v=2a548a534313","bytes":465568,"width":800},{"url":"/assets/photo-fd9a1.webp?v=6172862278dc","bytes":668886,"width":960}]},{"id":"5291","width":319.33878771141315,"height":239.70121349202373,"crop":"cover","aspect":1.3337547408343868,"variants":[{"url":"/assets/photo-fcfe0-240.webp?v=06978dea52a7","bytes":15636,"width":240},{"url":"/assets/photo-fcfe0-360.webp?v=bc307b689b51","bytes":31362,"width":360},{"url":"/assets/photo-fcfe0-480.webp?v=a925d4b780cc","bytes":53042,"width":480},{"url":"/assets/photo-fcfe0-640.webp?v=4a65d29a2f1c","bytes":90298,"width":640},{"url":"/assets/photo-fcfe0-800.webp?v=a9789bd653e9","bytes":139838,"width":800},{"url":"/assets/photo-fcfe0-1040.webp?v=52c112c718c2","bytes":236060,"width":1040},{"url":"/assets/photo-fcfe0-1280.webp?v=1eb0407e7893","bytes":356754,"width":1280},{"url":"/assets/photo-fcfe0.webp?v=893456ae4ecc","bytes":556650,"width":1600}]},{"id":"1561","width":254.98370185271295,"height":339.3244647732257,"crop":"cover","aspect":0.7496839443742098,"variants":[{"url":"/assets/photo-91b2a-240.webp?v=4c934a89f199","bytes":56936,"width":240},{"url":"/assets/photo-91b2a-360.webp?v=e64deacc3d8d","bytes":119186,"width":360},{"url":"/assets/photo-91b2a-480.webp?v=6e9ae29910f0","bytes":204114,"width":480},{"url":"/assets/photo-91b2a-640.webp?v=44b4b9d64905","bytes":353468,"width":640},{"url":"/assets/photo-91b2a-800.webp?v=0b79bef55770","bytes":528866,"width":800},{"url":"/assets/photo-91b2a-1040.webp?v=788241e54c43","bytes":844638,"width":1040},{"url":"/assets/photo-91b2a.webp?v=68953b486266","bytes":1073784,"width":1186}]},{"id":"3989","width":258.84084510524957,"height":344.73935564902706,"crop":"cover","aspect":0.7496839443742098,"variants":[{"url":"/assets/photo-50894-240.webp?v=8f471db29b78","bytes":28844,"width":240},{"url":"/assets/photo-50894-360.webp?v=d7961ab317bc","bytes":59566,"width":360},{"url":"/assets/photo-50894-480.webp?v=77c75a3a5c1d","bytes":100132,"width":480},{"url":"/assets/photo-50894-640.webp?v=997e99c972a2","bytes":171310,"width":640},{"url":"/assets/photo-50894-800.webp?v=26355c573d0d","bytes":256758,"width":800},{"url":"/assets/photo-50894-1040.webp?v=83c7c6eb0339","bytes":411910,"width":1040},{"url":"/assets/photo-50894.webp?v=49356cc9c29c","bytes":531160,"width":1186}]},{"id":"6332","width":259.298175066852,"height":345.06603297358004,"crop":"cover","aspect":0.7496839443742098,"variants":[{"url":"/assets/photo-b355d-240.webp?v=5ee9ff74e2bc","bytes":20284,"width":240},{"url":"/assets/photo-b355d-360.webp?v=5f549022d24a","bytes":38220,"width":360},{"url":"/assets/photo-b355d-480.webp?v=022044bc5342","bytes":60400,"width":480},{"url":"/assets/photo-b355d-640.webp?v=8457a21419b8","bytes":109536,"width":640},{"url":"/assets/photo-b355d-800.webp?v=23bb9bdd2224","bytes":178060,"width":800},{"url":"/assets/photo-b355d-1040.webp?v=49073a2925ea","bytes":318628,"width":1040},{"url":"/assets/photo-b355d.webp?v=b12259889ce3","bytes":449460,"width":1186}]},{"id":"4632","width":254.98370185271295,"height":375.76383206032017,"crop":"paddle","aspect":0.75,"variants":[{"url":"/assets/photo-fddbd-240.webp?v=6b49852322b4","bytes":26638,"width":240},{"url":"/assets/photo-fddbd-360.webp?v=665fc27440c0","bytes":57188,"width":360},{"url":"/assets/photo-fddbd-480.webp?v=3a17a1c11fee","bytes":95772,"width":480},{"url":"/assets/photo-fddbd-640.webp?v=7eea3f586bb0","bytes":164638,"width":640},{"url":"/assets/photo-fddbd-800.webp?v=00bcd686a804","bytes":254004,"width":800},{"url":"/assets/photo-fddbd-1040.webp?v=1a65e494b3f7","bytes":418674,"width":1040},{"url":"/assets/photo-fddbd.webp?v=5734619958af","bytes":540632,"width":1200}]}]},"poster":"/assets/portrait-start.webp?v=c93a9a36c801","front":"/assets/portrait-front.webp?v=b288f612539c","darkPoster":"/assets/portrait-start-dark.webp?v=a826e79f0936","darkFront":"/assets/portrait-front-dark.webp?v=12250448fed5","portrait":{"600":[{"url":"/assets/seedance-startup-600-00.zip?v=e5c1affc5183","bytes":3436066,"startup":true},{"url":"/assets/seedance-rest-600-00.zip?v=92412e944a06","bytes":3981888,"startup":false},{"url":"/assets/seedance-rest-600-01.zip?v=3f649ad1191d","bytes":3970468,"startup":false},{"url":"/assets/seedance-rest-600-02.zip?v=9b4f66f19b4a","bytes":1158410,"startup":false}],"800":[{"url":"/assets/seedance-startup-800-00.zip?v=75626f7281d2","bytes":3311810,"startup":true},{"url":"/assets/seedance-startup-800-01.zip?v=9802b7203027","bytes":1741070,"startup":true},{"url":"/assets/seedance-rest-800-00.zip?v=8b3aedda54b9","bytes":3383180,"startup":false},{"url":"/assets/seedance-rest-800-01.zip?v=d888e387bac9","bytes":3426478,"startup":false},{"url":"/assets/seedance-rest-800-02.zip?v=7d4d4bcf1416","bytes":3428754,"startup":false},{"url":"/assets/seedance-rest-800-03.zip?v=c2fdf11eb585","bytes":2751164,"startup":false}],"1200":[{"url":"/assets/seedance-startup-1200-00.zip?v=9e9791f11846","bytes":2753578,"startup":true},{"url":"/assets/seedance-startup-1200-01.zip?v=65243adf8773","bytes":2720188,"startup":true},{"url":"/assets/seedance-startup-1200-02.zip?v=af2b7025704b","bytes":1905106,"startup":true},{"url":"/assets/seedance-rest-1200-00.zip?v=e245f05239cb","bytes":2858568,"startup":false},{"url":"/assets/seedance-rest-1200-01.zip?v=750f09c91411","bytes":2840388,"startup":false},{"url":"/assets/seedance-rest-1200-02.zip?v=52780f2d2d17","bytes":2814712,"startup":false},{"url":"/assets/seedance-rest-1200-03.zip?v=41055ff16cf0","bytes":2826116,"startup":false},{"url":"/assets/seedance-rest-1200-04.zip?v=9e7f10839084","bytes":2860382,"startup":false},{"url":"/assets/seedance-rest-1200-05.zip?v=e501ea654aa3","bytes":2821454,"startup":false},{"url":"/assets/seedance-rest-1200-06.zip?v=0d98f58a4bcf","bytes":1511970,"startup":false}],"600-dark":[{"url":"/assets/seedance-startup-600-dark-00.zip?v=b8b6b4cbf5fc","bytes":3476556,"startup":true},{"url":"/assets/seedance-rest-600-dark-00.zip?v=0e64c9fc1560","bytes":4055572,"startup":false},{"url":"/assets/seedance-rest-600-dark-01.zip?v=24e0e3f1b25a","bytes":4019788,"startup":false},{"url":"/assets/seedance-rest-600-dark-02.zip?v=b035f2a5e759","bytes":1166100,"startup":false}],"800-dark":[{"url":"/assets/seedance-startup-800-dark-00.zip?v=97f2094c7199","bytes":3365766,"startup":true},{"url":"/assets/seedance-startup-800-dark-01.zip?v=74dd715bd687","bytes":1772302,"startup":true},{"url":"/assets/seedance-rest-800-dark-00.zip?v=5cacbc2c8776","bytes":3465080,"startup":false},{"url":"/assets/seedance-rest-800-dark-01.zip?v=2929adc18844","bytes":3532918,"startup":false},{"url":"/assets/seedance-rest-800-dark-02.zip?v=4f2d00cf02a6","bytes":3502440,"startup":false},{"url":"/assets/seedance-rest-800-dark-03.zip?v=6710239bf84a","bytes":2779976,"startup":false}],"1200-dark":[{"url":"/assets/seedance-startup-1200-dark-00.zip?v=ed9f3f2e9d03","bytes":2825698,"startup":true},{"url":"/assets/seedance-startup-1200-dark-01.zip?v=f010ed3aa15b","bytes":2781526,"startup":true},{"url":"/assets/seedance-startup-1200-dark-02.zip?v=b8c031dd1b3f","bytes":1963780,"startup":true},{"url":"/assets/seedance-rest-1200-dark-00.zip?v=0662a17a4944","bytes":2950106,"startup":false},{"url":"/assets/seedance-rest-1200-dark-01.zip?v=b82a8974a33d","bytes":2967406,"startup":false},{"url":"/assets/seedance-rest-1200-dark-02.zip?v=2675511d12cd","bytes":2967526,"startup":false},{"url":"/assets/seedance-rest-1200-dark-03.zip?v=f36181a1f439","bytes":2937696,"startup":false},{"url":"/assets/seedance-rest-1200-dark-04.zip?v=929c7c18672d","bytes":2956020,"startup":false},{"url":"/assets/seedance-rest-1200-dark-05.zip?v=8682123f250c","bytes":2874578,"startup":false},{"url":"/assets/seedance-rest-1200-dark-06.zip?v=5ed7247dd344","bytes":1544744,"startup":false}]}};
// Wrapped with the versioned asset catalog and media-selection.mjs by build-site.
const route=location.pathname.replace(/index\.html$/,'').replace(/\/$/,'')||'/';
if(!['/','/about'].includes(route)||window.top!==window||window.PortfolioNeighborPrefetch)return;
const home=route==='/',root=document.documentElement,connection=navigator.connection;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(max-width: 767px), (max-width: 1023px) and (pointer: coarse)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');
const coarse=matchMedia('(pointer: coarse)');
const done=new Set(),failed=new Map(),retryAt=new Map(),events=[];
let active=null,timer=0,idle=null,departed=false,lastActivity=performance.now(),ownReady=false;
let preparedLayout='',ownImagesStarted=false,ownWork=null,ownWorkFailed=new WeakSet(),fontsReady=false,galleryPreparation=null;
const quietMs=750;
const absolute=url=>new URL(url,location.origin).href;
function status(value){root.dataset.neighborPrefetch=value;}
function record(type,detail={}){
  events.push({type,at:Math.round(performance.now()),...detail});
  if(events.length>160)events.shift();
}
function permitted(){
  return !departed&&!document.hidden&&navigator.onLine!==false&&!connection?.saveData&&
    !['slow-2g','2g','3g'].includes(connection?.effectiveType);
}
function fullPortraitPermitted(){
  // Unknown network quality (including Safari) permits only the startup set.
  return permitted()&&connection?.effectiveType==='4g'&&connection.downlink>=5&&
    Number.isFinite(connection.rtt)&&connection.rtt<=150&&connection.type!=='cellular';
}
function portraitSafe(){
  if(!home||reduced.matches)return true;
  const state=window.portraitPlayer?.loadingState;
  if(!state)return !window.portraitReady||root.dataset.contentReadyAt!==undefined;
  return state.activeDownloads===0&&(state.error||
    (state.ready&&state.allReady&&state.quality===state.desiredQuality)||(!state.loading&&!state.ready));
}
function currentBusy(){
  if(!ownReady||!portraitSafe()||ownWork)return true;
  if(['waiting','scheduled','loading'].includes(root.dataset.resumePrefetch))return true;
  return [...document.images].some(image=>!image.closest('.photo-gallery')&&!image.complete&&image.getAttribute('src'));
}
function photoTasks(){
  const width=root.clientWidth;
  const height=catalog.footerGalleryHeight[mobile.matches?'mobile':'desktop'];
  const unit=galleryUnit(width,height,catalog.gallery.width,catalog.gallery.height,width>=768&&fine.matches);
  return catalog.gallery.photos.map(photo=>({...photoVariant(photo,unit,devicePixelRatio||1),kind:'photo'}));
}
function tasks(){
  const photos=photoTasks();
  if(home)return photos.map(item=>({...item,stage:'neighbor-photos'}));
  const own=photos.map(item=>({...item,stage:'current-photos'}));
  const dark=getComputedStyle(root).colorScheme==='dark';
  const poster={url:reduced.matches?(dark?catalog.darkFront:catalog.front):(dark?catalog.darkPoster:catalog.poster),stage:'neighbor-startup',kind:'poster'};
  if(reduced.matches)return [...own,poster];
  const quality=portraitQuality(mobile.matches?247:270,devicePixelRatio||1,false,/Android/i.test(navigator.userAgent)&&coarse.matches);
  const chunks=catalog.portrait[dark?quality+'-dark':quality];
  const starter=chunks.filter(item=>item.startup).map(item=>({...item,stage:'neighbor-startup',kind:'zip'}));
  const rest=fullPortraitPermitted()&&chunks.reduce((sum,item)=>sum+item.bytes,0)<=26*1024*1024
    ?chunks.filter(item=>!item.startup).map(item=>({...item,stage:'neighbor-rest',kind:'zip'})):[];
  return [...own,poster,...starter,...rest];
}
function cancelIdle(){
  if(idle===null)return;
  if(window.cancelIdleCallback)cancelIdleCallback(idle);else clearTimeout(idle);
  idle=null;
}
function pause(reason){
  cancelIdle();
  if(active){active.reason=reason;active.controller.abort();}
  status('paused');
}
function changed(){
  lastActivity=performance.now();ownReady=false;
  if(active&&active.task.stage!=='current-photos')pause('current-page');
  schedule();
}
function prepareCurrent(){
  if(!fontsReady||!portraitSafe()||document.readyState!=='complete')return false;
  // Complete the actual HOME previews before spending bandwidth on About.
  // Existing scene/reveal handlers retain ownership of their presentation.
  if(home&&window.PortfolioProjectMedia&&!ownWork){
    const artwork=[...document.querySelectorAll('.work-artwork')].find(node=>
      !['ready','failed'].includes(node.dataset.imageState)&&!ownWorkFailed.has(node));
    if(artwork){
      const image=artwork.querySelector('img');
      if(image){image.fetchPriority='low';image.loading='eager';}
      ownWork=artwork;record('current-work');
      window.PortfolioProjectMedia.load(artwork).catch(()=>ownWorkFailed.add(artwork)).finally(()=>{
        ownWork=null;lastActivity=performance.now();schedule();
      });
      return false;
    }
  }
  if(!ownImagesStarted){
    ownImagesStarted=true;
    // Gallery bytes are prepared explicitly, without mounting/decoding clones.
    for(const image of document.images)if(!image.closest('.photo-gallery'))image.loading='eager';
    lastActivity=performance.now();
  }
  return !ownWork;
}
function schedule(){
  if(timer||departed)return;
  timer=setTimeout(()=>{timer=0;check();},250);
}
function check(){
  if(!permitted()){pause('environment');return;}
  const layout=[root.clientWidth,devicePixelRatio,mobile.matches,fine.matches,coarse.matches,reduced.matches].join(':');
  if(preparedLayout!==layout){
    preparedLayout=layout;changed();
    if(active)pause('layout');
  }
  if(!prepareCurrent()){status('waiting-current');schedule();return;}
  ownReady=true;
  if(currentBusy()){
    if(active?.task.stage!=='current-photos')pause('current-page');
    status('waiting-current');schedule();return;
  }
  const list=tasks();
  // A quality/network change may remove a previously scheduled rest chunk.
  if(active&&!list.some(task=>absolute(task.url)===active.url)){pause('policy');schedule();return;}
  if(active||idle!==null)return;
  const next=list.find(task=>!done.has(absolute(task.url))&&(failed.get(absolute(task.url))||0)<2);
  const gallery=window.PortfolioPhotoGallery;
  if(!home&&next?.stage!=='current-photos'&&gallery&&!gallery.settled){
    status('current-photo-decode');
    if(!galleryPreparation){
      const unavailable=[...failed].filter(([,attempts])=>attempts>=2).map(([url])=>url);
      galleryPreparation=gallery.prepare({unavailable}).catch(()=>{}).finally(()=>{
        galleryPreparation=null;record(gallery.settled?'current-gallery-settled':'current-gallery-paused');lastActivity=performance.now();schedule();
      });
    }
    return;
  }
  if(!next){
    const failures=list.filter(task=>!done.has(absolute(task.url))).length+(!home&&gallery?gallery.snapshot().reduce((n,state)=>n+state.failed,0):0);
    status(failures?'complete-with-errors':'ready');
    root.dataset.neighborPrefetchReadyAt=performance.now().toFixed(1);
    return;
  }
  if(performance.now()-lastActivity<quietMs||(retryAt.get(absolute(next.url))||0)>performance.now()){
    status('waiting-idle');schedule();return;
  }
  status('scheduled');
  const run=()=>{idle=null;download(next);};
  idle=window.requestIdleCallback?requestIdleCallback(run,{timeout:1500}):setTimeout(run,100);
}
async function download(task){
  const url=absolute(task.url);
  if(active||!permitted()||currentBusy()||performance.now()-lastActivity<quietMs||
    !tasks().some(item=>absolute(item.url)===url)){schedule();return;}
  const job={url,task,controller:new AbortController(),reason:null};
  active=job;status(task.stage);record('start',{url,stage:task.stage});
  const timeout=setTimeout(()=>{job.reason='timeout';job.controller.abort();},30000);
  try{
    const response=await fetch(url,{cache:'force-cache',mode:'same-origin',credentials:'same-origin',
      priority:'low',signal:job.controller.signal});
    if(!response.ok)throw Error('Asset unavailable: '+response.status);
    const type=response.headers.get('content-type')||'';
    if(task.kind==='zip'?!/zip|octet-stream/i.test(type):!type.startsWith('image/'))throw Error('Unexpected asset type');
    const limit=task.bytes?task.bytes+1024:2*1024*1024;
    let bytes=0;
    if(response.body?.getReader){
      const reader=response.body.getReader();
      while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>limit){await reader.cancel();throw Error('Asset exceeds budget');}}
    }else bytes=(await response.arrayBuffer()).byteLength;
    if(bytes>limit)throw Error('Asset exceeds budget');
    if(job.controller.signal.aborted)return;
    done.add(url);retryAt.delete(url);record('complete',{url,stage:task.stage,bytes});
  }catch(error){
    if(error.name!=='AbortError'||job.reason==='timeout'){
      failed.set(url,(failed.get(url)||0)+1);retryAt.set(url,performance.now()+5000);
      record('error',{url,message:error.message});
    }else record('pause',{url,reason:job.reason});
  }finally{clearTimeout(timeout);active=null;schedule();}
}
window.PortfolioNeighborPrefetch={snapshot:()=>({route:home?'/':'/about/',status:root.dataset.neighborPrefetch,
  fullPortrait:fullPortraitPermitted(),ownReady:ownReady&&!currentBusy()&&(home||!window.PortfolioPhotoGallery||window.PortfolioPhotoGallery.settled),active:active?.url||null,
  planned:tasks(),completed:[...done],failed:[...failed],events:[...events]})};
// Only actual image/script source changes invalidate readiness, not animation
// styles, photo transforms or our diagnostic attributes.
new MutationObserver(records=>{
  if(records.some(item=>item.attributeName==='data-resume-prefetch')){schedule();return;}
  if(records.some(item=>item.type==='attributes'||[...item.addedNodes].some(node=>
    node.nodeType===1&&(node.matches('img[src],script[src],link[rel=stylesheet]')||node.querySelector('img[src],script[src]')))))changed();
}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset','data-resume-prefetch']});
document.addEventListener('load',event=>{if(event.target instanceof HTMLImageElement)changed();},true);
document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement)changed();},true);
window.portraitPlayer?.subscribeLoading(()=>{if(!portraitSafe())changed();else schedule();});
for(const name of ['online','offline','resize'])window.addEventListener(name,changed);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('hidden');else changed();});
connection?.addEventListener('change',()=>{if(active?.task.stage==='neighbor-rest'&&!fullPortraitPermitted())pause('network');changed();});
for(const query of [mobile,fine,coarse,reduced,matchMedia('(prefers-color-scheme: dark)')])query.addEventListener('change',changed);
window.addEventListener('pagehide',()=>{departed=true;clearTimeout(timer);timer=0;pause('pagehide');});
window.addEventListener('pageshow',()=>{departed=false;changed();});
Promise.resolve(document.fonts?.ready).then(()=>{fontsReady=true;changed();});
status('waiting-current');schedule();

})();
