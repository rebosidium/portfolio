// Independent v3 release check, adapted from the original site's proven updater.
(() => {
  const valid=value=>typeof value==='string'&&/^[a-f0-9]{12}$/i.test(value);
  const current=document.documentElement.dataset.build;
  if(!valid(current))return;
  const cooldown=120000,initialCheckAt=Date.now()+3000;
  const entry=new URL(location.href),entryVersion=entry.searchParams.get('v3'),entryRefresh=Number(entry.searchParams.get('_v3_refresh'));
  const attempts=new Map();let checking=false,reloading=false,interval;
  if(entry.searchParams.has('_v3_refresh')&&entryVersion===current){entry.searchParams.delete('_v3_refresh');try{history.replaceState(history.state,'',entry.href);}catch{}}
  const recent=(time,now)=>Number.isFinite(time)&&time>0&&Math.abs(now-time)<cooldown;
  function attempted(version,now){
    if(recent(attempts.get(version),now)||(entryVersion===version&&recent(entryRefresh,now)))return true;
    try{return recent(Number(sessionStorage.getItem(`v3:release:refresh:${version}`)),now);}catch{return false;}
  }
  async function check(){
    if(checking||reloading||document.hidden||navigator.onLine===false||Date.now()<initialCheckAt)return;
    checking=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const endpoint=new URL('/3/version.json',location.origin);endpoint.searchParams.set('_check',String(Date.now()));
      const response=await fetch(endpoint.href,{cache:'no-store',credentials:'omit',priority:'low',signal:controller.signal});
      if(!response.ok)return;const manifest=await response.json(),version=manifest?.revision;
      const now=Date.now();if(!valid(version)||version===current||attempted(version,now)||document.hidden||navigator.onLine===false)return;
      const destination=new URL(location.href);destination.searchParams.set('v3',version);destination.searchParams.set('_v3_refresh',String(now));
      attempts.set(version,now);try{sessionStorage.setItem(`v3:release:refresh:${version}`,String(now));}catch{}
      reloading=true;location.replace(destination.href);
    }catch{reloading=false;}finally{clearTimeout(timeout);checking=false;}
  }
  function visible(){clearInterval(interval);if(document.hidden)return;interval=setInterval(check,60000);check();}
  setTimeout(check,3000);addEventListener('online',check);addEventListener('focus',check);addEventListener('pageshow',visible);
  document.addEventListener('visibilitychange',visible);visible();
})();
