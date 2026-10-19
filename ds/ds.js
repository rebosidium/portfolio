(async () => {
  if(window.DSFreshness && !await window.DSFreshness.ready)return;
  const {examples,icons,favicons,tokens,lineHeightScale,manifest,naming}=window.DS_CATALOG;
  const pageNames=routes=>routes.map(route=>manifest.pages.find(page=>page.route===route)?.label||route).join(' · ');
  const versionLabel=release=>release.version;
  document.querySelector('#source-page-count').textContent=manifest.pages.length+' source pages';
  document.querySelector('#source-pages').replaceChildren(...manifest.pages.flatMap((page,index)=>{const text=document.createTextNode(page.label);return index?[document.createElement('br'),text]:[text];}));
  document.querySelector('#library-contract').textContent='API contract '+manifest.contractVersion;
  document.querySelector('#ds-release-detail').textContent='Design system · '+manifest.designSystem.release+' · Semantic release + automatic source revision';
  document.querySelector('#token-version').textContent='Shared tokens · '+manifest.tokens.version;
  const specimens=examples.filter(example=>!example.galleryParent);
  const variantsFor=example=>(example.galleryVariants||[{id:example.id,exampleId:example.id}]).map(variant=>({...variant,example:examples.find(current=>current.id===variant.exampleId)}));
  for(const example of specimens){
    const variants=variantsFor(example),row=document.createElement('tr');
    const name=document.createElement('td'),link=document.createElement('a');
    link.href='#component-'+example.id;link.textContent=example.title;name.append(link);
    const versions=document.createElement('td');
    for(const variant of variants){const line=document.createElement('div');line.textContent=(variant.label?variant.label+' · ':'')+versionLabel(variant.example.release);versions.append(line);}
    const pages=document.createElement('td');pages.textContent=pageNames([...new Set(variants.flatMap(variant=>variant.example.release.usedBy))]);
    row.append(name,versions,pages);document.querySelector('#component-versions').append(row);
  }
  const labels=naming.states;
  const tokenName=key=>naming.tokens[key];
  const iconVariant=id=>naming.variants[id]||id;
  let mode=innerWidth<=767?'mobile':'desktop';
  try{const saved=sessionStorage.getItem('portfolio.ds.preview-layout');if(['desktop','mobile'].includes(saved))mode=saved;}catch(_){}
  for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
  let navigationId=0;
  const items=[];
  document.querySelector('#specimen-count').textContent=`${specimens.filter(example=>example.group!=='asset').length} live specimens`;
  document.querySelector('#icon-count').textContent=`${icons.length} current icons · ${icons.reduce((count,icon)=>count+icon.variants.length,0)} used variants`;
  for(const icon of icons){
    const card=document.createElement('article');card.className='ds-icon-card';card.dataset.icon=icon.id;
    const variants=icon.variants.map(variant=>`<div class="ds-icon-variant"><div class="ds-icon-preview" data-surface="${variant.theme}" role="img" aria-label="${icon.name}, ${iconVariant(variant.id)}">${variant.html}</div><span>${iconVariant(variant.id)} · ${icon.size} px</span>${variant.asset?`<a class="ds-icon-asset" href="${variant.asset}" target="_blank" rel="noopener noreferrer">${variant.asset.split('/').pop().split('?')[0]}</a>`:'<span class="ds-icon-asset">Shared header glyph</span>'}<code>renderIcon('${icon.id}', {variant: '${variant.id}'})</code></div>`).join('');
    const markup=`<h4>${icon.name}</h4><p>${icon.url?`<a href="${icon.url}" target="_blank" rel="noopener noreferrer">${icon.source}</a>`:icon.source} · ${icon.usage}</p><div class="ds-icon-variants">${variants}</div>`;
    if(window.DSAssets)card.append(window.DSAssets.stage(markup));else card.innerHTML=markup;
    document.querySelector(`#${icon.group}-icons`).append(card);
    window.DSAssets?.prepare(card);
    for(const [index,variant] of icon.variants.entries()){const info=document.createElement('p');info.className='ds-component-version';info.textContent=versionLabel(variant.release);card.querySelectorAll('.ds-icon-variant')[index].append(info);}
    for(const [index,variant] of icon.variants.entries())window.DSCode?.attach({
      triggerParent:card.querySelectorAll('.ds-icon-variant')[index],panelParent:card,
      kind:'icon',id:icon.id,variant:variant.id,label:icon.name+' · '+iconVariant(variant.id)
    });
  }
  const companyLogos=examples.find(example=>example.id==='work-logo');
  for(const logo of companyLogos.logos){
    const state=logo.id==='larixon'?'default':logo.id;
    const html=companyLogos.htmlByState?.[state]||companyLogos.html;
    const template=document.createElement('template');template.innerHTML=html;
    const image=template.content.querySelector('img');
    const size=image.getAttribute('width')+' × '+image.getAttribute('height')+' px';
    const asset=image.getAttribute('src'),filename=asset.split('/').pop().split('?')[0];
    const card=document.createElement('article');card.className='ds-icon-card';card.dataset.companyLogo=logo.id;
    const markup=`<h4>${logo.name}</h4><p>Homepage · Works<br>Original SVG · ${size}</p><div class="ds-icon-variants">${['light','dark'].map(theme=>`<div class="ds-icon-variant"><div class="ds-icon-preview" data-surface="${theme}">${html}</div><span>${theme==='light'?'Light':'Dark'} background</span></div>`).join('')}</div><a class="ds-icon-asset" href="${asset}" target="_blank" rel="noopener noreferrer">${filename}</a><p class="ds-component-version">${versionLabel(companyLogos.release)}</p>`;
    if(window.DSAssets)card.append(window.DSAssets.stage(markup));else card.innerHTML=markup;
    document.querySelector('#company-logo-gallery').append(card);
    window.DSAssets?.prepare(card);
    window.DSCode?.attach({triggerParent:card,panelParent:card,id:companyLogos.id,label:logo.name,getContext:()=>({mode,state,exampleId:companyLogos.id})});
  }
  for(const asset of favicons.files){
    const card=document.createElement('article');card.className='ds-icon-card ds-favicon-card';
    const previewSize=Math.min(asset.size,64);
    card.innerHTML=`<h3>${asset.name}</h3><p>${asset.format} · ${asset.format==='ICO'?'16 / 32 / 48 px':asset.size+' × '+asset.size+' px'}<br>${asset.usage}</p><div class="ds-icon-variants">${['light','dark'].map(theme=>`<div class="ds-icon-variant"><div class="ds-icon-preview" data-surface="${theme}"><img src="${asset.url}" width="${previewSize}" height="${previewSize}" alt="${asset.name}, ${theme} background" loading="lazy" decoding="async"></div><span>${theme==='light'?'Light':'Dark'} background · ${previewSize} px preview</span></div>`).join('')}</div><a class="ds-favicon-download" href="${asset.url}" download="${asset.file}">Download ${asset.file}</a>`;
    document.querySelector('#favicon-grid').append(card);
  }
  const manifestLink=document.querySelector('#favicon-manifest');manifestLink.href=favicons.manifest;
  const faviconSection=document.querySelector('#favicon');
  window.DSCode?.attach({triggerParent:faviconSection.querySelector('.ds-section-heading'),panelParent:faviconSection,kind:'asset',id:'favicon',label:'Favicon'});
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
  for(const name of ['size-icon','size-menu-glyph','offset-menu-glyph','inset-menu-top','gap-menu-items','size-status','size-avatar','size-avatar-mobile','width-back-mobile','width-brief','height-brief-field','gap-brief-manual','height-control','height-control-spacious','size-target','focus-width','focus-offset-control','focus-offset-link','focus-offset-field','focus-offset-tool','radius-focus-link','duration-control','duration-underline','duration-reading-reveal','delay-reading-step','offset-reading-reveal','ease-reading-reveal','overlap-recede','overlap-flatten-start','ease-out']){
    const item=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');term.textContent=tokenName(name);value.textContent=tokens[name]+' · --'+name;item.append(term,value);document.querySelector('#layout-tokens').append(item);
  }
  // Every sample uses the exact opaque token and states its intended surface.
  const paletteGroups=[
    {title:'Backgrounds',items:[
      ['color-canvas'],['color-surface'],['color-inverse'],['color-work-placeholder'],
      ['color-hover'],['color-pressed'],['color-inverse-hover'],['color-inverse-pressed']
    ]},
    {title:'Text',kind:'text',items:[
      ['color-ink'],['color-muted','color-canvas',`On ${tokens['color-canvas']} and ${tokens['color-surface']}`],
      ['color-muted-on-placeholder','color-work-placeholder'],['color-inverse-muted','color-inverse'],
      ['color-disabled'],['color-disabled-on-surface','color-surface']
    ]},
    {title:'Borders',kind:'border',items:[
      ['border-subtle'],['border-subtle-on-surface','color-surface',`On ${tokens['color-surface']}; DS tool hover on ${tokens['color-hover']}`],
      ['border-subtle-on-inverse','color-inverse'],
      ['border-inverse','color-inverse']
    ]},
    {title:'Control borders',kind:'border',items:[
      ['border-control-hover','color-hover'],['border-control-pressed','color-pressed'],
      ['border-control-hover-pressed','color-pressed'],
      ['border-inverse-control-hover','color-inverse-hover',`Hover on ${tokens['color-inverse-hover']}; hover + pressed on ${tokens['color-inverse-pressed']}`],
      ['border-inverse-control-pressed','color-inverse-pressed']
    ]}
  ];
  document.querySelector('#palette-grid').innerHTML=paletteGroups.map(({title,kind='fill',items})=>{
    const cards=items.map(([key,surface='color-canvas',usage])=>{
      const background=kind==='fill'?key:surface;
      const sample=kind==='text'?'Aa':kind==='border'?'<span></span>':'';
      const context=usage||(kind==='fill'?'Solid fill':`On ${tokens[surface]}`);
      return `<article class="ds-color" id="token-${key}" data-color-token="${key}"><div class="ds-color-swatch" data-kind="${kind}" style="background:var(--${background});--ds-sample-color:var(--${key})" aria-hidden="true">${sample}</div><div class="ds-color-info"><strong>${tokenName(key)}</strong><span class="ds-color-value">${tokens[key]}</span><code>--${key}</code><span class="ds-color-context">${context}</span></div></article>`;
    }).join('');
    return `<div class="ds-palette-group"><h3>${title}</h3><div class="ds-palette">${cards}</div></div>`;
  }).join('');
  // Complete token definitions, including semantic roles outside curated samples.
  const tokenReference=document.querySelector('#token-reference');
  document.querySelector('#token-count').textContent=Object.keys(tokens).length;
  for(const [key,value] of Object.entries(tokens)){
    const row=document.createElement('tr');
    if(!document.getElementById('token-'+key))row.id='token-'+key;
    const name=document.createElement('th');name.scope='row';name.textContent=tokenName(key);
    const token=document.createElement('td'),link=document.createElement('a');link.href='#token-'+key;link.textContent='--'+key;token.append(link);
    const definition=document.createElement('td');definition.textContent=value;
    row.append(name,token,definition);tokenReference.append(row);
  }
  function revealDisclosureTarget(){
    const target=document.getElementById(location.hash.slice(1));
    const disclosure=target?.closest('details');
    if(disclosure){disclosure.open=true;requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}
  }
  window.addEventListener('hashchange',revealDisclosureTarget);
  revealDisclosureTarget();
  document.querySelector('#spacing-scale').innerHTML=[2,3,4,5,6,7,8,10].map(n=>`<div class="ds-space-item"><div class="ds-space-bar" style="width:var(--space-${n})"></div><span>${tokenName('space-'+n)}</span><code>--space-${n}</code><span>${tokens['space-'+n]}</span></div>`).join('');
  const revision=document.documentElement.dataset.build||'';
  const visit=window.DSFreshness?.visit||String(Date.now());
  function resize(item){
    const mobile=mode==='mobile';
    const width=mobile?440:item.example.width;
    const open=mobile&&item.state==='open';
    const height=open?800:(item.state==='manual-copy'||item.manualVisible?(item.example.manualHeight||212):(mobile?item.example.mobileHeight:item.example.height));
    const available=item.stage.clientWidth;
    const scale=item.actualSize?1:Math.min(1,available/width);
    item.stage.dataset.zoom=item.actualSize?'actual':'fit';
    item.frame.style.width=width+'px';item.frame.style.height=height+'px';
    item.frame.style.left=item.actualSize?'0':'50%';
    item.frame.style.transform=item.actualSize?'none':`translateX(${-width*scale/2}px) scale(${scale})`;
    item.stage.style.height=Math.ceil(height*scale)+'px';
    item.size.textContent=`${width} × ${height} · ${Math.round(scale*100)}%`;
  }
  function load(item){
    item.frame.title=`${item.base.title}${item.variant.label?' · '+item.variant.label:''}, ${mode}, ${labels[item.state]||item.state}`;
    item.ready=false;item.manualVisible=false;item.instance=String(++navigationId);
    item.frame.src=`/ds/preview.html?component=${encodeURIComponent(item.example.id)}&theme=${document.documentElement.dataset.themePreference||'system'}&mode=${mode}&state=${encodeURIComponent(item.state)}&instance=${item.instance}&v=${revision}&_visit=${encodeURIComponent(visit)}`;
    item.code?.refresh();
    resize(item);
  }
  function sendState(item){
    if(!item.ready)return;
    item.frame.contentWindow.postMessage({type:'portfolio:ds-state',component:item.example.id,mode,instance:item.instance,state:item.state},location.origin);
  }
  function updateState(item){
    if(!item.example.inPlaceStates){load(item);return;}
    item.frame.title=`${item.base.title}${item.variant.label?' · '+item.variant.label:''}, ${mode}, ${labels[item.state]||item.state}`;
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
    if(item.base.galleryVariants){const label=document.createElement('span');label.className='ds-switch-label';label.textContent='State';item.switch.append(label);}
    for(const state of available){
      const button=document.createElement('button');button.type='button';button.textContent=labels[state]||state;button.dataset.state=state;
      button.setAttribute('aria-pressed',String(item.state===state));
      button.addEventListener('click',()=>{item.state=state;for(const other of item.switch.querySelectorAll('button'))other.setAttribute('aria-pressed',String(other===button));updateState(item);});
      item.switch.append(button);
    }
  }
  function selectVariant(item,id){
    const variant=item.variants.find(variant=>variant.id===id);
    if(!variant||variant===item.variant)return;
    item.variant=variant;item.example=variant.example;
    item.card.dataset.activeVariant=variant.id;
    for(const button of item.variantSwitch.children)if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.variant===id));
    item.card.querySelector('.ds-api-key').textContent=item.example.release.componentKey+(item.example.release.variant?' · '+item.example.release.variant:'');
    item.card.querySelector('.ds-component-version').textContent=versionLabel(item.example.release);
    item.card.querySelector('.ds-source').textContent=item.example.source;
    item.card.querySelector('.ds-preview-meta>p').textContent=item.example.note||'Shared source · working interaction';
    states(item);load(item);
  }
  for(const example of specimens.filter(example=>example.group!=='asset')){
    const variants=variantsFor(example),variant=variants[0],grouped=variants.length>1;
    const card=document.createElement('article');card.className='ds-specimen';card.id='component-'+example.id;card.dataset.component=example.id;card.dataset.previewSurface=example.kind.split(' ').includes('dark')?'dark':'light';
    if(grouped)card.dataset.activeVariant=variant.id;
    card.innerHTML=`<div class="ds-specimen-head"><div class="ds-component-heading"><h3>${example.title}</h3><code class="ds-api-key">${example.release.componentKey}${example.release.variant?' · '+example.release.variant:''}</code><p class="ds-component-version">${versionLabel(example.release)}</p></div><div class="ds-head-actions"><span class="ds-source">${example.source}</span></div></div>${grouped?`<div class="ds-variant-switch ds-state-switch" role="group" aria-label="${example.title} variants"><span class="ds-switch-label">Variant</span></div>`:''}<div class="ds-state-switch" role="group" aria-label="${example.title} states"></div><div class="ds-preview-stage"><iframe class="ds-preview-frame" loading="lazy" allow="clipboard-write"></iframe></div><div class="ds-preview-meta"><p>${example.note||'Shared source · working interaction'}</p><span></span></div>`;
    document.querySelector(example.group==='template'?'#template-gallery':'#component-gallery').append(card);
    const item={base:example,example:variant.example,variants,variant,card,state:example.states[0],switch:card.querySelector('.ds-state-switch:not(.ds-variant-switch)'),variantSwitch:card.querySelector('.ds-variant-switch'),stage:card.querySelector('.ds-preview-stage'),frame:card.querySelector('iframe'),size:card.querySelector('.ds-preview-meta>span')};
    if(grouped)for(const variant of variants){
      const button=document.createElement('button');button.type='button';button.textContent=variant.label;button.dataset.variant=variant.id;button.setAttribute('aria-pressed',String(variant===item.variant));
      button.addEventListener('click',()=>selectVariant(item,variant.id));item.variantSwitch.append(button);
    }
    item.code=window.DSCode?.attach({triggerParent:card.querySelector('.ds-head-actions'),panelParent:card,id:example.id,label:example.title,getContext:()=>({mode,state:item.state,exampleId:item.example.id,variantLabel:item.variant.label})});
    const zoom=document.createElement('button');zoom.type='button';zoom.className='ds-code-toggle ds-zoom-toggle';zoom.textContent='100%';zoom.setAttribute('aria-label','Actual size: '+example.title);zoom.setAttribute('aria-pressed','false');
    zoom.addEventListener('click',()=>{item.actualSize=!item.actualSize;zoom.setAttribute('aria-pressed',String(item.actualSize));zoom.textContent=item.actualSize?'Fit':'100%';resize(item);if(item.actualSize)item.stage.scrollLeft=Math.max(0,(parseFloat(item.frame.style.width)-item.stage.clientWidth)/2);});
    card.querySelector('.ds-head-actions').append(zoom);
    items.push(item);states(item);load(item);
  }
  // Keep both existing header anchors useful after grouping their gallery cards.
  function selectLinkedVariant(){
    const id=location.hash.slice(1).replace(/^component-/,'');
    const item=items.find(item=>item.base.galleryVariants?.some(variant=>variant.exampleId===id));
    if(!item)return;
    selectVariant(item,item.variants.find(variant=>variant.exampleId===id).id);
    item.card.scrollIntoView({block:'start'});
  }
  window.addEventListener('hashchange',selectLinkedVariant);
  selectLinkedVariant();
  for(const link of document.querySelectorAll('[data-code-recipe]'))link.addEventListener('click',async()=>{
    const item=items.find(item=>item.example.id===link.dataset.codeRecipe);
    if(!item?.code)return;
    await item.code.openUsage();
    const panel=item.card.querySelector('.ds-code-panel');
    panel.scrollIntoView({block:'start'});
    panel.querySelector('[data-format="usage"]')?.focus({preventScroll:true});
  });

  // One location marker for anchor navigation, scrolling and expanding content.
  const sectionLinks=[...document.querySelectorAll('.ds-sidebar nav a')];
  const sections=sectionLinks.map(link=>document.querySelector(link.getAttribute('href')));
  const sectionNavigation=document.querySelector('#library-sections');
  const contentsLink=document.querySelector('.ds-contents-link');
  let sectionFrame=0;
  function updateSection(){
    sectionFrame=0;
    const marker=Math.max(Math.min(innerHeight*.2,140),parseFloat(getComputedStyle(sections[1]).scrollMarginTop)||0)+1;
    let current=0;
    sections.forEach((section,index)=>{if(section.getBoundingClientRect().top<=marker)current=index;});
    if(scrollY+innerHeight>=document.documentElement.scrollHeight-2)current=sections.length-1;
    sectionLinks.forEach((link,index)=>{
      if(index===current)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    contentsLink.hidden=innerWidth>767||sectionNavigation.getBoundingClientRect().bottom>=0;
  }
  function scheduleSection(){if(!sectionFrame)sectionFrame=requestAnimationFrame(updateSection);}
  window.addEventListener('scroll',scheduleSection,{passive:true});
  window.addEventListener('resize',scheduleSection,{passive:true});
  window.addEventListener('hashchange',scheduleSection);
  window.addEventListener('pageshow',scheduleSection);
  new ResizeObserver(scheduleSection).observe(document.querySelector('.ds-main'));
  updateSection();

  const table=document.querySelector('.ds-platform-table-wrap');
  const tableSurface=table.parentElement;
  const scrollHint=document.querySelector('#technical-scroll-hint');
  function updateTableScroll(){
    const overflow=table.scrollWidth-table.clientWidth>1;
    scrollHint.hidden=!overflow;
    if(overflow)table.setAttribute('aria-describedby',scrollHint.id);
    else table.removeAttribute('aria-describedby');
    tableSurface.classList.toggle('has-more-left',overflow&&table.scrollLeft>1);
    tableSurface.classList.toggle('has-more-right',overflow&&table.scrollLeft+table.clientWidth<table.scrollWidth-1);
  }
  table.addEventListener('scroll',updateTableScroll,{passive:true});
  new ResizeObserver(updateTableScroll).observe(table);
  document.fonts.ready.then(updateTableScroll);
  updateTableScroll();
  for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
    if(mode===button.dataset.mode)return;
    mode=button.dataset.mode;
    try{sessionStorage.setItem('portfolio.ds.preview-layout',mode);}catch(_){}
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
