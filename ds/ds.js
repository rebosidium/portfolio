(async () => {
  if(window.DSFreshness && !await window.DSFreshness.ready)return;
  const {examples,icons,tokens,lineHeightScale,manifest,naming}=window.DS_CATALOG;
  const pageNames=routes=>routes.map(route=>route==='/'?'Homepage':'About').join(' · ');
  const versionLabel=release=>release.version;
  document.querySelector('#library-contract').textContent='API contract '+manifest.contractVersion;
  document.querySelector('#ds-release-detail').textContent='Design system · '+manifest.designSystem.release+' · Semantic release + automatic source revision';
  document.querySelector('#token-version').textContent='Shared tokens · '+manifest.tokens.version;
  for(const example of examples){
    const row=document.createElement('tr');
    for(const [index,value] of [example.title,versionLabel(example.release),pageNames(example.release.usedBy)].entries()){const cell=document.createElement('td');if(index===0){const link=document.createElement('a');link.href='#component-'+example.id;link.textContent=value;cell.append(link);}else cell.textContent=value;row.append(cell);}
    document.querySelector('#component-versions').append(row);
  }
  const labels=naming.states;
  const tokenName=key=>naming.tokens[key];
  const iconVariant=id=>naming.variants[id]||id;
  let mode='desktop';
  let navigationId=0;
  const items=[];
  document.querySelector('#specimen-count').textContent=`${examples.length} live specimens`;
  document.querySelector('#icon-count').textContent=`${icons.length} current icons · ${icons.reduce((count,icon)=>count+icon.variants.length,0)} used variants`;
  for(const icon of icons){
    const card=document.createElement('article');card.className='ds-icon-card';card.dataset.icon=icon.id;
    const variants=icon.variants.map(variant=>`<div class="ds-icon-variant"><div class="ds-icon-preview" data-surface="${variant.theme}" role="img" aria-label="${icon.name}, ${iconVariant(variant.id)}">${variant.html}</div><span>${iconVariant(variant.id)} · ${icon.size} px</span>${variant.asset?`<a class="ds-icon-asset" href="${variant.asset}" target="_blank" rel="noopener noreferrer">${variant.asset.split('/').pop().split('?')[0]}</a>`:'<span class="ds-icon-asset">Shared header glyph</span>'}<code>renderIcon('${icon.id}', {variant: '${variant.id}'})</code></div>`).join('');
    card.innerHTML=`<h4>${icon.name}</h4><p>${icon.url?`<a href="${icon.url}" target="_blank" rel="noopener noreferrer">${icon.source}</a>`:icon.source} · ${icon.usage}</p><div class="ds-icon-variants">${variants}</div>`;
    document.querySelector(`#${icon.group}-icons`).append(card);
    for(const [index,variant] of icon.variants.entries()){const info=document.createElement('p');info.className='ds-component-version';info.textContent=versionLabel(variant.release);card.querySelectorAll('.ds-icon-variant')[index].append(info);}
    for(const [index,variant] of icon.variants.entries())window.DSCode?.attach({
      triggerParent:card.querySelectorAll('.ds-icon-variant')[index],panelParent:card,
      kind:'icon',id:icon.id,variant:variant.id,label:icon.name+' · '+iconVariant(variant.id)
    });
  }
  for(const [id,label] of [['palette','Palette'],['typography','Typography'],['layout','Layout & spacing']]){
    const section=document.querySelector('#'+id);
    window.DSCode?.attach({triggerParent:section.querySelector('.ds-section-heading'),panelParent:section,kind:'foundation',id,label});
  }
  for(const row of document.querySelectorAll('[data-type-style]')){
    const style=naming.typography[row.dataset.typeStyle],description=row.firstElementChild;
    description.querySelector('strong').textContent=style.name;
    const key=document.createElement('code');key.className='ds-style-key';key.textContent=style.selector;
    const usage=document.createElement('p');usage.className='ds-style-usage';usage.textContent=style.usage;
    description.append(key,usage);
  }
  for(const element of document.querySelectorAll('[data-token-name]'))element.textContent=tokenName(element.dataset.tokenName);
  for(const element of document.querySelectorAll('[data-token]'))element.textContent=tokens[element.dataset.token];
  for(const step of lineHeightScale){
    const item=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');
    term.textContent='×'+step.value;value.textContent=step.name;item.append(term,value);document.querySelector('#line-height-scale').append(item);
  }
  for(const example of document.querySelectorAll('.ds-type-example')){
    const metric=document.createElement('span');metric.className='ds-type-line';
    example.querySelector(':scope > span').append(document.createElement('br'),metric);
  }
  const updateTypeMetrics=()=>{
    for(const example of document.querySelectorAll('.ds-type-example')){
      const sample=getComputedStyle(example.querySelector('p'));
      const line=Number.parseFloat(sample.lineHeight);
      example.querySelector('.ds-type-line').textContent='Computed line · '+(Number.isFinite(line)?Number(line.toFixed(2))+'px':sample.lineHeight);
    }
  };
  updateTypeMetrics();
  document.fonts.ready.then(updateTypeMetrics);
  window.addEventListener('resize',updateTypeMetrics,{passive:true});
  for(const name of ['width-brief','height-brief-field','gap-brief-manual','height-control','height-control-spacious','size-target','focus-width','focus-offset-control','focus-offset-link','focus-offset-field','focus-offset-tool','radius-focus-link','duration-control','duration-underline','overlap-recede','overlap-flatten-start','ease-out']){
    const item=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');term.textContent=tokenName(name);value.textContent=tokens[name]+' · --'+name;item.append(term,value);document.querySelector('#layout-tokens').append(item);
  }
  const colors=['color-canvas','color-ink','color-surface','color-placeholder','color-inverse'];
  document.querySelector('#palette-grid').innerHTML=colors.map(key=>`<article class="ds-color"><div class="ds-color-swatch" style="background:var(--${key})"></div><div class="ds-color-info"><strong>${tokenName(key)}</strong><span>${tokens[key]}</span><span>--${key}</span></div></article>`).join('');
  const stateColors=[['border-subtle','border'],['border-strong','border'],['border-inverse','border','dark'],['border-inverse-hover','border','dark'],['color-muted'],['color-inverse-muted','fill','dark'],['color-disabled'],['color-hover'],['color-pressed'],['color-inverse-hover','fill','dark'],['color-inverse-pressed','fill','dark']];
  document.querySelector('#state-palette').innerHTML=stateColors.map(([key,kind='fill',surface='light'])=>{
    const base=surface==='dark'?'var(--color-inverse)':'var(--color-canvas)';
    const style=kind==='border'?`background:${base};border-color:var(--${key})`:`background:linear-gradient(var(--${key}),var(--${key})),${base}`;
    return `<div class="ds-small-color"><div class="ds-small-swatch" style="${style}"></div><div><strong>${tokenName(key)}</strong><span>${tokens[key]}</span><span>--${key}</span></div></div>`;
  }).join('');
  document.querySelector('#spacing-scale').innerHTML=[2,3,4,5,6,7,8,10].map(n=>`<div class="ds-space-item"><div class="ds-space-bar" style="width:var(--space-${n})"></div><span>${tokenName('space-'+n)}</span><code>--space-${n}</code><span>${tokens['space-'+n]}</span></div>`).join('');
  const revision=document.documentElement.dataset.build||'';
  const visit=window.DSFreshness?.visit||String(Date.now());
  function resize(item){
    const mobile=mode==='mobile';
    const width=mobile?440:item.example.width;
    const open=mobile&&item.state==='open';
    const height=open?800:(item.state==='manual-copy'||item.manualVisible?(item.example.manualHeight||212):(mobile?item.example.mobileHeight:item.example.height));
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
    item.frame.src=`/ds/preview.html?component=${encodeURIComponent(item.example.id)}&mode=${mode}&state=${encodeURIComponent(item.state)}&instance=${item.instance}&v=${revision}&_visit=${encodeURIComponent(visit)}`;
    item.code?.refresh();
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
    item.code?.refresh();
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
    const card=document.createElement('article');card.className='ds-specimen';card.id='component-'+example.id;card.dataset.component=example.id;card.dataset.previewSurface=example.kind.split(' ').includes('dark')?'dark':'light';
    card.innerHTML=`<div class="ds-specimen-head"><div class="ds-component-heading"><h3>${example.title}</h3><code class="ds-api-key">${example.release.componentKey}${example.release.variant?' · '+example.release.variant:''}</code><p class="ds-component-version">${versionLabel(example.release)}</p></div><div class="ds-head-actions"><span class="ds-source">${example.source}</span></div></div><div class="ds-state-switch" role="group" aria-label="${example.title} variants and states"></div><div class="ds-preview-stage"><iframe class="ds-preview-frame" loading="lazy" allow="clipboard-write"></iframe></div><div class="ds-preview-meta"><p>${example.note||'Shared source · working interaction'}</p><span></span></div>`;
    document.querySelector(example.group==='template'?'#template-gallery':'#component-gallery').append(card);
    const item={example,state:example.states[0],switch:card.querySelector('.ds-state-switch'),stage:card.querySelector('.ds-preview-stage'),frame:card.querySelector('iframe'),size:card.querySelector('.ds-preview-meta>span')};
    item.code=window.DSCode?.attach({triggerParent:card.querySelector('.ds-head-actions'),panelParent:card,id:example.id,label:example.title,getContext:()=>({mode,state:item.state})});
    items.push(item);states(item);load(item);
  }
  for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
    if(mode===button.dataset.mode)return;
    mode=button.dataset.mode;
    for(const other of document.querySelectorAll('[data-mode]'))other.setAttribute('aria-pressed',String(other===button));
    for(const item of items){states(item);load(item);}
  });
  // Apply observed-size writes on the next frame, outside the observer delivery.
  let layoutFrame=0;
  const observer=new ResizeObserver(()=>{
    if(layoutFrame)return;
    layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;items.forEach(resize);});
  });
  items.forEach(item=>observer.observe(item.stage));
})();
