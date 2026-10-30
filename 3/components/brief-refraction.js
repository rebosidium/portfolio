// Original travelling water field applied to the actual headline and navigation.
// Brief and portrait stay out of this filter so their own animations remain smooth.
export function mountPageRefraction(scene) {
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');
  svg.style.cssText='position:absolute;pointer-events:none;overflow:hidden';document.body.append(svg);
  const map=document.createElement('canvas'),ctx=map.getContext('2d');
  let raf=0,targets=[];
  function stop(){
    cancelAnimationFrame(raf);raf=0;
    for(const target of targets)target.element.style.filter=target.previous;
    targets=[];svg.replaceChildren();delete scene.dataset.waveRefraction;
  }
  function play(x,y){
    stop();if(!ctx||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    const w=innerWidth,h=innerHeight,ratio=Math.min(224/w,320/h);
    map.width=Math.max(1,Math.round(w*ratio));map.height=Math.max(1,Math.round(h*ratio));
    const defs=document.createElementNS(ns,'defs');svg.append(defs);
    for(const element of scene.querySelectorAll('.v3-headline,.v3-nav,.v3-name')){
      const rect=element.getBoundingClientRect();if(!rect.width||rect.bottom<0||rect.top>h)continue;
      const id=`v3-page-refraction-${crypto.randomUUID()}`,filter=document.createElementNS(ns,'filter');
      filter.setAttribute('id',id);filter.setAttribute('filterUnits','userSpaceOnUse');filter.setAttribute('x','-24');filter.setAttribute('y','-24');filter.setAttribute('width',String(rect.width+48));filter.setAttribute('height',String(rect.height+48));filter.setAttribute('color-interpolation-filters','sRGB');
      const image=document.createElementNS(ns,'feImage');image.setAttribute('result','radial-wave');image.setAttribute('preserveAspectRatio','none');image.setAttribute('x',String(-rect.x));image.setAttribute('y',String(-rect.y));image.setAttribute('width',String(w));image.setAttribute('height',String(h));
      const displacement=document.createElementNS(ns,'feDisplacementMap');displacement.setAttribute('in','SourceGraphic');displacement.setAttribute('in2','radial-wave');displacement.setAttribute('scale','18');displacement.setAttribute('xChannelSelector','R');displacement.setAttribute('yChannelSelector','G');
      filter.append(image,displacement);defs.append(filter);targets.push({element,image,id,previous:element.style.filter});
    }
    const data=ctx.createImageData(map.width,map.height),pixels=data.data,count=map.width*map.height;
    const distance=new Float32Array(count),ux=new Float32Array(count),uy=new Float32Array(count);let maxRadius=0;
    for(let py=0,i=0;py<map.height;py++)for(let px=0;px<map.width;px++,i++){
      const dx=(px+.5)*w/map.width-x,dy=(py+.5)*h/map.height-y,d=Math.max(.001,Math.hypot(dx,dy));distance[i]=d;ux[i]=dx/d;uy[i]=dy/d;maxRadius=Math.max(maxRadius,d);pixels[i*4]=128;pixels[i*4+1]=128;pixels[i*4+2]=128;pixels[i*4+3]=255;
    }
    const start=performance.now(),duration=3400,band=Math.max(65,Math.min(105,w*.065));let last=0;
    function draw(now){
      const t=Math.min(1,(now-start)/duration);if(t===1){stop();return;}
      if(now-last>=1000/30){
        last=now;const radius=maxRadius*1.12*(.5-.5*Math.cos(Math.PI*t)),attack=Math.sin(Math.min(1,t/.12)*Math.PI/2),release=t<.65?1:Math.pow((1-t)/.35,1.3);let peak=0;
        for(let i=0;i<count;i++){
          const q=(distance[i]-radius)/band,q2=(distance[i]-radius+120)/band;
          const wave=(Math.sin(q*2.4)*Math.exp(-q*q*.8)+.4*Math.sin(q2*2.4)*Math.exp(-q2*q2*.8))*attack*release;
          peak=Math.max(peak,Math.abs(wave)*9);pixels[i*4]=Math.max(0,Math.min(255,128+ux[i]*wave*127));pixels[i*4+1]=Math.max(0,Math.min(255,128+uy[i]*wave*127));
        }
        ctx.putImageData(data,0,0);const url=map.toDataURL('image/png');
        for(const target of targets){target.image.setAttribute('href',url);target.element.style.filter=`url("#${target.id}")`;}
        scene.dataset.waveRefraction='active';scene.dataset.wavePeak=peak.toFixed(2);
      }
      raf=requestAnimationFrame(draw);
    }
    draw(start);
  }
  return {play,stop};
}
