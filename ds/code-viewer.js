(() => {
  'use strict';
  let catalogRequest,serial=0;
  const node=(tag,className,text)=>{
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  };
  async function catalog(){
    if(!catalogRequest){
      const url=new URL(window.DS_CATALOG.code.url,location.origin);url.searchParams.set('_dscheck',window.DSFreshness?.visit||String(Date.now()));
      catalogRequest=fetch(url.href,{cache:'no-store',credentials:'omit'}).then(response=>{
      if(!response.ok)throw Error('Source catalog could not be loaded.');
      return response.json();
    }).then(value=>{
      if(value.schemaVersion!==1)throw Error('Source catalog version is unavailable.');
      return value;
    }).catch(error=>{catalogRequest=null;throw error;});
    }
    return catalogRequest;
  }
  const foundationSources={
    palette:[['shared/tokens.css','Color and state tokens']],
    typography:[['shared/tokens.css','Type tokens'],['shared/site-ui.css','Shared type roles'],['home/about/about.css','Reading type roles'],['home/styles.css','Homepage type roles']],
    layout:[['shared/tokens.css','Spacing, width and radius tokens'],['shared/site-ui.css','Shared responsive layout'],['home/about/about.css','Reading layout'],['home/styles.css','Homepage layout']]
  };
  function attach({triggerParent,panelParent,kind='example',id,variant,label,getContext=()=>({mode:'desktop',state:'default'})}){
    const button=node('button','ds-code-toggle','View code');button.type='button';
    const panel=node('section','ds-code-panel');panel.hidden=true;panel.id=`ds-code-${++serial}`;
    panel.setAttribute('role','region');panel.setAttribute('aria-label',`${label} code`);
    button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',panel.id);
    button.setAttribute('aria-label',`View code: ${label}`);
    triggerParent.append(button);
    const stage=kind==='example'?panelParent.querySelector('.ds-preview-stage'):null;
    if(kind==='foundation')triggerParent.after(panel);
    else if(stage)stage.before(panel);
    else panelParent.append(panel);
    let data,entry,active=kind==='foundation'?'css':'usage',selected={},request=0,currentCode='';
    const title=node('h4','ds-code-title',label);
    const context=node('p','ds-code-context');
    const releaseInfo=node('p','ds-code-release');
    const tabs=node('div','ds-code-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label',`${label} code format`);
    const fileLabel=node('label','ds-code-file-label','Source');
    const files=node('select','ds-code-file');files.id=panel.id+'-file';fileLabel.htmlFor=files.id;
    const tools=node('div','ds-code-tools');
    const copy=node('button','ds-code-copy','Copy code');copy.type='button';
    const published=node('a','ds-code-published','Published file');published.target='_blank';published.rel='noopener noreferrer';
    const hash=node('span','ds-code-hash');
    const pre=node('pre','ds-code-pre');pre.tabIndex=0;pre.setAttribute('aria-label',`${label} source code`);
    const code=node('code');pre.append(code);
    const status=node('p','ds-code-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const setup=node('details','ds-code-setup');setup.append(node('summary',null,'Setup & dependencies'));
    const notes=node('ul');setup.append(notes);
    const instruction=node('p','ds-code-instruction');
    tools.append(copy,published,hash);
    const selectWrap=node('div','ds-code-select');selectWrap.append(fileLabel,files);
    const body=node('div','ds-code-body');body.append(title,context,releaseInfo,tabs,instruction,selectWrap,tools,pre,status,setup);
    function definition(){
      if(kind==='foundation')return {sources:foundationSources[id].map(([path,label])=>({path,label,group:'styles'})),notes:['These are the current source files. Shared tokens and component styles compile into /assets/site-ui.css; page layouts retain their current responsive rules.']};
      if(kind==='icon')return data.icons[id].variants[variant];
      return data.examples[id];
    }
    function choices(section){
      const ctx=getContext(),sources=entry.sources||[];
      const fileChoices=group=>sources.filter(source=>source.group===group).map(source=>({id:source.path,label:source.label+' · '+source.path,...data.files[source.path],publicLoadUrl:source.publicLoadUrl}));
      if(section==='usage'){
        const call=(ctx.mode==='mobile'&&entry.usage.variants?.mobile)||entry.usage.variants?.[ctx.state]||entry.usage.call;
        return [{id:'recipe',label:'Build-time usage',language:'javascript',code:entry.usage.import+'\n\n'+call+';'},...fileChoices('reuse')];
      }
      if(section==='html'){
        const rendered=kind==='icon'?entry.html:entry.htmlByState?.[ctx.state]||(ctx.mode==='mobile'&&entry.htmlMobile)||entry.html;
        const result=[{id:'rendered',label:kind==='icon'?'Icon markup':'Canonical component markup',language:'html',code:rendered}];
        if(kind==='icon'&&entry.svgSource?.fragment){
          const fragment=data.fragments[entry.svgSource.fragment];
          result.push({id:'svg-fragment',label:'Original SVG · '+fragment.path,...fragment});
        }
        return result.concat(fileChoices('markup'));
      }
      const result=fileChoices(section==='css'?'styles':'runtime');
      if(section==='css'&&kind!=='foundation')result.sort((a,b)=>{
        const priority=path=>path==='shared/tokens.css'?2:path==='shared/site-ui.css'?1:0;
        return priority(a.path)-priority(b.path);
      });
      return result;
    }
    function show(){
      request++;status.textContent='';
      const available=choices(active);
      if(!available.some(item=>item.id===selected[active]))selected[active]=available[0]?.id;
      files.replaceChildren(...available.map(item=>{
        const option=node('option',null,item.label);option.value=item.id;return option;
      }));
      files.value=selected[active]||'';
      const source=available.find(item=>item.id===files.value);
      currentCode=source?.code||'';code.textContent=currentCode;
      code.dataset.language=source?.language||'text';
      copy.disabled=!currentCode;
      hash.textContent=source?.sha256?'SHA-256 · '+source.sha256.slice(0,12):'';
      published.hidden=!source?.publicLoadUrl;
      if(source?.publicLoadUrl)published.href=source.publicLoadUrl;else published.removeAttribute('href');
      instruction.textContent=active==='usage'?entry.usage.instruction:'Exact current source. CSS and JavaScript files may also contain shared rules or page integration; required context is listed below.';
      for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.dataset.format===active));
      const ctx=getContext();
      context.textContent=kind==='example'?`${ctx.mode==='mobile'?'Mobile':'Desktop'} · ${window.DS_CATALOG.naming.states[ctx.state]||ctx.state}. HTML shows the canonical renderer output; interaction states use the shared styles and runtime.`:kind==='icon'?`Current ${window.DS_CATALOG.naming.variants[variant]||variant} variant. Use the surrounding control to provide an accessible name.`:'Current shared source tokens and styles.';
    }
    function render(){
      entry=definition();panel.replaceChildren(body);tabs.replaceChildren();
      const sections=kind==='foundation'?[['css','CSS']]:[['usage','Use'],['html','HTML'],['css','CSS'],...(entry.sources.some(source=>source.group==='runtime')?[['js','JavaScript']]:[])];
      for(const [id,label] of sections){
        const tab=node('button',null,label);tab.type='button';tab.dataset.format=id;
        tab.addEventListener('click',()=>{active=id;show();});tabs.append(tab);
      }
      releaseInfo.hidden=!entry.release;
      releaseInfo.textContent=entry.release?`${entry.release.version} · Used on ${entry.release.usedBy.map(route=>route==='/'?'Homepage':'About').join(' · ')}`:'';
      notes.replaceChildren();
      if(entry.release){
        notes.append(node('li',null,'Canonical sources: '+entry.release.owners.join(', ')));
        notes.append(node('li',null,'Revision includes current shared dependencies. A shared stylesheet change can revise several components.'));
      }
      for(const text of entry.notes||[])notes.append(node('li',null,text));
      for(const dependency of entry.dependencies||[]){
        const item=node('li');
        if(dependency.publicLoadUrl){
          const link=node('a',null,dependency.path);link.href=dependency.publicLoadUrl;link.target='_blank';link.rel='noopener noreferrer';item.append(link);
        }else item.append(document.createTextNode(dependency.path));
        item.append(document.createTextNode(' — '+dependency.note));notes.append(item);
      }
      show();
    }
    async function open(){
      panel.hidden=false;button.textContent='Hide code';button.setAttribute('aria-expanded','true');button.setAttribute('aria-label',`Hide code: ${label}`);
      if(data){render();return;}
      panel.replaceChildren(node('p','ds-code-loading','Loading current source…'));panel.setAttribute('aria-busy','true');
      try{data=await catalog();render();}
      catch(_){
        const error=node('p','ds-code-error','Source could not be loaded.');error.setAttribute('role','status');
        const retry=node('button','ds-code-copy','Try again');retry.type='button';retry.addEventListener('click',open);panel.replaceChildren(error,retry);
      }finally{panel.removeAttribute('aria-busy');}
    }
    button.addEventListener('click',()=>{
      if(panel.hidden)open();else {request++;panel.hidden=true;button.textContent='View code';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',`View code: ${label}`);}
    });
    files.addEventListener('change',()=>{selected[active]=files.value;show();});
    copy.addEventListener('click',async()=>{
      const generation=request,text=currentCode;
      let copied=false;
      try{await navigator.clipboard.writeText(text);copied=true;}catch(_){}
      if(generation!==request)return;
      if(!copied){
        const field=document.createElement('textarea');field.value=text;field.readOnly=true;
        field.style.cssText='position:fixed;left:-9999px;top:0;font-size:16px';
        const focus=document.activeElement;document.body.append(field);
        try{field.focus({preventScroll:true});field.select();copied=document.execCommand('copy');}catch(_){}
        field.remove();focus?.focus({preventScroll:true});
      }
      if(copied)status.textContent='Code copied.';
      else{
        const range=document.createRange();range.selectNodeContents(code);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);pre.focus({preventScroll:true});
        status.textContent='Code selected. Copy it with ⌘C or Ctrl+C.';
      }
    });
    return {refresh(){if(data&&!panel.hidden)render();}};
  }
  window.DSCode={attach};
})();
