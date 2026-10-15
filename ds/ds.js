(() => {
  const {examples,icons,tokens}=window.DS_CATALOG;
  const labels={'default':'Default','hover':'Hover','focus':'Keyboard focus','pressed':'Pressed','copied':'Copied','manual-copy':'Manual copy','disabled':'Disabled','reduced-motion':'Reduced motion','initial':'Initial frame','front':'Front','empty':'Empty','closed':'Closed','open':'Open','gray':'Gray surface','white':'White surface','homepage':'Homepage','about':'About','pulsing':'Visible · pulsing','paused':'Paused','composite':'Transparent artwork','image-error':'Preview unavailable'};
  let mode='desktop';
  let navigationId=0;
  const items=[];
  document.querySelector('#specimen-count').textContent=`${examples.length} live specimens`;
  document.querySelector('#icon-count').textContent=`${icons.length} current icons · ${icons.reduce((count,icon)=>count+icon.variants.length,0)} used variants`;
  for(const icon of icons){
    const card=document.createElement('article');card.className='ds-icon-card';card.dataset.icon=icon.id;
    const variants=icon.variants.map(variant=>`<div class="ds-icon-variant"><div class="ds-icon-preview" data-surface="${variant.theme}" role="img" aria-label="${icon.name}, ${variant.id}">${variant.html}</div><span>${variant.id} · ${icon.size} px</span>${variant.asset?`<a class="ds-icon-asset" href="${variant.asset}" target="_blank" rel="noopener noreferrer">${variant.asset.split('/').pop().split('?')[0]}</a>`:'<span class="ds-icon-asset">Shared header glyph</span>'}<code>renderIcon('${icon.id}', {variant: '${variant.id}'})</code></div>`).join('');
    card.innerHTML=`<h4>${icon.name}</h4><p>${icon.url?`<a href="${icon.url}" target="_blank" rel="noopener noreferrer">${icon.source}</a>`:icon.source} · ${icon.usage}</p><div class="ds-icon-variants">${variants}</div>`;
    document.querySelector(`#${icon.group}-icons`).append(card);
  }
  for(const element of document.querySelectorAll('[data-token]'))element.textContent=tokens[element.dataset.token];
  const colors=[['color-canvas','Canvas'],['color-ink','Ink'],['color-surface','Work surface'],['color-placeholder','Photo slot'],['color-inverse','Footer']];
  document.querySelector('#palette-grid').innerHTML=colors.map(([key,label])=>`<article class="ds-color"><div class="ds-color-swatch" style="background:var(--${key})"></div><div class="ds-color-info"><strong>${label}</strong><span>${tokens[key]}</span><span>--${key}</span></div></article>`).join('');
  const stateColors=[['border-subtle','Light border','border'],['border-strong','Light hover / field border','border'],['border-inverse','Dark border','border','dark'],['border-inverse-hover','Dark hover border','border','dark'],['color-muted','Secondary text'],['color-disabled','Disabled text'],['color-hover','Light hover surface'],['color-pressed','Light pressed surface'],['color-inverse-hover','Dark hover surface','fill','dark'],['color-inverse-pressed','Dark pressed surface','fill','dark']];
  document.querySelector('#state-palette').innerHTML=stateColors.map(([key,label,kind='fill',surface='light'])=>{
    const base=surface==='dark'?'var(--color-inverse)':'var(--color-canvas)';
    const style=kind==='border'?`background:${base};border-color:var(--${key})`:`background:linear-gradient(var(--${key}),var(--${key})),${base}`;
    return `<div class="ds-small-color"><div class="ds-small-swatch" style="${style}"></div><div><strong>${label}</strong><span>${tokens[key]}</span><span>--${key}</span></div></div>`;
  }).join('');
  document.querySelector('#spacing-scale').innerHTML=[2,3,4,5,6,7,8,10].map(n=>`<div class="ds-space-item"><div class="ds-space-bar" style="width:var(--space-${n})"></div><span>${tokens['space-'+n]}</span></div>`).join('');
  const revision=document.documentElement.dataset.build||'';
  function resize(item){
    const mobile=mode==='mobile';
    const width=mobile?440:item.example.width;
    const open=mobile&&item.state==='open';
    const height=open?800:(item.state==='manual-copy'||item.manualVisible?(mobile?340:300):(mobile?item.example.mobileHeight:item.example.height));
    const available=item.stage.clientWidth;
    const scale=Math.min(1,available/width);
    item.frame.style.width=width+'px';item.frame.style.height=height+'px';
    item.frame.style.transform=`translateX(${-width*scale/2}px) scale(${scale})`;
    item.stage.style.height=Math.ceil(height*scale)+'px';
    item.size.textContent=`${width} × ${height}`;
  }
  function load(item){
    item.frame.title=`${item.example.title}, ${mode}, ${labels[item.state]||item.state}`;
    item.ready=false;item.manualVisible=false;item.instance=String(++navigationId);
    item.frame.src=`/ds/preview.html?component=${encodeURIComponent(item.example.id)}&mode=${mode}&state=${encodeURIComponent(item.state)}&instance=${item.instance}&v=${revision}`;
    resize(item);
  }
  function sendState(item){
    if(!item.ready)return;
    item.frame.contentWindow.postMessage({type:'portfolio:ds-state',component:item.example.id,mode,instance:item.instance,state:item.state},location.origin);
  }
  function updateState(item){
    if(!item.example.inPlaceStates){load(item);return;}
    item.frame.title=`${item.example.title}, ${mode}, ${labels[item.state]||item.state}`;
    item.manualVisible=false;
    resize(item);sendState(item);
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||!event.data||typeof event.data!=='object')return;
    const data=event.data;
    const item=items.find(item=>item.example.inPlaceStates&&item.frame.contentWindow===event.source&&item.example.id===data.component&&item.instance===data.instance);
    if(!item||data.mode!==mode)return;
    if(data.type==='portfolio:ds-ready'){item.ready=true;sendState(item);}
    else if(data.type==='portfolio:ds-layout'&&data.state===item.state&&typeof data.manualVisible==='boolean'){
      item.manualVisible=data.manualVisible;resize(item);
    }
  });
  function states(item){
    const available=mode==='mobile'&&item.example.mobileStates?item.example.mobileStates:item.example.states;
    if(!available.includes(item.state))item.state=available[0];
    item.switch.replaceChildren();
    item.switch.hidden=!!item.example.liveOnly;
    if(item.example.liveOnly)return;
    for(const state of available){
      const button=document.createElement('button');button.type='button';button.textContent=labels[state]||state;button.dataset.state=state;
      button.setAttribute('aria-pressed',String(item.state===state));
      button.addEventListener('click',()=>{item.state=state;for(const other of item.switch.children)other.setAttribute('aria-pressed',String(other===button));updateState(item);});
      item.switch.append(button);
    }
  }
  for(const example of examples){
    const card=document.createElement('article');card.className='ds-specimen';card.dataset.component=example.id;card.dataset.previewSurface=example.kind.split(' ').includes('dark')?'dark':'light';
    card.innerHTML=`<div class="ds-specimen-head"><h3>${example.title}</h3><span class="ds-source">${example.source}</span></div><div class="ds-state-switch" role="group" aria-label="${example.title} states"></div><div class="ds-preview-stage"><iframe class="ds-preview-frame" loading="lazy" allow="clipboard-write"></iframe></div><div class="ds-preview-meta"><p>${example.note||'Shared source · working interaction'}</p><span></span></div>`;
    document.querySelector(example.group==='template'?'#template-gallery':'#component-gallery').append(card);
    const item={example,state:example.states[0],switch:card.querySelector('.ds-state-switch'),stage:card.querySelector('.ds-preview-stage'),frame:card.querySelector('iframe'),size:card.querySelector('.ds-preview-meta>span')};
    items.push(item);states(item);load(item);
  }
  for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
    if(mode===button.dataset.mode)return;
    mode=button.dataset.mode;
    for(const other of document.querySelectorAll('[data-mode]'))other.setAttribute('aria-pressed',String(other===button));
    for(const item of items){states(item);load(item);}
  });
  const observer=new ResizeObserver(()=>items.forEach(resize));
  items.forEach(item=>observer.observe(item.stage));
})();
