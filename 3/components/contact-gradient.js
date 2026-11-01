// Footer gradient, Contact block: the Figma "Moving gradient" (node 829:600) ported to a small
// WebGL fragment shader that keeps drifting on its own and bends along the pointer/finger wake.
// If WebGL is unavailable it falls back to soft CSS blobs that follow the pointer.
// The five other variants that were tried (Paper, Stripe-style waves, cheap blobs, a fluid
// simulation, plus a switcher/FPS meter) are archived in experiments/footer-gradient-variants/.
const section = document.getElementById('v3-contact');
const field = section?.querySelector('.v3-contact__field');
if (section && field) init();

function init() {
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let visible = false, current = null, gamePaused = false;
  const pointer = {x: 0, y: 0, tx: 0, ty: 0, active: false, energy: 0};
  // Recent pointer positions: every variant bends its own animation along this wake.
  const WAKE = 8, wake = [];
  const wakeData = new Float32Array(WAKE * 3);
  const wakeUniform = () => {
    const now = performance.now();
    while (wake.length && now - wake[wake.length - 1].t > 2400) wake.pop();
    for (let i = 0; i < WAKE; i++) {
      const w = wake[i];
      wakeData[i * 3] = w ? w.x : 0; wakeData[i * 3 + 1] = w ? w.y : 0; wakeData[i * 3 + 2] = w ? Math.exp(-(now - w.t) / 1100) : 0;
    }
    return wakeData;
  };

  // ---- pointer / touch -------------------------------------------------------
  const setTarget = event => {
    const rect = section.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    pointer.energy = Math.min(1, pointer.energy + Math.hypot(nx - pointer.tx, ny - pointer.ty) * 2.4);
    pointer.tx = nx; pointer.ty = ny; pointer.active = true;
    if (!visible || reduced.matches) return;
    const now = performance.now();
    if (!wake.length || now - wake[0].t > 38) { wake.unshift({x: nx, y: ny, t: now}); if (wake.length > WAKE) wake.pop(); }
  };
  addEventListener('pointermove', setTarget, {passive: true});
  addEventListener('pointerdown', setTarget, {passive: true});
  // Smoothed pointer shared by all variants (lerped once per frame by whoever asks).
  const smooth = (k = .07) => {
    if (!pointer.active) { const t = performance.now() / 1000; pointer.tx = Math.sin(t * .21) * .5; pointer.ty = Math.cos(t * .17) * .4; }
    pointer.x += (pointer.tx - pointer.x) * k; pointer.y += (pointer.ty - pointer.y) * k; pointer.energy *= .955;
    return pointer;
  };

  const makeLoop = (fn, fps = 60) => {
    let raf = 0, last = 0, stopped = false;
    const tick = now => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / fps - 2) return;
      last = now; fn(now / 1000);
    };
    raf = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  };
  const sizeCanvas = (canvas, maxPixels) => {
    const w = Math.max(1, field.clientWidth), h = Math.max(1, field.clientHeight);
    const scale = Math.min(1, Math.sqrt(maxPixels / (w * h)));
    canvas.width = Math.max(2, Math.round(w * scale)); canvas.height = Math.max(2, Math.round(h * scale));
    return scale;
  };
  const addCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.className = 'v3-contact__gl'; canvas.setAttribute('aria-hidden', 'true');
    field.prepend(canvas);
    return canvas;
  };
  const compile = (gl, vertex, fragment) => {
    const make = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, make(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, make(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    return program;
  };
  const VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  // Full-screen fragment variants share this runner.
  const fragmentVariant = (fragment, {fps, maxPixels, speed}) => () => {
    const canvas = addCanvas();
    const gl = canvas.getContext('webgl', {antialias: false, alpha: false, powerPreference: 'low-power'});
    if (!gl) { canvas.remove(); throw Error('WebGL unavailable'); }
    const program = compile(gl, VERTEX, fragment);
    const u = name => gl.getUniformLocation(program, name);
    let scale = sizeCanvas(canvas, maxPixels);
    const resize = () => { scale = sizeCanvas(canvas, maxPixels); gl.viewport(0, 0, canvas.width, canvas.height); };
    const observer = new ResizeObserver(resize); observer.observe(field); resize();
    const start = performance.now();
    const render = t => {
      const p = smooth();
      gl.uniform2f(u('uRes'), canvas.width, canvas.height); gl.uniform1f(u('uScale'), scale);
      gl.uniform1f(u('uTime'), reduced.matches ? 4 : (performance.now() - start) / 1000 * speed + 4);
      gl.uniform2f(u('uMouse'), p.x, p.y); gl.uniform3fv(u('uTrail[0]'), wakeUniform());
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const stop = reduced.matches ? (render(0), () => {}) : makeLoop(render, fps);
    return () => { stop(); observer.disconnect(); gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove(); };
  };

  // ---- variant 2: the Figma "Moving gradient" shader ported to a WebGL fragment shader ----
  const FIGMA = `precision highp float;
uniform vec2 uRes,uMouse;uniform float uTime,uScale;uniform vec3 uTrail[8];
vec3 hash33(vec3 p){vec3 q=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(q)*43758.5453)*2.0-1.0;}
vec3 smoother(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
float gd(vec3 c,vec3 o,vec3 l){return dot(hash33(c+o),l-o);}
float perlin3(vec3 p){
  vec3 c=floor(p),l=fract(p),w=smoother(l);
  float a=mix(mix(gd(c,vec3(0,0,0),l),gd(c,vec3(1,0,0),l),w.x),mix(gd(c,vec3(0,1,0),l),gd(c,vec3(1,1,0),l),w.x),w.y);
  float b=mix(mix(gd(c,vec3(0,0,1),l),gd(c,vec3(1,0,1),l),w.x),mix(gd(c,vec3(0,1,1),l),gd(c,vec3(1,1,1),l),w.x),w.y);
  return mix(a,b,w.z)*1.1547;}
vec3 rotateOctave(vec3 p){return vec3(0.80*p.y+0.60*p.z,-0.80*p.x+0.36*p.y-0.48*p.z,-0.60*p.x-0.48*p.y+0.64*p.z);}
float fbm(vec3 p){float total=0.0,amp=1.0,wt=0.0;for(int i=0;i<3;i++){total+=perlin3(p)*amp;wt+=amp;p=rotateOctave(p)*2.02+vec3(3.7,1.9,6.3);amp*=0.48;}return total/max(wt,0.0001);}
vec3 warpVector(vec3 p){return vec3(perlin3(p),perlin3(p+vec3(5.2,1.3,2.8)),perlin3(p+vec3(1.7,9.2,4.4)));}
float wrap(float x){return x-floor(x/6.28318530718)*6.28318530718;}
vec3 curved(float mt,vec3 r,vec3 ph){return vec3(sin(wrap(mt*r.x+ph.x)),sin(wrap(mt*r.y+ph.y)),cos(wrap(mt*r.z+ph.z)));}
vec3 primaryMotion(float mt){return normalize(vec3(0.73,-0.41,0.55))*mt*0.105+normalize(vec3(-0.28,0.91,0.31))*mt*0.023+curved(mt,vec3(0.071,0.043,0.029),vec3(0.0,1.73,4.11))*0.16;}
vec3 warpMotion(float mt){return normalize(vec3(-0.46,0.38,0.80))*mt*0.137+normalize(vec3(0.84,0.51,-0.18))*mt*0.031+curved(mt,vec3(0.089,0.053,0.034),vec3(2.21,5.07,0.83))*0.12;}
float heightField(vec3 dir){
  float mt=uTime*3.74;
  vec3 p=dir*1.887+vec3(1.7,3.1,5.3)+primaryMotion(mt);
  vec3 w=warpVector(p*0.55+warpMotion(mt)*0.42+vec3(0.7,-1.1,0.4))*0.26;
  return fbm(p+w);}
vec3 s2l(vec3 c){vec3 v=max(c,0.0);return mix(v/12.92,pow((v+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),v));}
vec3 l2s(vec3 c){vec3 v=max(c,0.0);return mix(v*12.92,1.055*pow(v,vec3(1.0/2.4))-0.055,step(vec3(0.0031308),v));}
vec3 l2ok(vec3 c){float l=pow(max(0.4122214708*c.r+0.5363325363*c.g+0.0514459929*c.b,0.0),1.0/3.0),m=pow(max(0.2119034982*c.r+0.6806995451*c.g+0.1073969566*c.b,0.0),1.0/3.0),s=pow(max(0.0883024619*c.r+0.2817188376*c.g+0.6299787005*c.b,0.0),1.0/3.0);return vec3(0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.8086757660*s);}
vec3 ok2l(vec3 c){float l=c.x+0.3963377774*c.y+0.2158037573*c.z,m=c.x-0.1055613458*c.y-0.0638541728*c.z,s=c.x-0.0894841775*c.y-1.2914855480*c.z;l=l*l*l;m=m*m*m;s=s*s*s;return vec3(4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s);}
vec3 gradientAt(float t){
  vec3 a=vec3(1.0,0.9137,0.6196),b=vec3(0.5059,0.4706,1.0),c=vec3(0.18,0.42,1.0);float amt;
  if(t<0.5){amt=t/0.5;}else{a=b;b=c;amt=(t-0.5)/0.5;}
  amt=amt*amt*(3.0-2.0*amt);
  return l2s(ok2l(mix(l2ok(s2l(a)),l2ok(s2l(b)),amt)));}
vec3 dirAt(vec2 q){return normalize(vec3(q+uMouse*vec2(0.10,-0.10),1.0));}
void main(){
  vec2 ext=0.5*uRes/(uScale*2100.0);
  vec2 q=(gl_FragCoord.xy-0.5*uRes)/(uScale*2100.0);
  float rad=0.28*ext.x+0.04,r2=rad*rad;
  for(int i=0;i<8;i++){
    vec2 d=q-vec2(uTrail[i].x*ext.x,-uTrail[i].y*ext.y);
    float g=uTrail[i].z*exp(-dot(d,d)/r2);
    q-=d*0.2*g;
  }
  float h=heightField(dirAt(q));
  float t=clamp(0.62+h*1.5,0.30,1.0);
  vec3 base=gradientAt(t);
  float e=0.012;
  vec2 slope=vec2(heightField(dirAt(q+vec2(e,0.0)))-h,heightField(dirAt(q+vec2(0.0,e)))-h)/e;
  vec3 n=normalize(vec3(-slope*1.05,1.0));
  vec3 L=normalize(vec3(-0.45+uMouse.x*0.55,0.70-uMouse.y*0.55,0.65)),F=normalize(vec3(0.5,-0.3,0.4)),V=vec3(0.0,0.0,1.0);
  float key=max(dot(n,L),0.0),fill=max(dot(n,F),0.0)*0.22;
  float spec=pow(max(dot(n,normalize(L+V)),0.0),22.0)*0.14,rim=pow(1.0-max(dot(n,V),0.0),2.8)*0.07;
  vec3 lit=base*(0.40+(key+fill)*0.60)+vec3(spec+rim);
  gl_FragColor=vec4(mix(base,lit,0.35),1.0);}`;

  const starts = {
    // 1 — current CSS blobs, now with a gentle pointer parallax
    0: () => {
      field.dataset.css = 'on';
      // Four soft palette blobs chase the pointer, each a little behind the one before.
      const chasers = ['#4f86ff', '#c08cf8', '#8178ff', '#2f6bff'].map((color, i) => {
        const el = document.createElement('i'); el.className = 'v3-contact__chaser';
        el.style.cssText = `--c:${color};--s:${34 - i * 4}%`; field.append(el); return {el, x: 0, y: 0};
      });
      const stop = reduced.matches ? () => {} : makeLoop(() => {
        const p = smooth(.08);
        field.style.setProperty('--mx', p.x.toFixed(3)); field.style.setProperty('--my', p.y.toFixed(3));
        const w = field.clientWidth, h = field.clientHeight;
        let tx = p.tx, ty = p.ty;
        chasers.forEach((c, i) => {
          c.x += (tx - c.x) * (.16 - i * .025); c.y += (ty - c.y) * (.16 - i * .025); tx = c.x; ty = c.y;
          c.el.style.transform = `translate3d(${(c.x * w / 2).toFixed(1)}px,${(c.y * h / 2).toFixed(1)}px,0)`;
          c.el.style.opacity = (.25 + p.energy * .75).toFixed(2);
        });
      }, 30);
      return () => { stop(); chasers.forEach(c => c.el.remove()); delete field.dataset.css; field.style.removeProperty('--mx'); field.style.removeProperty('--my'); };
    },
    1: fragmentVariant(FIGMA, {fps: 30, maxPixels: 85000, speed: .32})
  };

  function stopCurrent() { try { current?.(); } catch { /* Already gone. */ } current = null; }
  function start() {
    if (current) return;
    try { current = starts[1](); field.dataset.grad = '1'; }
    catch { current = starts[0](); field.dataset.grad = '0'; }   // no WebGL: the CSS blobs
  }

  // The Spin game switches the rest of the site off while it is open.
  document.addEventListener('v3-game-pause', () => { gamePaused = true; stopCurrent(); });
  document.addEventListener('v3-game-resume', () => { gamePaused = false; if (visible) start(); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !gamePaused) start();
    else { stopCurrent(); wake.length = 0; }
  }, {rootMargin: '80px'}).observe(section);
}
