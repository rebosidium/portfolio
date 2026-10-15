(() => {
  const {examples,tokens}=window.DS_CATALOG;
  const labels={'default':'Default','hover':'Hover','focus':'Keyboard focus','pressed':'Pressed','copied':'Copied','manual-copy':'Manual copy','disabled':'Disabled','reduced-motion':'Reduced motion','initial':'Initial frame','front':'Front','empty':'Empty','closed':'Closed','open':'Open','gray':'Gray surface','white':'White surface','homepage':'Homepage','about':'About'};
  let mode='desktop';
  const items=[];
  document.querySelector('#specimen-count').textContent=`${examples.length} live specimens`;
  for(const element of document.querySelectorAll('[data-token]'))element.textContent=tokens[element.dataset.token];
  const colors=[['color-canvas','Canvas'],['color-ink','Ink'],['color-surface','Work surface'],['color-placeholder','Photo slot'],['color-inverse','Footer']];
  document.querySelector('#palette-grid').innerHTML=colors.map(([key,label])=>`<article class="ds-color"><div class="ds-color-swatch" style="background:var(--${key})"></div><div class="ds-color-info"><strong>${label}</strong><span>${tokens[key]}</span><span>--${key}</span></div></article>`).join('');
  document.querySelector('#state-palette').innerHTML=[['border-subtle','Light border'],['border-inverse','Dark border'],['color-muted','Secondary text'],['color-disabled','Disabled text'],['color-hover','Hover surface'],['color-pressed','Pressed surface']].map(([key,label])=>`<div class="ds-small-color"><div class="ds-small-swatch" style="background:var(--${key});${key==='border-inverse'?'background-color:#1d1d1f;border-color:var(--border-inverse)':''}"></div><div><strong>${label}</strong><span>${tokens[key]}</span></div></div>`).join('');
  document.querySelector('#spacing-scale').innerHTML=[2,3,4,5,6,7,8,10].map(n=>`<div class="ds-space-item"><div class="ds-space-bar" style="width:var(--space-${n})"></div><span>${tokens['space-'+n]}</span></div>`).join('');
  const revision=document.documentElement.dataset.build||'';
  function resize(item){
    const mobile=mode==='mobile';
    const width=mobile?440:item.example.width;
    const open=mobile&&item.state==='open';
    const height=open?800:(item.state==='manual-copy'?(mobile?340:300):(mobile?item.example.mobileHeight:item.example.height));
    const available=item.stage.clientWidth;
    const scale=Math.min(1,available/width);
    item.frame.style.width=width+'px';item.frame.style.height=height+'px';
    item.frame.style.transform=`translateX(${-width*scale/2}px) scale(${scale})`;
    item.stage.style.height=Math.ceil(height*scale)+'px';
    item.size.textContent=`${width} × ${height}`;
  }
  function load(item){
    item.frame.title=`${item.example.title}, ${mode}, ${labels[item.state]||item.state}`;
    item.frame.src=`/ds/preview.html?component=${encodeURIComponent(item.example.id)}&mode=${mode}&state=${encodeURIComponent(item.state)}&v=${revision}`;
    resize(item);
  }
  function states(item){
    const available=mode==='mobile'&&item.example.mobileStates?item.example.mobileStates:item.example.states;
    if(!available.includes(item.state))item.state=available[0];
    item.switch.replaceChildren();
    for(const state of available){
      const button=document.createElement('button');button.type='button';button.textContent=labels[state]||state;button.dataset.state=state;
      button.setAttribute('aria-pressed',String(item.state===state));
      button.addEventListener('click',()=>{item.state=state;for(const other of item.switch.children)other.setAttribute('aria-pressed',String(other===button));load(item);});
      item.switch.append(button);
    }
  }
  for(const example of examples){
    const card=document.createElement('article');card.className='ds-specimen';card.dataset.component=example.id;
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
