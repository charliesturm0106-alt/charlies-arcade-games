'use strict';
const kind=document.body.dataset.game,canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id),W=400,H=540,keys={};
let mode='ready',score=0,state={},last=0,elapsed=0,best=+(localStorage.getItem('hs_'+kind)||0),variant=document.body.dataset.variant||'normal';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function clearKeys(){for(const k of Object.keys(keys))keys[k]=false}
function breakoutBricks(level){const rows=Math.min(7,4+level);return Array.from({length:rows*6},(_,i)=>({x:15+(i%6)*63,y:48+Math.floor(i/6)*26,w:55,h:17,alive:true}))}
function hud(){
 if(kind==='breakout')$('score').textContent='Score: '+score+' · Best: '+best+' · Lives: '+state.lives+' · Level: '+state.level;
 else if(kind==='space')$('score').textContent='Score: '+score+' · Best: '+best+' · HP: '+state.hp+' · Wave: '+state.wave;
 else $('score').textContent='Score: '+score+' · Best: '+best;
 if($('variantLabel'))$('variantLabel').textContent=variant.toUpperCase();
}
function reset(){
 score=0;elapsed=0;clearKeys();
 if(kind==='breakout')state={x:155,bx:200,by:440,vx:145,vy:-245,lives:3,level:1,bricks:breakoutBricks(1)};
 if(kind==='flappy')state={y:250,vy:0,pipes:[],spawn:.8};
 if(kind==='space')state={x:180,bullets:[],enemies:[],shots:[],spawn:.6,cool:0,hp:3,wave:1,inv:0};
 hud();draw();
}
function start(){reset();mode='playing';$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause';last=performance.now()}
function finish(won=false){
 mode='over';clearKeys();won?window.NDPolish?.flash():window.NDPolish?.shake();if(score>best){best=score;localStorage.setItem('hs_'+kind,best)}
 $('overlay').hidden=false;$('message').textContent=won?'You cleared the run!':'Game over';$('detail').textContent='Final score: '+score+' · Best: '+best;$('start').textContent='Play again';$('pause').disabled=true;hud()
}
function pause(){if(!['playing','paused'].includes(mode))return;mode=mode==='playing'?'paused':'playing';clearKeys();$('pause').textContent=mode==='paused'?'Resume':'Pause';$('overlay').hidden=mode!=='paused';if(mode==='paused'){$('message').textContent='Paused';$('detail').textContent='Ready when you are.';$('start').textContent='Resume'}last=performance.now()}
function flap(){if(mode==='playing'&&kind==='flappy')state.vy=variant==='chill'?-260:-290}
function update(dt){
 elapsed+=dt;const s=state,move=(keys.right?1:0)-(keys.left?1:0);
 if(kind==='breakout'){
  s.x=clamp(s.x+move*360*dt,0,W-90);const oldY=s.by;s.bx+=s.vx*dt;s.by+=s.vy*dt;
  if(s.bx<8||s.bx>392){s.bx=clamp(s.bx,8,392);s.vx*=-1}if(s.by<8){s.by=8;s.vy=Math.abs(s.vy)}
  if(s.vy>0&&oldY+8<=490&&s.by+8>=490&&s.bx+8>=s.x&&s.bx-8<=s.x+90){s.by=482;const angle=(s.bx-(s.x+45))/45;s.vx=angle*(235+s.level*9);s.vy=-Math.sqrt(Math.max(26000,(325+s.level*12)*(325+s.level*12)-s.vx*s.vx))}
  for(const b of s.bricks)if(b.alive&&hit({x:s.bx-8,y:s.by-8,w:16,h:16},b)){b.alive=false;score+=10*s.level;if(oldY+8<=b.y||oldY-8>=b.y+b.h)s.vy*=-1;else s.vx*=-1;break}
  if(s.bricks.every(b=>!b.alive)){if(s.level>=5){finish(true);return}window.NDPolish?.flash();s.level++;score+=100;s.bricks=breakoutBricks(s.level);s.bx=s.x+45;s.by=440;s.vx=155+s.level*12;s.vy=-(250+s.level*15);hud()}
  if(s.by>550){window.NDPolish?.shake();if(--s.lives===0){finish();return}s.bx=s.x+45;s.by=440;s.vx=145+s.level*8;s.vy=-(245+s.level*12)}
 }
 if(kind==='flappy'){
  const cfg=variant==='chill'?{speed:140,gap:185,grav:680}:variant==='pro'?{speed:195,gap:138,grav:820}:{speed:165,gap:160,grav:760};
  s.vy+=cfg.grav*dt;s.y+=s.vy*dt;s.spawn-=dt;if(s.spawn<=0){s.pipes.push({x:420,gap:92+Math.random()*240,passed:false});s.spawn=variant==='pro'?1.35:1.65}
  for(const p of s.pipes){p.x-=cfg.speed*dt;if(!p.passed&&p.x+60<88){p.passed=true;score++}if(100+12>p.x&&100-12<p.x+60&&(s.y-12<p.gap||s.y+12>p.gap+cfg.gap)){finish();return}}
  s.pipes=s.pipes.filter(p=>p.x>-70);if(s.y<12||s.y>H-12){finish();return}
 }
 if(kind==='space'){
  s.wave=1+Math.floor(elapsed/18);s.inv=Math.max(0,s.inv-dt);s.x=clamp(s.x+move*315*dt,12,352);s.cool-=dt;if(keys.fire&&s.cool<=0){s.bullets.push({x:s.x+15,y:460,w:6,h:16});s.cool=variant==='rapid'?.11:.18}
  const spawnBase=variant==='survival'?.52:.72;s.spawn-=dt;if(s.spawn<=0){s.enemies.push({x:20+Math.random()*322,y:-40,w:38,h:30,fire:.8+Math.random()*1.2,hp:1+(s.wave>4&&Math.random()<.3?1:0)});s.spawn=Math.max(.24,spawnBase-s.wave*.035)}
  for(const b of s.bullets)b.y-=500*dt;
  for(const e of s.enemies){e.y+=(55+s.wave*8)*dt;e.fire-=dt;if(e.fire<=0){s.shots.push({x:e.x+16,y:e.y+30,w:6,h:12});e.fire=Math.max(.65,2-s.wave*.08)}for(const b of s.bullets)if(!b.dead&&!e.dead&&hit(b,e)){b.dead=true;e.hp--;if(e.hp<=0){e.dead=true;score+=10+s.wave*2}}if(!e.dead&&(e.y>H||hit(e,{x:s.x,y:460,w:36,h:32}))&&s.inv<=0){e.dead=true;s.hp--;s.inv=1.1;window.NDPolish?.shake();if(s.hp<=0){finish();return}}}
  for(const b of s.shots){b.y+=(235+s.wave*8)*dt;if(!b.dead&&s.inv<=0&&hit(b,{x:s.x,y:460,w:36,h:32})){b.dead=true;s.hp--;s.inv=1.1;window.NDPolish?.shake();if(s.hp<=0){finish();return}}}
  s.bullets=s.bullets.filter(b=>!b.dead&&b.y>-20);s.enemies=s.enemies.filter(e=>!e.dead);s.shots=s.shots.filter(b=>!b.dead&&b.y<H);
 }
 hud();
}
function car(x,y,color){rect(x,y,48,72,color);rect(x+8,y+12,32,17,'#b8eaff');rect(x+8,y+46,32,12,'#17264a')}
function draw(){
 rect(0,0,W,H,'#10142d');const s=state;
 if(kind==='breakout'){s.bricks.forEach((b,i)=>{if(b.alive)rect(b.x,b.y,b.w,b.h,['#ff628a','#ffae4d','#ffe76b','#5aebad','#69c9ff','#bd7cff','#ff78d3'][Math.floor(i/6)%7])});rect(s.x,490,90,12,'#fff');circle(s.bx,s.by,8,'#ffe76b')}
 if(kind==='flappy'){const cfg=variant==='chill'?185:variant==='pro'?138:160;rect(0,0,W,H,'#16465f');for(const p of s.pipes){rect(p.x,0,60,p.gap,'#43d997');rect(p.x,p.gap+cfg,60,H-p.gap-cfg,'#43d997');rect(p.x-4,p.gap-16,68,16,'#93f4b8');rect(p.x-4,p.gap+cfg,68,16,'#93f4b8')}circle(100,s.y,13,'#ffe45a');circle(104,s.y-4,3,'#172345');rect(110,s.y,10,5,'#ff985a')}
 if(kind==='space'){for(let i=0;i<48;i++)rect((i*137)%400,(i*73+elapsed*28)%H,2,2,'#8793c2');ctx.globalAlpha=s.inv>0&&Math.floor(elapsed*12)%2?0.25:1;rect(s.x+14,454,8,10,'#92eaff');rect(s.x,470,36,22,'#64daf5');rect(s.x+11,462,14,28,'#c9f9ff');ctx.globalAlpha=1;s.bullets.forEach(b=>rect(b.x,b.y,b.w,b.h,'#fff39a'));s.shots.forEach(b=>rect(b.x,b.y,b.w,b.h,'#ff6788'));s.enemies.forEach(e=>{rect(e.x,e.y,e.w,e.h,e.hp>1?'#ff75c8':'#bf85ff');rect(e.x+7,e.y+9,6,6,'#10142d');rect(e.x+25,e.y+9,6,6,'#10142d')})}
}
function frame(now){const dt=Math.min((now-last)/1000,.04);last=now;if(mode==='playing'){let remaining=dt;while(remaining>0&&mode==='playing'){const step=Math.min(remaining,1/120);update(step);remaining-=step}}draw();requestAnimationFrame(frame)}
$('start').onclick=()=>mode==='paused'?pause():start();$('restart').onclick=start;$('pause').onclick=pause;
function bindHold(id,key){const b=$(id);if(!b)return;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[key]=true});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys[key]=false)}
bindHold('left','left');bindHold('right','right');bindHold('fire','fire');if($('flap'))$('flap').onclick=flap;
document.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>{if(mode==='playing')return;variant=b.dataset.variant;document.body.dataset.variant=variant;document.querySelectorAll('[data-variant]').forEach(q=>q.classList.toggle('active',q===b));reset()});
document.addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON')return;const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup',' ','a','d','p'].includes(k))e.preventDefault();if(k==='p'&&!e.repeat)pause();if(k==='a'||k==='arrowleft')keys.left=true;if(k==='d'||k==='arrowright')keys.right=true;if(k===' '||k==='arrowup'){keys.fire=true;if(!e.repeat)flap()}});
document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='a'||k==='arrowleft')keys.left=false;if(k==='d'||k==='arrowright')keys.right=false;if(k===' '||k==='arrowup')keys.fire=false});
function point(e){if(mode!=='playing')return;if(kind==='breakout'){const r=canvas.getBoundingClientRect();state.x=clamp((e.clientX-r.left)*W/r.width-45,0,310)}}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);point(e);flap()});canvas.addEventListener('pointermove',e=>{if(e.buttons)point(e)});
window.addEventListener('blur',()=>{clearKeys();if(mode==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause()});
reset();requestAnimationFrame(frame);