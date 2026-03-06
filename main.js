const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const rand=(a,b)=>a+Math.random()*(b-a)
class Ring{
  constructor(x,y,r,color){
    this.x=x;this.y=y;this.vx=0;this.vy=0;this.r=r;this.color=color;this.hooked=false;this.peg=null;this.angle=0;this.spin=0
    this.lastX=x;this.lastY=y
  }
  applyForce(fx,fy){this.vx+=fx;this.vy+=fy}
  step(dt,g,drag,walls){
    if(this.hooked){this.angle+=this.spin*dt;this.x=this.peg.x+Math.cos(this.angle)*0;this.y=this.peg.y+this.r*0.25;return}
    this.lastX=this.x;this.lastY=this.y
    this.vy+=g*dt
    this.vx*=Math.exp(-drag*dt);this.vy*=Math.exp(-drag*dt)
    this.x+=this.vx*dt;this.y+=this.vy*dt
    if(this.x-this.r<walls.l){this.x=walls.l+this.r;this.vx=Math.abs(this.vx)*0.4}
    if(this.x+this.r>walls.r){this.x=walls.r-this.r;this.vx=-Math.abs(this.vx)*0.4}
    if(this.y-this.r<walls.t){this.y=walls.t+this.r;this.vy=Math.abs(this.vy)*0.4}
    if(this.y+this.r>walls.b){this.y=walls.b-this.r;this.vy=-Math.abs(this.vy)*0.4}
  }
  draw(ctx){
    ctx.lineWidth=this.r*0.45
    ctx.strokeStyle=this.color
    ctx.beginPath()
    ctx.arc(this.x,this.y,this.r,0,Math.PI*2)
    ctx.stroke()
    ctx.lineWidth=2
    ctx.strokeStyle="rgba(0,0,0,.08)"
    ctx.beginPath()
    ctx.arc(this.x,this.y,this.r*0.65,0,Math.PI*2)
    ctx.stroke()
  }
}
class Peg{
  constructor(x,y){
    this.x=x;this.y=y;this.radius=10;this.count=0
  }
  draw(ctx){
    ctx.fillStyle="#ec4aa2"
    ctx.beginPath()
    ctx.arc(this.x,this.y,8,0,Math.PI*2)
    ctx.fill()
    ctx.fillStyle="#b81e75"
    ctx.fillRect(this.x-3,this.y,6,18)
  }
}
class Jet{
  constructor(x,y){
    this.x=x;this.y=y;this.power=0
  }
  blast(rings,intensity){
    this.power=intensity
    const rad=200;const top=this.y-300
    for(const ring of rings){
      if(ring.hooked)continue
      if(ring.y>top&&ring.y<this.y+40){
        const dx=ring.x-this.x;const dy=ring.y-this.y
        const d=Math.hypot(dx,dy)
        if(d<rad){
          const k=(1-d/rad)
          const up=intensity*2400*k
          const swirl=rand(-180,180)*k
          ring.applyForce(swirl*0.05,(-up+rand(-90,110))*0.06)
        }
      }
    }
  }
  draw(ctx){
    const g=ctx.createLinearGradient(this.x,this.y,this.x,this.y-160)
    g.addColorStop(0,"rgba(255,255,255,.12)")
    g.addColorStop(1,"rgba(0,200,255,.0)")
    ctx.fillStyle=g
    ctx.beginPath()
    ctx.moveTo(this.x-26,this.y)
    ctx.lineTo(this.x+26,this.y)
    ctx.lineTo(this.x,this.y-180)
    ctx.closePath()
    ctx.fill()
  }
}
class Game{
  constructor(canvas,scoreEl){
    this.c=canvas;this.ctx=canvas.getContext("2d");this.scoreEl=scoreEl
    this.logicalW=420;this.logicalH=640
    this.w=this.logicalW;this.h=this.logicalH
    this.bounds={l:30,r:this.w-30,t:30,b:this.h-120}
    this.gravity=260;this.drag=1.7
    this.leftJet=new Jet(this.w*0.35,this.bounds.b-10)
    this.rightJet=new Jet(this.w*0.65,this.bounds.b-10)
    this.rings=[];this.pegs=[]
    this.score=0
    this.leftHeld=false;this.rightHeld=false
    this.winTarget=0
    this.won=false
    this.overlay=null
    this.playAgainBtn=null
    this.particles=[]
    this.muted=false
    this.jetMult=1
    this.challenge=false
    this.challengePegIndex=1
    this.resize()
    this.init()
    this.bind()
    this.last=0
    requestAnimationFrame(t=>this.loop(t))
  }
  init(){
    this.rings.length=0;this.pegs.length=0;this.score=0;this.updateScore();this.particles.length=0
    const palette=["#ff5c7a","#ffb347","#7bd553","#57c7ff","#d49cff","#ff7edb"]
    const total=12
    for(let i=0;i<total;i++){
      const r=14
      const x=rand(this.bounds.l+r,this.bounds.r-r)
      const y=rand(this.bounds.b-80,this.bounds.b-20)
      this.rings.push(new Ring(x,y,r,palette[i%palette.length]))
    }
    this.winTarget=this.rings.length
    const top=this.bounds.t+70
    for(let i=0;i<3;i++){
      const px=this.bounds.l+(i+1)*(this.bounds.r-this.bounds.l)/(3+1)
      this.pegs.push(new Peg(px,top))
    }
  }
  updateScore(){this.scoreEl.textContent=String(this.score)}
  bind(){
    const lb=document.getElementById("leftBtn")
    const rb=document.getElementById("rightBtn")
    const reset=document.getElementById("resetBtn")
    const pressL=()=>{this.leftHeld=true;lb.classList.add("is-pressed")}
    const releaseL=()=>{this.leftHeld=false;lb.classList.remove("is-pressed")}
    const pressR=()=>{this.rightHeld=true;rb.classList.add("is-pressed")}
    const releaseR=()=>{this.rightHeld=false;rb.classList.remove("is-pressed")}
    const bindPressHold=(el,onDown,onUp)=>{
      const supportsPointer="onpointerdown" in window
      if(supportsPointer){
        el.addEventListener("pointerdown",e=>{e.preventDefault();onDown()})
        el.addEventListener("pointerup",onUp)
        el.addEventListener("pointercancel",onUp)
        el.addEventListener("pointerleave",onUp)
      }else{
        el.addEventListener("mousedown",e=>{e.preventDefault();onDown()})
        el.addEventListener("mouseup",onUp)
        el.addEventListener("mouseleave",onUp)
        el.addEventListener("touchstart",e=>{e.preventDefault();onDown()},{passive:false})
        el.addEventListener("touchend",onUp)
        el.addEventListener("touchcancel",onUp)
      }
    }
    bindPressHold(lb,pressL,releaseL)
    bindPressHold(rb,pressR,releaseR)
    reset.addEventListener("click",()=>this.init())
    window.addEventListener("resize",()=>this.resize())
    window.addEventListener("orientationchange",()=>{setTimeout(()=>this.resize(),100)})
    window.addEventListener("keydown",e=>{
      const k=e.key.toLowerCase()
      if(k==="a")this.leftHeld=true
      if(k==="d")this.rightHeld=true
      if(k==="m")this.muted=!this.muted
      if(k==="f")this.toggleFeelPanel()
      if(k==="c"){this.challenge=!this.challenge}
    })
    window.addEventListener("keyup",e=>{if(e.key.toLowerCase()==="a")this.leftHeld=false;if(e.key.toLowerCase()==="d")this.rightHeld=false})
  }
  resize(){
    const dpr=window.devicePixelRatio||1
    const cssW=this.c.clientWidth||this.c.getBoundingClientRect().width||this.logicalW
    const scale=cssW/this.logicalW
    const cssH=Math.round(this.logicalH*scale)
    this.c.style.height=cssH+"px"
    this.c.width=Math.round(cssW*dpr)
    this.c.height=Math.round(cssH*dpr)
    this.ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0)
  }
  hookCheck(ring){
    if(ring.hooked)return
    for(const peg of this.pegs){
      const d=Math.hypot(ring.x-peg.x,ring.y-peg.y)
      if(d>ring.r*0.85&&d<ring.r*1.15&&ring.vy>20){
        ring.hooked=true;ring.peg=peg;ring.vx=0;ring.vy=0;ring.spin=rand(-0.8,0.8)
        this.onHook(ring,peg)
        return
      }
    }
  }
  onHook(ring,peg){
    const allowScore=!this.challenge || (peg===this.pegs[this.challengePegIndex])
    if(allowScore){this.score+=1;this.updateScore()}
    for(let i=0;i<10;i++){this.particles.push({x:ring.x,y:ring.y,vx:rand(-60,60),vy:rand(-160,-60),life:rand(0.25,0.5),t:0})}
    if(!this.muted)this.beep()
  }
  beep(){
    try{
      const A=window.AudioContext||window.webkitAudioContext;if(!A)return
      const ctx=this.audioCtx||(this.audioCtx=new A())
      const o=ctx.createOscillator(),g=ctx.createGain()
      o.type="triangle";o.frequency.value=880;g.gain.value=0.05
      o.connect(g);g.connect(ctx.destination)
      const now=ctx.currentTime;o.start(now);g.gain.exponentialRampToValueAtTime(0.0001,now+0.1);o.stop(now+0.11)
    }catch(e){}
  }
  toggleFeelPanel(){
    if(this.panel){this.panel.remove();this.panel=null;return}
    const p=document.createElement("div")
    p.style.position="fixed";p.style.right="12px";p.style.bottom="12px";p.style.background="#0f0b1c";p.style.color="#fff";p.style.border="1px solid #3a2a55";p.style.borderRadius="12px";p.style.padding="10px 12px";p.style.minWidth="220px";p.style.zIndex="9999"
    const add=(label,min,max,step,val,cb)=>{const row=document.createElement("div");row.style.display="flex";row.style.alignItems="center";row.style.gap="8px";row.style.margin="6px 0";const sp=document.createElement("span");sp.textContent=label;sp.style.flex="0 0 70px";const r=document.createElement("input");r.type="range";r.min=min;r.max=max;r.step=step;r.value=val;r.style.flex="1";r.oninput=()=>cb(parseFloat(r.value));row.appendChild(sp);row.appendChild(r);p.appendChild(row)}
    const closeBtn=document.createElement("button");closeBtn.textContent="×";closeBtn.style.cssText="position:absolute;right:6px;top:4px;background:#2b2f3a;color:#fff;border:none;border-radius:6px;padding:2px 8px;cursor:pointer";closeBtn.onclick=()=>{this.toggleFeelPanel()}
    p.appendChild(closeBtn)
    add("Gravity","200","500","5",String(this.gravity),v=>{this.gravity=v})
    add("Drag","1.0","3.0","0.05",String(this.drag),v=>{this.drag=v})
    add("Jet","0.6","1.6","0.05",String(this.jetMult),v=>{this.jetMult=v})
    document.body.appendChild(p);this.panel=p
  }
  showWin(){};hideWin(){}
  drawCabinet(){
    const ctx=this.ctx
    ctx.fillStyle="#d6007e"
    ctx.fillRect(10,10,this.w-20,18)
    ctx.fillRect(10,this.h-110,this.w-20,100)
    ctx.fillStyle="#d6007e"
    ctx.fillRect(10,this.h-60,this.w-20,50)
    ctx.fillStyle="#ffd24a"
    ctx.beginPath();ctx.arc(this.w*0.25,this.h-35,22,0,Math.PI*2);ctx.fill()
    ctx.beginPath();ctx.arc(this.w*0.75,this.h-35,22,0,Math.PI*2);ctx.fill()
    ctx.strokeStyle="#ffc1cc";ctx.lineWidth=6
    ctx.strokeRect(this.bounds.l-8,this.bounds.t-8,this.bounds.r-this.bounds.l+16,this.bounds.b-this.bounds.t+16)
  }
  loop(t){
    const dt=Math.min(1/30,(t-this.last)/1000||0);this.last=t
    const ctx=this.ctx
    ctx.clearRect(0,0,this.w,this.h)
    ctx.fillStyle="#dff4ff";ctx.fillRect(0,0,this.w,this.h)
    this.drawCabinet()
    if(this.leftHeld)this.leftJet.blast(this.rings,1*this.jetMult)
    if(this.rightHeld)this.rightJet.blast(this.rings,1*this.jetMult)
    this.leftJet.draw(ctx);this.rightJet.draw(ctx)
    for(const ring of this.rings){ring.step(dt,this.gravity,this.drag,this.bounds);this.hookCheck(ring);ring.draw(ctx)}
    for(const peg of this.pegs){peg.draw(ctx)}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;if(p.t>=p.life){this.particles.splice(i,1);continue}ctx.fillStyle="rgba(255,255,255,"+(1-p.t/p.life)*0.85+")";ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()}
    requestAnimationFrame(tt=>this.loop(tt))
  }
}
window.addEventListener("DOMContentLoaded",()=>{
  const canvas=document.getElementById("game")
  const scoreEl=document.getElementById("score")
  new Game(canvas,scoreEl)
})
