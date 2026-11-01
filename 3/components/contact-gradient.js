// Footer gradient test (/4): six interchangeable dynamic gradients behind the Contact
// block, a pointer/touch reaction for each, a switcher and a small FPS meter, so the owner
// can see which one stays smooth on a phone. Only the selected variant runs.
const section = document.getElementById('v3-contact');
const field = section?.querySelector('.v3-contact__field');
if (section && field) init();

function init() {
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  // The switcher panel and FPS meter are only for testing: open the page with ?gradtest=1
  // (kept for the tab session). Everyone else gets the default variant, silently.
  let testMode = false;
  try {
    if (new URLSearchParams(location.search).has('gradtest')) sessionStorage.setItem('v3-gradtest', '1');
    testMode = sessionStorage.getItem('v3-gradtest') === '1';
  } catch { testMode = new URLSearchParams(location.search).has('gradtest'); }
  const NAMES = ['CSS', 'Figma', 'Paper', 'Stripe', 'Blobs', 'Fluid'];
  // Palette read from the Figma reference (node 829:600).
  const PALETTE = ['#8178ff', '#5f5bd2', '#ffe99e', '#b79cff', '#ff139c'];
  const STRIPE = ['#7b70f2', '#ffe99e', '#b79cff', '#ff139c', '#5f5bd2'];
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
  let visible = false, current = null, selected = 1, startedAt = 0;
  const results = {};

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
  vec3 a=vec3(1.0,0.9137,0.6196),b=vec3(0.5059,0.4706,1.0),c=vec3(1.0,0.0,0.6078);float amt;
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

  // ---- variant 5: five soft orbiting blobs plus one that follows the pointer (very cheap) ----
  const BLOBS = `precision mediump float;
uniform vec2 uRes,uMouse;uniform float uTime,uScale;uniform vec3 uTrail[8];
void main(){
  vec2 ext=0.5*uRes/(uScale*700.0);
  vec2 p=(gl_FragCoord.xy-0.5*uRes)/(uScale*700.0);
  float t=uTime*0.28;
  vec3 col=vec3(0.0);float wsum=0.0;
  vec2 c0=ext*vec2(sin(t*0.9+0.0),cos(t*0.7+1.0))*0.85;vec3 k0=vec3(0.37,0.36,0.82);
  vec2 c1=ext*vec2(sin(t*0.6+2.0),cos(t*0.8+0.4))*0.9;vec3 k1=vec3(0.66,0.42,0.95);
  vec2 c2=ext*vec2(sin(t*0.5+4.0),cos(t*0.45+2.2))*0.9;vec3 k2=vec3(1.0,0.04,0.60);
  vec2 c3=ext*vec2(sin(t*0.75+5.0),cos(t*0.55+3.1))*0.85;vec3 k3=vec3(0.50,0.47,1.0);
  vec2 c4=ext*vec2(sin(t*0.4+1.3),cos(t*0.65+5.2))*0.8;vec3 k4=vec3(1.0,0.36,0.76);
  vec2 c5=vec2(uMouse.x*ext.x,-uMouse.y*ext.y);vec3 k5=vec3(0.85,0.55,1.0);
  float r2=0.42;
  float w0=exp(-dot(p-c0,p-c0)/r2);col+=k0*w0;wsum+=w0;
  float w1=exp(-dot(p-c1,p-c1)/r2);col+=k1*w1;wsum+=w1;
  float w2=exp(-dot(p-c2,p-c2)/r2);col+=k2*w2;wsum+=w2;
  float w3=exp(-dot(p-c3,p-c3)/r2);col+=k3*w3;wsum+=w3;
  float w4=exp(-dot(p-c4,p-c4)/r2);col+=k4*w4;wsum+=w4;
  float w5=exp(-dot(p-c5,p-c5)/(r2*0.7))*0.9;col+=k5*w5;wsum+=w5;
  for(int i=0;i<8;i++){
    vec2 c=vec2(uTrail[i].x*ext.x,-uTrail[i].y*ext.y);
    float w=exp(-dot(p-c,p-c)/(r2*0.45))*uTrail[i].z*0.9;
    col+=mix(vec3(0.95,0.45,0.85),vec3(0.55,0.5,1.0),float(i)/7.0)*w;wsum+=w;
  }
  col/=max(wsum,0.0001);
  float vignette=smoothstep(1.4,0.1,length(p/max(ext,vec2(0.3))));
  gl_FragColor=vec4(mix(vec3(0.40,0.36,0.88),col,0.80+0.20*vignette),1.0);}`;

  // ---- variant 6: real fluid simulation (shaders after PavelDoGreat/WebGL-Fluid-Simulation, MIT) ----
  // The pointer stirs velocity and drops palette-coloured dye into a fluid; the gradient itself
  // is warped by the flow, and small automatic splats keep it alive without any interaction.
  const FLUID_COLORS = [[.51, .47, 1], [.72, .61, 1], [.85, .3, .8], [1, .91, .62], [.37, .36, .82], [.62, .5, 1]];
  const fluidVariant = () => {
    const canvas = addCanvas();
    const gl = canvas.getContext('webgl2', {alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'});
    if (!gl) { canvas.remove(); throw Error('WebGL2 unavailable'); }
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) { canvas.remove(); throw Error('float render targets unavailable'); }
    const small = Math.min(innerWidth, innerHeight) < 700;
    const SIM = small ? 48 : 80, DYE = small ? 176 : 288;
    const cfg = {pressureIterations: small ? 10 : 14, curl: 8, dyeDissipation: 1.1, velDissipation: 1.2, pressure: .8, radius: .0034, force: 2100};

    const vertex = `precision highp float;attribute vec2 aPosition;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;
void main(){vUv=aPosition*0.5+0.5;vL=vUv-vec2(texelSize.x,0.0);vR=vUv+vec2(texelSize.x,0.0);vT=vUv+vec2(0.0,texelSize.y);vB=vUv-vec2(0.0,texelSize.y);gl_Position=vec4(aPosition,0.0,1.0);}`;
    const head = 'precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;';
    const SH = {
      splat: head + `uniform sampler2D uTarget;uniform float aspectRatio,radius;uniform vec3 color;uniform vec2 point;
void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;vec3 s=exp(-dot(p,p)/radius)*color;gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+s,1.0);}`,
      advection: head + `uniform sampler2D uVelocity,uSource;uniform vec2 texelSize;uniform float dt,dissipation;
void main(){vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;gl_FragColor=texture2D(uSource,coord)/(1.0+dissipation*dt);}`,
      divergence: head + `uniform sampler2D uVelocity;
void main(){float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;
if(vL.x<0.0)L=-C.x;if(vR.x>1.0)R=-C.x;if(vT.y>1.0)T=-C.y;if(vB.y<0.0)B=-C.y;gl_FragColor=vec4(0.5*(R-L+T-B),0.0,0.0,1.0);}`,
      curl: head + `uniform sampler2D uVelocity;
void main(){float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x;gl_FragColor=vec4(0.5*(R-L-T+B),0.0,0.0,1.0);}`,
      vorticity: head + `uniform sampler2D uVelocity,uCurl;uniform float curl,dt;
void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;
vec2 f=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+0.0001;f*=curl*C;f.y*=-1.0;
vec2 v=texture2D(uVelocity,vUv).xy+f*dt;gl_FragColor=vec4(clamp(v,-1000.0,1000.0),0.0,1.0);}`,
      pressure: head + `uniform sampler2D uPressure,uDivergence;
void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;
gl_FragColor=vec4((L+R+B+T-texture2D(uDivergence,vUv).x)*0.25,0.0,0.0,1.0);}`,
      gradient: head + `uniform sampler2D uPressure,uVelocity;
void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;
gl_FragColor=vec4(texture2D(uVelocity,vUv).xy-vec2(R-L,T-B),0.0,1.0);}`,
      clear: head + `uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}`,
      display: head + `uniform sampler2D uDye,uVel;uniform vec2 velTexel;uniform float uTime;
vec3 baseGradient(vec2 uv){
  vec2 p=(uv-0.5)*2.0;float t=uTime*0.28;
  vec3 col=vec3(0.0);float ws=0.0,w;
  w=exp(-dot(p-vec2(sin(t*0.9),cos(t*0.7+1.0))*0.8,p-vec2(sin(t*0.9),cos(t*0.7+1.0))*0.8)/0.55);col+=vec3(0.37,0.36,0.82)*w;ws+=w;
  vec2 c=vec2(sin(t*0.6+2.0),cos(t*0.8+0.4))*0.85;w=exp(-dot(p-c,p-c)/0.55);col+=vec3(0.72,0.61,1.0)*w;ws+=w;
  c=vec2(sin(t*0.5+4.0),cos(t*0.45+2.2))*0.85;w=exp(-dot(p-c,p-c)/0.6);col+=vec3(1.0,0.04,0.60)*w*0.35;ws+=w*0.35;
  c=vec2(sin(t*0.75+5.0),cos(t*0.55+3.1))*0.8;w=exp(-dot(p-c,p-c)/0.55);col+=vec3(0.50,0.47,1.0)*w;ws+=w;
  c=vec2(sin(t*0.4+1.3),cos(t*0.65+5.2))*0.75;w=exp(-dot(p-c,p-c)/0.5);col+=vec3(1.0,0.91,0.62)*w*0.5;ws+=w*0.5;
  col/=max(ws,0.0001);
  return mix(vec3(0.40,0.36,0.88),col,0.9);}
void main(){
  vec2 flow=texture2D(uVel,vUv).xy*velTexel*0.05;
  vec3 col=baseGradient(vUv-flow);
  vec3 d=texture2D(uDye,vUv).rgb;float m=max(d.r,max(d.g,d.b));
  vec3 pure=d/max(m,0.0001);
  col=mix(col,pure,smoothstep(0.0,0.9,m)*0.6);
  gl_FragColor=vec4(col,1.0);}`
    };
    const shaders = [];
    const makeProgram = fragment => {
      const compileOne = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); shaders.push(s); return s; };
      const program = gl.createProgram();
      gl.attachShader(program, compileOne(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compileOne(gl.FRAGMENT_SHADER, fragment));
      gl.bindAttribLocation(program, 0, 'aPosition'); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      const uniforms = {};
      for (let i = 0, n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i < n; i++) { const name = gl.getActiveUniform(program, i).name; uniforms[name] = gl.getUniformLocation(program, name); }
      return {program, uniforms, use() { gl.useProgram(program); return uniforms; }};
    };
    const P = {};
    for (const key of Object.keys(SH)) P[key] = makeProgram(SH[key]);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);

    const fbo = (w, h) => {
      const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      const frame = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, frame); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error('float framebuffer unsupported');
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return {texture, frame, w, h, tx: 1 / w, ty: 1 / h, attach(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture); return unit; }};
    };
    const double = (w, h) => { let a = fbo(w, h), b = fbo(w, h); return {w, h, tx: 1 / w, ty: 1 / h, get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; }}; };
    const dim = base => { const aspect = Math.max(.2, Math.min(5, field.clientWidth / Math.max(1, field.clientHeight))); return aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)]; };
    const [sw, sh] = dim(SIM), [dw, dh] = dim(DYE);
    const velocity = double(sw, sh), dye = double(dw, dh), pressure = double(sw, sh), divergence = fbo(sw, sh), curl = fbo(sw, sh);
    const sizeUp = () => sizeCanvas(canvas, small ? 120000 : 220000);
    sizeUp(); const observer = new ResizeObserver(sizeUp); observer.observe(field);
    const aspect = () => canvas.width / canvas.height;
    const blit = target => {
      if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.frame); gl.viewport(0, 0, target.w, target.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const splat = (x, y, dx, dy, color, radiusScale = 1) => {
      const u = P.splat.use(), a = aspect(), r = cfg.radius * (a > 1 ? a : 1) * radiusScale;
      gl.uniform1f(u.aspectRatio, a); gl.uniform2f(u.point, x, y); gl.uniform1f(u.radius, r);
      gl.uniform1i(u.uTarget, velocity.read.attach(0)); gl.uniform3f(u.color, dx, dy, 0); blit(velocity.write); velocity.swap();
      gl.uniform1i(u.uTarget, dye.read.attach(0)); gl.uniform3f(u.color, color[0], color[1], color[2]); blit(dye.write); dye.swap();
    };
    const step = dt => {
      let u = P.curl.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); blit(curl);
      u = P.vorticity.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uCurl, curl.attach(1)); gl.uniform1f(u.curl, cfg.curl); gl.uniform1f(u.dt, dt); blit(velocity.write); velocity.swap();
      u = P.divergence.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); blit(divergence);
      u = P.clear.use(); gl.uniform1i(u.uTexture, pressure.read.attach(0)); gl.uniform1f(u.value, cfg.pressure); blit(pressure.write); pressure.swap();
      u = P.pressure.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uDivergence, divergence.attach(0));
      for (let i = 0; i < cfg.pressureIterations; i++) { gl.uniform1i(u.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
      u = P.gradient.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uPressure, pressure.read.attach(0)); gl.uniform1i(u.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap();
      u = P.advection.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uSource, velocity.read.attach(0)); gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, cfg.velDissipation); blit(velocity.write); velocity.swap();
      gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uSource, dye.read.attach(1)); gl.uniform1f(u.dissipation, cfg.dyeDissipation); blit(dye.write); dye.swap();
    };
    const draw = time => {
      const u = P.display.use(); gl.uniform1i(u.uDye, dye.read.attach(0)); gl.uniform1i(u.uVel, velocity.read.attach(1));
      gl.uniform2f(u.velTexel, velocity.tx, velocity.ty); gl.uniform1f(u.uTime, time); blit(null);
    };

    // pointer: velocity from its movement, colour cycling through the palette
    let last = null, colorIndex = 0, nextAuto = 0, lastTime = performance.now();
    const rect = () => field.getBoundingClientRect();
    const onMove = event => {
      const r = rect(), x = (event.clientX - r.left) / r.width, y = 1 - (event.clientY - r.top) / r.height;
      if (x < -.05 || x > 1.05 || y < -.05 || y > 1.05) { last = null; return; }
      if (last) {
        const a = aspect(); let dx = x - last.x, dy = y - last.y;
        if (a < 1) dx *= a; else dy /= a;
        if (Math.abs(dx) + Math.abs(dy) > 0) {
          colorIndex = (colorIndex + .06) % FLUID_COLORS.length;
          const c = FLUID_COLORS[Math.floor(colorIndex)];
          splat(x, y, dx * cfg.force, dy * cfg.force, [c[0] * .7, c[1] * .7, c[2] * .7]);
        }
      }
      last = {x, y};
    };
    const onLeave = () => { last = null; };
    addEventListener('pointermove', onMove, {passive: true});
    addEventListener('pointerdown', onMove, {passive: true});
    addEventListener('pointerup', onLeave, {passive: true});
    for (let i = 0; i < 6; i++) { const c = FLUID_COLORS[i % FLUID_COLORS.length]; splat(.15 + Math.random() * .7, .15 + Math.random() * .7, (Math.random() - .5) * 260, (Math.random() - .5) * 260, c.map(v => v * .6), 1.6); }
    const start = performance.now();
    const frame = () => {
      const now = performance.now(), dt = Math.min((now - lastTime) / 1000, .033); lastTime = now;
      if (now > nextAuto) {
        nextAuto = now + 1300 + Math.random() * 1200;
        const c = FLUID_COLORS[Math.floor(Math.random() * FLUID_COLORS.length)];
        splat(.1 + Math.random() * .8, .1 + Math.random() * .8, (Math.random() - .5) * 240, (Math.random() - .5) * 240, c.map(v => v * .6), 1.5);
      }
      step(dt); draw((now - start) / 1000 + 4);
    };
    const stop = reduced.matches ? (draw(4), () => {}) : makeLoop(frame, 45);
    return () => {
      stop(); observer.disconnect();
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onMove); removeEventListener('pointerup', onLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove();
    };
  };

  const starts = {
    // 1 — current CSS blobs, now with a gentle pointer parallax
    0: () => {
      field.dataset.css = 'on';
      // Four soft palette blobs chase the pointer, each a little behind the one before.
      const chasers = ['#ff4cb8', '#c08cf8', '#8178ff', '#ff1aa0'].map((color, i) => {
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
    1: fragmentVariant(FIGMA, {fps: 30, maxPixels: 85000, speed: .32}),
    // 3 — Paper Shaders mesh gradient (Apache-2.0), pointer shifts and tilts it
    2: () => {
      const host = document.createElement('div'); host.className = 'v3-contact__gl v3-contact__gl--host'; field.prepend(host);
      let mount, stopLoop = () => {}, disposed = false;
      import('./vendor/paper-mesh-gradient.js').then(lib => {
        if (disposed) return;
        const colors = PALETTE.map(lib.getShaderColorFromString);
        mount = new lib.ShaderMount(host, lib.meshGradientFragmentShader, {
          u_fit: lib.ShaderFitOptions.cover, u_scale: 1.6, u_rotation: 0, u_offsetX: 0, u_offsetY: 0, u_originX: .5, u_originY: .5, u_worldWidth: 0, u_worldHeight: 0,
          u_colors: colors, u_colorsCount: colors.length, u_distortion: .9, u_swirl: .3, u_grainMixer: 0, u_grainOverlay: 0
        }, undefined, reduced.matches ? 0 : .45, 6000, .5, 130000);
        if (!reduced.matches) stopLoop = makeLoop(() => { const p = smooth(); mount.setUniforms({u_offsetX: p.x * .22, u_offsetY: p.y * .22, u_rotation: p.x * 18, u_distortion: .9 + p.energy * .8, u_swirl: .3 + p.energy * .6}); }, 30);
      }).catch(() => { host.remove(); });
      return () => { disposed = true; stopLoop(); mount?.dispose(); host.remove(); };
    },
    // 4 — Stripe-style wave gradient (MIT)
    3: () => {
      const canvas = addCanvas(); canvas.classList.add('v3-contact__gl--parallax');
      let gradient, stopLoop = () => {}, disposed = false;
      const observer = new ResizeObserver(() => gradient?.resize?.()); observer.observe(field);
      import('./vendor/wave-gradient.js').then(lib => {
        if (disposed) return;
        gradient = new lib.WaveGradient(canvas, {colors: STRIPE, fps: 30, speed: reduced.matches ? 0 : 1.1, seed: 4});
        if (!reduced.matches) stopLoop = makeLoop(() => { const p = smooth(); canvas.style.transform = `translate3d(${(p.x * -22).toFixed(1)}px,${(p.y * -22).toFixed(1)}px,0) scale(1.1)`; if (gradient) gradient.speed = 1.1 * (1 + p.energy * 4); }, 30);
      }).catch(() => { canvas.remove(); });
      return () => { disposed = true; stopLoop(); observer.disconnect(); gradient?.destroy?.(); canvas.remove(); };
    },
    4: fragmentVariant(BLOBS, {fps: 30, maxPixels: 150000, speed: 1}),
    5: fluidVariant
  };

  // ---- selecting a variant ---------------------------------------------------
  const panel = document.createElement('div');
  panel.className = 'v3-gradtest'; panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Footer gradient test');
  panel.innerHTML = '<div class="v3-gradtest__row">' + NAMES.map((name, i) => `<button type="button" data-v="${i}"><span>${i + 1} ${name}</span><i></i></button>`).join('') + '</div><div class="v3-gradtest__fps">–</div>';
  document.body.append(panel);
  const buttons = [...panel.querySelectorAll('button')], readout = panel.querySelector('.v3-gradtest__fps');

  function stopCurrent() { try { current?.(); } catch { /* Already gone. */ } current = null; }
  function select(index) {
    stopCurrent();
    selected = index; startedAt = performance.now();
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    field.dataset.grad = String(index);
    frames.length = 0;
    if (testMode) { try { sessionStorage.setItem('v3-grad', String(index)); } catch { /* Optional. */ } }
    if (!visible) return;
    try { current = starts[index](); } catch (error) { buttons[index].querySelector('i').textContent = 'n/a'; readout.textContent = 'variant failed: ' + (error.message || error); field.dataset.grad = '0'; current = starts[0](); }
  }
  buttons.forEach((b, i) => b.addEventListener('click', () => select(i)));

  // ---- FPS meter (independent of the variants) -------------------------------
  const frames = [];
  let meterRaf = 0, lastFrame = 0;
  function meter(now) {
    meterRaf = requestAnimationFrame(meter);
    if (lastFrame) frames.push(now - lastFrame);
    lastFrame = now;
    if (frames.length > 90) frames.shift();
    if (frames.length >= 30 && Math.round(now) % 3 === 0) {
      const avg = frames.reduce((a, b) => a + b, 0) / frames.length, worst = Math.max(...frames);
      readout.textContent = `${Math.round(1000 / avg)} fps · worst frame ${Math.round(worst)} ms`;
      if (now - startedAt > 3500) { results[selected] = Math.round(1000 / avg); buttons[selected].querySelector('i').textContent = results[selected] + ' fps'; }
    }
  }
  const startMeter = () => { if (!meterRaf) { lastFrame = 0; meterRaf = requestAnimationFrame(meter); } };
  const stopMeter = () => { cancelAnimationFrame(meterRaf); meterRaf = 0; };

  // The Spin game switches the rest of the site off while it is open.
  let gamePaused = false;
  document.addEventListener('v3-game-pause', () => { gamePaused = true; stopCurrent(); stopMeter(); });
  document.addEventListener('v3-game-resume', () => {
    gamePaused = false;
    if (!visible) return;
    startedAt = performance.now(); frames.length = 0;
    try { current = starts[selected](); } catch { current = starts[0](); field.dataset.grad = '0'; }
    if (testMode) startMeter();
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    panel.dataset.show = visible && testMode ? 'true' : 'false';
    if (visible && !gamePaused) { startedAt = performance.now(); frames.length = 0; if (!current) { try { current = starts[selected](); } catch { current = starts[0](); field.dataset.grad = '0'; } } if (testMode) startMeter(); }
    else { stopCurrent(); stopMeter(); wake.length = 0; }
  }, {rootMargin: '80px'}).observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMeter(); else if (visible && testMode) startMeter(); });

  // Default for everyone: 2 Figma (index 1). In test mode ?v=1…6 or the last choice of the tab wins (?v is 1-based).
  const fromUrl = new URLSearchParams(location.search).get('v');
  let stored = null; try { stored = sessionStorage.getItem('v3-grad'); } catch { /* Optional. */ }
  const initial = testMode ? (fromUrl !== null ? Number(fromUrl) - 1 : Number(stored ?? 1)) : 1;   // ?v=1…6 is 1-based
  select(Number.isInteger(initial) && initial >= 0 && initial < NAMES.length ? initial : 1);
}
