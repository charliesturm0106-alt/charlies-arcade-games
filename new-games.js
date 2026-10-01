'use strict';
const kind=document.body.dataset.game,canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id),W=400,H=540,keys={};let mode='ready',score=0,state={},last=0,elapsed=0;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function clearKeys(){for(const k of Object.keys(keys))keys[k]=false}
function hud(){ $('score').textContent=kind==='breakout'?`Score: ${score} · Lives: ${state.lives}`:`Score: ${score}` }
function reset(){score=0;elapsed=0;clearKeys();
 if(kind==='breakout')state={x:155,bx:200,by:440,vx:145,vy:-245,lives:3,bricks:Array.from({length:30},(_,i)=>({x:15+(i%6)*63,y:55+Math.floor(i/6)*27,w:55,h:18,alive:true}))};
 if(kind==='flappy')state={y:250,vy:0,pipes:[],spawn:.7};
 if(kind==='traffic')state={lane:1,cars:[],spawn:1,road:0};
 if(kind==='space')state={x:180,bullets:[],enemies:[],shots:[],spawn:.6,cool:0};
 hud();draw();
}
function start(){reset();mode='playing';$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause';last=performance.now()}
function finish(won=false){mode='over';clearKeys();$('overlay').hidden=false;$('message').textContent=won?'You cleared every brick!':'Game over';$('detail').textContent=`Final score: ${score}`;$('start').textContent='Play again';$('pause').disabled=true}
function pause(){if(!['playing','paused'].includes(mode))return;mode=mode==='playing'?'paused':'playing';clearKeys();$('pause').textContent=mode==='paused'?'Resume':'Pause';$('overlay').hidden=mode!=='paused';if(mode==='paused'){$('message').textContent='Paused';$('detail').textContent='Ready when you are.';$('start').textContent='Resume'}last=performance.now()}
function flap(){if(mode==='playing'&&kind==='flappy')state.vy=-290}
function lane(dir){if(mode==='playing'&&kind==='traffic')state.lane=clamp(state.lane+dir,0,2)}
function update(dt){elapsed+=dt;const s=state;const move=(keys.right?1:0)-(keys.left?1:0);
 if(kind==='breakout'){
 s.x=clamp(s.x+move*340*dt,0,W-90);const oldY=s.by;s.bx+=s.vx*dt;s.by+=s.vy*dt;
 if(s.bx<8||s.bx>392){s.bx=clamp(s.bx,8,392);s.vx*=-1}if(s.by<8){s.by=8;s.vy=Math.abs(s.vy)}
 if(s.vy>0&&oldY+8<=490&&s.by+8>=490&&s.bx+8>=s.x&&s.bx-8<=s.x+90){s.by=482;const angle=(s.bx-(s.x+45))/45;s.vx=angle*240;s.vy=-Math.sqrt(320*320-s.vx*s.vx)}
 for(const b of s.bricks)if(b.alive&&hit({x:s.bx-8,y:s.by-8,w:16,h:16},b)){b.alive=false;score+=10;if(oldY+8<=b.y||oldY-8>=b.y+b.h)s.vy*=-1;else s.vx*=-1;break}
 if(s.bricks.every(b=>!b.alive)){finish(true);return}if(s.by>550){if(--s.lives===0){finish();return}s.bx=s.x+45;s.by=440;s.vx=145;s.vy=-245}
 }
 if(kind==='flappy'){
 s.vy+=760*dt;s.y+=s.vy*dt;s.spawn-=dt;if(s.spawn<=0){s.pipes.push({x:420,gap:100+Math.random()*225,passed:false});s.spawn=1.65}
 for(const p of s.pipes){p.x-=165*dt;if(!p.passed&&p.x+60<88){p.passed=true;score++}if(100+12>p.x&&100-12<p.x+60&&(s.y-12<p.gap||s.y+12>p.gap+160)){finish();return}}
 s.pipes=s.pipes.filter(p=>p.x>-70);if(s.y<12||s.y>H-12){finish();return}
 }
 if(kind==='traffic'){
 const speed=190+Math.min(160,elapsed*4);s.road=(s.road+speed*dt)%60;s.spawn-=dt;
 if(s.spawn<=0){s.cars.push({lane:Math.floor(Math.random()*3),y:-90});s.spawn=Math.max(.65,1.15-elapsed*.008)}
 for(const c of s.cars){c.y+=speed*dt;if(c.lane===s.lane&&c.y+72>440&&c.y<512){finish();return}if(c.y>H&&!c.passed){c.passed=true;score++}}s.cars=s.cars.filter(c=>c.y<H+90);
 }
 if(kind==='space'){
 s.x=clamp(s.x+move*300*dt,12,352);s.cool-=dt;if(keys.fire&&s.cool<=0){s.bullets.push({x:s.x+15,y:460,w:6,h:16});s.cool=.18}
 s.spawn-=dt;if(s.spawn<=0){s.enemies.push({x:20+Math.random()*322,y:-40,w:38,h:30,fire:1+Math.random()});s.spawn=Math.max(.38,1-elapsed*.01)}
 for(const b of s.bullets)b.y-=470*dt;
 for(const e of s.enemies){e.y+=(55+Math.min(65,elapsed))*dt;e.fire-=dt;if(e.fire<=0){s.shots.push({x:e.x+16,y:e.y+30,w:6,h:12});e.fire=2}for(const b of s.bullets)if(!b.dead&&!e.dead&&hit(b,e)){b.dead=true;e.dead=true;score+=10}if(!e.dead&&(e.y>H||hit(e,{x:s.x,y:460,w:36,h:32}))){finish();return}}
 for(const b of s.shots){b.y+=245*dt;if(hit(b,{x:s.x,y:460,w:36,h:32})){finish();return}}
 s.bullets=s.bullets.filter(b=>!b.dead&&b.y>-20);s.enemies=s.enemies.filter(e=>!e.dead);s.shots=s.shots.filter(b=>b.y<H);
 }hud();
}
function car(x,y,color){rect(x,y,48,72,color);rect(x+8,y+12,32,17,'#b8eaff');rect(x+8,y+46,32,12,'#17264a');rect(x-4,y+10,5,16,'#090b16');rect(x+47,y+10,5,16,'#090b16');rect(x-4,y+48,5,16,'#090b16');rect(x+47,y+48,5,16,'#090b16')}
function draw(){rect(0,0,W,H,'#10142d');const s=state;
 if(kind==='breakout'){s.bricks.forEach((b,i)=>{if(b.alive)rect(b.x,b.y,b.w,b.h,['#ff628a','#ffae4d','#ffe76b','#5aebad','#69c9ff'][Math.floor(i/6)])});rect(s.x,490,90,12,'#fff');circle(s.bx,s.by,8,'#ffe76b')}
 if(kind==='flappy'){rect(0,0,W,H,'#16465f');for(const p of s.pipes){rect(p.x,0,60,p.gap,'#43d997');rect(p.x,p.gap+160,60,H-p.gap-160,'#43d997');rect(p.x-4,p.gap-16,68,16,'#93f4b8');rect(p.x-4,p.gap+160,68,16,'#93f4b8')}circle(100,s.y,13,'#ffe45a');circle(104,s.y-4,3,'#172345');rect(110,s.y,10,5,'#ff985a')}
 if(kind==='traffic'){rect(20,0,360,H,'#292d42');rect(17,0,3,H,'#fff');rect(380,0,3,H,'#fff');for(let y=-60;y<H;y+=60){rect(138,y+s.road,4,30,'#d8deef');rect(258,y+s.road,4,30,'#d8deef')}s.cars.forEach(c=>car(56+c.lane*120,c.y,'#ff657e'));car(56+s.lane*120,440,'#54e6e2')}
 if(kind==='space'){for(let i=0;i<40;i++)rect((i*137)%400,(i*73+elapsed*25)%H,2,2,'#8793c2');rect(s.x+14,454,8,10,'#92eaff');rect(s.x,470,36,22,'#64daf5');rect(s.x+11,462,14,28,'#c9f9ff');s.bullets.forEach(b=>rect(b.x,b.y,b.w,b.h,'#fff39a'));s.shots.forEach(b=>rect(b.x,b.y,b.w,b.h,'#ff6788'));s.enemies.forEach(e=>{rect(e.x,e.y,e.w,e.h,'#bf85ff');rect(e.x+7,e.y+9,6,6,'#10142d');rect(e.x+25,e.y+9,6,6,'#10142d')})}
}
function frame(now){const dt=Math.min((now-last)/1000,.04);last=now;if(mode==='playing'){let remaining=dt;while(remaining>0&&mode==='playing'){const step=Math.min(remaining,1/120);update(step);remaining-=step}}draw();requestAnimationFrame(frame)}
$('start').onclick=()=>mode==='paused'?pause():start();$('restart').onclick=start;$('pause').onclick=pause;
function bindHold(id,key){const b=$(id);if(!b)return;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[key]=true;if(key==='left')lane(-1);if(key==='right')lane(1)});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys[key]=false);b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();keys[key]=true;if(key==='left')lane(-1);if(key==='right')lane(1)}});b.addEventListener('keyup',()=>keys[key]=false);b.addEventListener('blur',()=>keys[key]=false)}
bindHold('left','left');bindHold('right','right');bindHold('fire','fire');if($('flap'))$('flap').onclick=flap;
document.addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON')return;const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup',' ','a','d','p'].includes(k))e.preventDefault();if(k==='p'&&!e.repeat)pause();if(k==='a'||k==='arrowleft'){keys.left=true;if(!e.repeat)lane(-1)}if(k==='d'||k==='arrowright'){keys.right=true;if(!e.repeat)lane(1)}if(k===' '||k==='arrowup'){keys.fire=true;if(!e.repeat)flap()}});
document.addEventListener('keyup',e=>{if(['a','ArrowLeft'].includes(e.key))keys.left=false;if(['d','ArrowRight'].includes(e.key))keys.right=false;if([' ','ArrowUp'].includes(e.key))keys.fire=false});
function point(e){if(mode!=='playing')return;if(kind==='breakout'){const r=canvas.getBoundingClientRect();state.x=clamp((e.clientX-r.left)*W/r.width-45,0,310)}}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);point(e);flap()});canvas.addEventListener('pointermove',e=>{if(e.buttons)point(e)});
window.addEventListener('blur',()=>{clearKeys();if(mode==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause()});
reset();requestAnimationFrame(frame);
