/* Network-only delivery for the interface library. No offline cache is kept. */
'use strict';

const dsPath=pathname=>pathname.startsWith('/test10/ds/');
const noncePrefix=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
let nonce=0;

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

async function fromNetwork(request,url){
  // Mutable text gets a fresh CDN URL as well as bypassing the browser cache.
  // Keep all existing content fingerprints and component preview parameters.
  if(url.pathname.endsWith('/')||/\.(?:html|m?js|css|json)$/i.test(url.pathname)){
    url.searchParams.set('_dsfresh',noncePrefix+'-'+(++nonce));
    // A navigation's `navigate` mode cannot be passed to the Request constructor.
    request=new Request(url.href,{
      method:request.method,headers:request.headers,
      mode:request.mode==='navigate'?'same-origin':request.mode,
      credentials:request.credentials,redirect:request.redirect,
      referrer:request.referrer,referrerPolicy:request.referrerPolicy,
      integrity:request.integrity,signal:request.signal,keepalive:request.keepalive,
      cache:'no-store'
    });
  }
  // Deliberately let network errors reject: never substitute an old DS response.
  const response=await fetch(request,{cache:'no-store'});
  if(response.type!=='basic'&&response.type!=='default')return response;
  const headers=new Headers(response.headers);
  // Fetch has already decoded the streamed body. Transport metadata from the
  // encoded upstream payload no longer describes this reconstructed response.
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  headers.set('Cache-Control','no-store, max-age=0');
  headers.set('Pragma','no-cache');
  headers.set('Expires','0');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  const {request}=event;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    // A link out of DS must retain the destination page's ordinary cache policy.
    if(dsPath(url.pathname))event.respondWith(fromNetwork(request,url));
    return;
  }
  if(!event.clientId)return;
  event.respondWith((async()=>{
    let client;
    try{client=await self.clients.get(event.clientId);}catch(_){}
    if(!client||!dsPath(new URL(client.url).pathname))return fetch(request);
    // This includes /assets, /styles.css and other actual DS preview dependencies.
    return fromNetwork(request,url);
  })());
});
