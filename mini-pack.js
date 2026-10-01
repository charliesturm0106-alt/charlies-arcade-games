'use strict';
const kind=document.body.dataset.game,$=id=>document.getElementById(id),c=$('game'),ctx=c.getContext('2d'),W=c.width,H=c.height;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),lerp=(a,b,t)=>a+(b-a)*t,keys={left:false,right:false};
let mode='ready',state={},score=0,best=+(localStorage.getItem('hs_pack_'+kind)||0),last=performance.now(),soundOn=true,audio=null,toastTimer=0,pointer={down:false,x:0,y:0};
function beep(freq=520,d=.055){if(!soundOn)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=.025;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d);o.stop(audio.currentTime+d+.01)}catch(e){}}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),850)}
function hud(a,b,c1,d){$('l1').textContent=a[0];$('v1').textContent=a[1];$('l2').textContent=b[0];$('v2').textContent=b[1];$('l3').textContent=c1[0];$('v3').textContent=c1[1];$('l4').textContent=d[0];$('v4').textContent=d[1]}
function saveBest(v){if(v>best){best=v;localStorage.setItem('hs_pack_'+kind,String(best));toast('NEW BEST');beep(920,.08)}}
function showOverlay(title,msg,button='Play'){mode=mode==='pause'?'pause':mode;$('title').textContent=title;$('message').textContent=msg;$('start').textContent=button;$('overlay').hidden=false}
function hideOverlay(){$('overlay').hidden=true}
function pause(){if(mode==='play'){mode='pause';showOverlay('Paused','Your run is paused.','Resume')}else if(mode==='pause'){mode='play';hideOverlay();last=performance.now()}}
function finish(title,msg){mode='over';saveBest(Math.floor(score));showOverlay(title,msg+' · Best: '+best,'Play Again')}
function canvasPoint(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function reset(){
 score=0;
 if(kind==='fieldgoal')state={kicks:0,makes:0,distance:25,aim:0,aimDir:1,power:.35,powerDir:1,wind:(Math.random()-.5)*14,kick:null,result:'',resultT:0};
 if(kind==='minigolf')state={hole:0,strokes:0,totalStrokes:0,ball:{x:78,y:520,vx:0,vy:0},drag:null,settled:true,holes:[
  {par:2,start:[78,520],cup:[340,95],blocks:[{x:150,y:270,w:120,h:28}]},
  {par:3,start:[75,510],cup:[335,100],blocks:[{x:90,y:315,w:210,h:24},{x:235,y:190,w:95,h:24}]},
  {par:3,start:[65,520],cup:[350,95],blocks:[{x:150,y:390,w:30,h:140},{x:245,y:190,w:30,h:140}]},
  {par:4,start:[70,505],cup:[330,110],blocks:[{x:70,y:345,w:230,h:24},{x:120,y:215,w:230,h:24}]},
  {par:3,start:[65,510],cup:[345,105],blocks:[{x:150,y:260,w:120,h:95}]}
 ]};loadHole();
 if(kind==='turbo')state={x:W/2,road:0,time:45,gates:[],spawn:.3,passed:0,combo:0,nitro:0,boost:0,speed:245};
 if(kind==='meteor')state={x:W/2,y:H-85,meteors:[],orbs:[],spawn:.35,orbSpawn:3.5,time:0,shield:0,energy:0,combo:0};
 if(kind==='stack')state={blocks:[{x:95,y:570,w:230,h:28}],moving:{x:0,y:542,w:230,h:28,vx:135},level:0,combo:0,camera:0};
 updateHUD()
}
function loadHole(){if(kind!=='minigolf')return;const h=state.holes[state.hole];state.ball={x:h.start[0],y:h.start[1],vx:0,vy:0};state.strokes=0;state.drag=null;state.settled=true}
function start(){reset();mode='play';hideOverlay();last=performance.now();$('pause').disabled=false}
function action(){
 if(mode!=='play')return;
 if(kind==='fieldgoal')kickFieldGoal();
 else if(kind==='turbo'&&state.nitro>=100){state.nitro=0;state.boost=3;toast('BOOST!');beep(760)}
 else if(kind==='meteor'&&state.energy>=100){state.energy=0;state.shield=3.5;toast('SHIELD!');beep(760)}
 else if(kind==='stack')dropBlock();
}
function kickFieldGoal(){
 const s=state;if(s.kick||s.result)return;const dist=s.distance,need=clamp(.42+(dist-25)*.009,.42,.8),accuracy=Math.abs(s.aim+s.wind*.035),powerErr=Math.abs(s.power-need),made=accuracy<.23&&powerErr<.22;
 s.kicks++;if(made){s.makes++;score+=100+dist*2;beep(820);s.result='GOOD!'}else{beep(210);s.result='MISS';}
 s.kick={t:0,made,startX:W/2,startY:500,targetX:W/2+s.aim*130+s.wind*2,targetY:155};s.resultT=1.2;
}
function dropBlock(){
 const s=state,m=s.moving,base=s.blocks[s.blocks.length-1],left=Math.max(m.x,base.x),right=Math.min(m.x+m.w,base.x+base.w),overlap=right-left;
 if(overlap<=0){finish('Tower Fell','You stacked '+s.level+' blocks');return}
 const perfect=Math.abs((m.x+m.w/2)-(base.x+base.w/2))<4;const w=perfect?base.w:overlap,x=perfect?base.x:left;
 s.blocks.push({x,y:m.y,w,h:m.h});s.level++;score=s.level*100+s.combo*20;if(perfect){s.combo++;toast('PERFECT ×'+s.combo);beep(880)}else{s.combo=0;beep(520)}
 const speed=Math.min(300,135+s.level*13),dir=s.level%2?1:-1;s.moving={x:dir>0?0:W-w,y:m.y-28,w,h:28,vx:speed*dir};
 if(s.moving.y<190){for(const b of s.blocks)b.y+=28;s.moving.y+=28}
 updateHUD()
}
function update(dt){
 if(kind==='fieldgoal')updateField(dt);
 if(kind==='minigolf')updateGolf(dt);
 if(kind==='turbo')updateTurbo(dt);
 if(kind==='meteor')updateMeteor(dt);
 if(kind==='stack')updateStack(dt);
 updateHUD()
}
function updateField(dt){
 const s=state;if(!s.kick&&!s.result){s.aim+=s.aimDir*dt*(.75+s.distance*.006);if(Math.abs(s.aim)>1){s.aim=clamp(s.aim,-1,1);s.aimDir*=-1}s.power+=s.powerDir*dt*.72;if(s.power>.98||s.power<.12){s.power=clamp(s.power,.12,.98);s.powerDir*=-1}}
 if(s.kick){s.kick.t+=dt*1.35;if(s.kick.t>=1){s.kick=null}}
 if(s.result){s.resultT-=dt;if(s.resultT<=0){s.result='';if(s.kicks>=10){score+=s.makes*250;finish('Drive Complete','You made '+s.makes+' of 10 kicks');return}s.distance=25+Math.floor(s.kicks/2)*7;s.wind=(Math.random()-.5)*(12+s.distance*.12)}}
}
function circleRect(cx,cy,r,o){const x=clamp(cx,o.x,o.x+o.w),y=clamp(cy,o.y,o.y+o.h);return Math.hypot(cx-x,cy-y)<r}
function updateGolf(dt){
 const s=state,b=s.ball,h=s.holes[s.hole];if(!s.settled){let nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;const r=10;if(nx<r||nx>W-r){b.vx*=-.72;nx=clamp(nx,r,W-r)}if(ny<r||ny>H-r){b.vy*=-.72;ny=clamp(ny,r,H-r)}
  for(const o of h.blocks){if(circleRect(nx,ny,r,o)){const px=b.x,py=b.y,hitX=px<o.x||px>o.x+o.w;if(hitX)b.vx*=-.74;else b.vy*=-.74;nx=b.x+b.vx*dt;ny=b.y+b.vy*dt;break}}
  b.x=nx;b.y=ny;const drag=Math.pow(.985,dt*60);b.vx*=drag;b.vy*=drag;const sp=Math.hypot(b.vx,b.vy);
  if(Math.hypot(b.x-h.cup[0],b.y-h.cup[1])<14&&sp<90){score+=Math.max(150,950-s.strokes*110)+h.par*40;s.totalStrokes+=s.strokes;s.hole++;beep(900,.09);if(s.hole>=s.holes.length){finish('Course Complete','Total strokes: '+s.totalStrokes);return}loadHole();toast('HOLE '+(s.hole+1))}
  else if(sp<7){b.vx=b.vy=0;s.settled=true}
 }
}
function updateTurbo(dt){
 const s=state;s.time-=dt;if(s.time<=0){score+=s.passed*25;finish('Time!','You cleared '+s.passed+' gates');return}s.boost=Math.max(0,s.boost-dt);const steer=((keys.right?1:0)-(keys.left?1:0))*270;s.x=clamp(s.x+steer*dt,55,W-55);const sp=(s.speed+Math.min(115,s.passed*3))*(s.boost?1.28:1);s.road=(s.road+sp*dt)%70;s.spawn-=dt;if(s.spawn<=0){s.gates.push({y:-30,c:95+Math.random()*(W-190),w:125-Math.min(35,s.passed*.6),checked:false});s.spawn=.92+Math.random()*.26}
 for(const g of s.gates){g.y+=sp*dt;if(!g.checked&&g.y>490){g.checked=true;if(Math.abs(s.x-g.c)<g.w/2-18){s.passed++;s.combo++;score+=50+s.combo*10;s.nitro=Math.min(100,s.nitro+18);beep(620)}else{s.combo=0;s.time=Math.max(0,s.time-2);toast('-2 SEC');beep(190)}}}s.gates=s.gates.filter(g=>g.y<H+45)
}
function updateMeteor(dt){
 const s=state;s.time+=dt;s.shield=Math.max(0,s.shield-dt);score+=dt*(8+s.combo*.2);const steer=((keys.right?1:0)-(keys.left?1:0))*300;s.x=clamp(s.x+steer*dt,28,W-28);s.spawn-=dt;if(s.spawn<=0){const r=11+Math.random()*18;s.meteors.push({x:r+Math.random()*(W-r*2),y:-35,r,vy:145+Math.min(220,s.time*4)+Math.random()*75,vx:(Math.random()-.5)*30});s.spawn=Math.max(.18,.64-s.time*.004)}
 s.orbSpawn-=dt;if(s.orbSpawn<=0){s.orbs.push({x:35+Math.random()*(W-70),y:-20,r:9});s.orbSpawn=2.5+Math.random()*2.4}
 for(const m of s.meteors){m.x+=m.vx*dt;m.y+=m.vy*dt;if(Math.hypot(m.x-s.x,m.y-s.y)<m.r+18){m.dead=true;if(s.shield){score+=30;s.combo++;beep(700)}else{finish('Impact!','You survived '+s.time.toFixed(1)+' seconds');return}}else if(!m.passed&&m.y>s.y+35){m.passed=true;s.combo++;score+=12}}
 for(const o of s.orbs){o.y+=(165+Math.min(100,s.time*2))*dt;if(Math.hypot(o.x-s.x,o.y-s.y)<28){o.dead=true;s.energy=Math.min(100,s.energy+34);score+=25;beep(760)}}s.meteors=s.meteors.filter(m=>!m.dead&&m.y<H+50);s.orbs=s.orbs.filter(o=>!o.dead&&o.y<H+30)
}
function updateStack(dt){const s=state;s.moving.x+=s.moving.vx*dt;if(s.moving.x<0){s.moving.x=0;s.moving.vx=Math.abs(s.moving.vx)}if(s.moving.x+s.moving.w>W){s.moving.x=W-s.moving.w;s.moving.vx=-Math.abs(s.moving.vx)}}
function updateHUD(){
 const s=state;
 if(kind==='fieldgoal')hud(['MAKES',s.makes],['KICKS',s.kicks+'/10'],['DIST',s.distance+' yd'],['BEST',best]);
 if(kind==='minigolf')hud(['HOLE',(s.hole+1)+'/5'],['STROKES',s.strokes],['PAR',s.holes[s.hole]?.par||'-'],['BEST',best]);
 if(kind==='turbo')hud(['GATES',s.passed],['COMBO','×'+s.combo],['TIME',Math.max(0,s.time).toFixed(1)],['BEST',best]);
 if(kind==='meteor')hud(['SCORE',Math.floor(score)],['COMBO','×'+s.combo],['SHIELD',s.shield>0?s.shield.toFixed(1)+'s':Math.floor(s.energy)+'%'],['BEST',best]);
 if(kind==='stack')hud(['LEVEL',s.level],['COMBO','×'+s.combo],['WIDTH',Math.round(s.moving.w)],['BEST',best])
}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function draw(){
 ctx.clearRect(0,0,W,H);
 if(kind==='fieldgoal')drawField();
 if(kind==='minigolf')drawGolf();
 if(kind==='turbo')drawTurbo();
 if(kind==='meteor')drawMeteor();
 if(kind==='stack')drawStack()
}
function drawField(){
 const s=state;ctx.fillStyle='#174a2c';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;for(let y=90;y<H;y+=58){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.fillStyle='#fff';ctx.font='700 10px system-ui';ctx.textAlign='center';for(let y=120,n=10;y<470;y+=58,n+=10)ctx.fillText(n,W/2,y);
 ctx.strokeStyle='#ffd95a';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(130,175);ctx.lineTo(130,70);ctx.moveTo(290,175);ctx.lineTo(290,70);ctx.moveTo(130,175);ctx.lineTo(290,175);ctx.stroke();
 const aimX=W/2+s.aim*130;ctx.strokeStyle='#77e8ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(aimX,510);ctx.lineTo(aimX,205);ctx.stroke();ctx.fillStyle='#77e8ff';ctx.fillRect(aimX-4,490,8,18);
 ctx.fillStyle='#0b1720';ctx.fillRect(35,540,350,18);ctx.fillStyle='#51e498';ctx.fillRect(35,540,350*s.power,18);ctx.strokeStyle='#fff4';ctx.strokeRect(35,540,350,18);
 ctx.fillStyle=s.wind>0?'#ffdf76':'#7cecff';ctx.font='900 13px system-ui';ctx.textAlign='left';ctx.fillText('WIND '+(s.wind>0?'→ ':'← ')+Math.abs(s.wind).toFixed(1),25,35);
 let bx=W/2,by=500;if(s.kick){const t=clamp(s.kick.t,0,1);bx=lerp(s.kick.startX,s.kick.targetX,t);by=lerp(s.kick.startY,s.kick.targetY,t)-Math.sin(t*Math.PI)*150}ctx.fillStyle='#7a3c18';ctx.beginPath();ctx.ellipse(bx,by,9,14,.2,0,Math.PI*2);ctx.fill();
 if(s.result){ctx.fillStyle='#06110dcc';ctx.fillRect(0,235,W,88);ctx.fillStyle=s.result==='GOOD!'?'#62efa0':'#ff7688';ctx.font='1000 46px system-ui';ctx.textAlign='center';ctx.fillText(s.result,W/2,292)}
}
function drawGolf(){
 const s=state,h=s.holes[s.hole];ctx.fillStyle='#2e7b49';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#e8f5dc';ctx.lineWidth=4;ctx.strokeRect(18,18,W-36,H-36);ctx.fillStyle='#d7c58e';for(const o of h.blocks)rounded(o.x,o.y,o.w,o.h,7,'#c9b56f');ctx.fillStyle='#17231b';ctx.beginPath();ctx.arc(h.cup[0],h.cup[1],12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.cup[0],h.cup[1]);ctx.lineTo(h.cup[0],h.cup[1]-48);ctx.stroke();ctx.fillStyle='#ff5d6c';ctx.beginPath();ctx.moveTo(h.cup[0],h.cup[1]-48);ctx.lineTo(h.cup[0]+28,h.cup[1]-38);ctx.lineTo(h.cup[0],h.cup[1]-28);ctx.fill();
 if(s.drag){ctx.strokeStyle='#89e8ff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(s.ball.x,s.ball.y);ctx.lineTo(s.drag.x,s.drag.y);ctx.stroke();ctx.fillStyle='#89e8ff';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText('POWER '+Math.round(clamp(Math.hypot(s.drag.x-s.ball.x,s.drag.y-s.ball.y)/140,0,1)*100)+'%',s.ball.x,s.ball.y-20)}
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.ball.x,s.ball.y,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b7c5d1';ctx.stroke()
}
function drawTurbo(){
 const s=state;ctx.fillStyle='#130f24';ctx.fillRect(0,0,W,H);ctx.fillStyle='#28273a';ctx.fillRect(45,0,W-90,H);ctx.strokeStyle='#5ee9ff';ctx.lineWidth=3;ctx.strokeRect(45,0,W-90,H);ctx.fillStyle='#ffffff33';for(let y=-70;y<H;y+=70){ctx.fillRect(W/2-3,y+s.road,6,34)}
 for(const g of s.gates){ctx.fillStyle='#4ff0a2';ctx.fillRect(g.c-g.w/2,g.y,9,48);ctx.fillRect(g.c+g.w/2-9,g.y,9,48);ctx.fillStyle='#7cf1ff';ctx.fillRect(g.c-g.w/2,g.y,g.w,5)}
 rounded(s.x-19,490,38,70,9,'#ff7a4f');ctx.fillStyle='#b8ecff';ctx.fillRect(s.x-12,503,24,15);ctx.fillStyle='#141826';ctx.fillRect(s.x-12,536,24,12);if(s.boost){ctx.fillStyle='#68f3ff';ctx.fillRect(s.x-8,560,16,24)}
 ctx.fillStyle='#0a0e18cc';ctx.fillRect(15,15,150,12);ctx.fillStyle='#62eaa2';ctx.fillRect(15,15,150*(s.nitro/100),12)
}
function drawMeteor(){
 const s=state;ctx.fillStyle='#090d22';ctx.fillRect(0,0,W,H);for(let i=0;i<55;i++){ctx.fillStyle=i%5?'#ffffff66':'#8bdcff';ctx.fillRect((i*83)%W,(i*137+s.time*22)%H,2,2)}
 for(const m of s.meteors){ctx.fillStyle='#9d6b47';ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ff8a55';ctx.lineWidth=3;ctx.stroke()}
 for(const o of s.orbs){ctx.fillStyle='#6cecff';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill()}
 ctx.save();ctx.translate(s.x,s.y);ctx.fillStyle='#d6f6ff';ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(19,18);ctx.lineTo(0,10);ctx.lineTo(-19,18);ctx.closePath();ctx.fill();ctx.fillStyle='#63d9ff';ctx.fillRect(-5,10,10,16);ctx.restore();if(s.shield){ctx.strokeStyle='#68efff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,31,0,Math.PI*2);ctx.stroke()}
}
function drawStack(){
 const s=state;ctx.fillStyle='#101629';ctx.fillRect(0,0,W,H);const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#191f39');grad.addColorStop(1,'#0b1020');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);for(let i=0;i<s.blocks.length;i++){const b=s.blocks[i],h=(i*47)%360;ctx.fillStyle='hsl('+h+' 75% 60%)';rounded(b.x,b.y,b.w,b.h,4,ctx.fillStyle)}ctx.fillStyle='#65e3ff';rounded(s.moving.x,s.moving.y,s.moving.w,s.moving.h,4,'#65e3ff');ctx.fillStyle='#ffffff99';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText('TAP / SPACE TO DROP',W/2,48)
}
c.addEventListener('pointerdown',e=>{if(mode!=='play')return;const p=canvasPoint(e);pointer.down=true;pointer.x=p.x;pointer.y=p.y;if(kind==='minigolf'){const s=state;if(s.settled&&Math.hypot(p.x-s.ball.x,p.y-s.ball.y)<48)s.drag={x:p.x,y:p.y}}else if(kind==='stack')action()});
c.addEventListener('pointermove',e=>{if(!pointer.down||mode!=='play')return;const p=canvasPoint(e);pointer.x=p.x;pointer.y=p.y;if(kind==='minigolf'&&state.drag)state.drag={x:p.x,y:p.y}});
function pointerUp(e){if(!pointer.down)return;pointer.down=false;if(kind==='minigolf'&&state.drag&&mode==='play'){const s=state,p=canvasPoint(e),dx=s.ball.x-p.x,dy=s.ball.y-p.y,mag=clamp(Math.hypot(dx,dy),0,145);if(mag>10){const k=mag/Math.max(1,Math.hypot(dx,dy))*3.15;s.ball.vx=dx*k;s.ball.vy=dy*k;s.settled=false;s.strokes++;beep(430)}s.drag=null}}
c.addEventListener('pointerup',pointerUp);c.addEventListener('pointercancel',()=>{pointer.down=false;if(kind==='minigolf')state.drag=null});
function hold(id,key){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);keys[key]=true});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>keys[key]=false))}
hold('left','left');hold('right','right');$('action').onclick=action;
$('start').onclick=()=>mode==='pause'?pause():start();$('pause').onclick=pause;$('restart').onclick=start;$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent='Sound: '+(soundOn?'On':'Off')};
document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['a','arrowleft'].includes(k))keys.left=true;if(['d','arrowright'].includes(k))keys.right=true;if((k===' '||k==='arrowup')&&!e.repeat){e.preventDefault();action()}if(k==='p'&&!e.repeat){e.preventDefault();pause()}});
document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(['a','arrowleft'].includes(k))keys.left=false;if(['d','arrowright'].includes(k))keys.right=false});
window.addEventListener('blur',()=>{keys.left=keys.right=false;if(mode==='play')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause()});
const labels={fieldgoal:['Field Goal Frenzy','Tap KICK when your aim and power line up. Wind and distance get tougher every two attempts.','KICK'],minigolf:['Mini Golf','Drag backward from the ball and release to shoot. Finish five holes in as few strokes as possible.','RESET BALL'],turbo:['Turbo Slalom','Auto-accelerate through neon gates. Steer with A/D or touch and earn Nitro from clean gates.','BOOST'],meteor:['Meteor Dodge','Dodge meteors, collect energy, and trigger a shield when the meter is full.','SHIELD'],stack:['Stack Tower','Drop moving blocks onto the tower. Perfect drops keep the full width and build combo.','DROP']};
$('title').textContent=labels[kind][0];$('message').textContent=labels[kind][1];$('action').textContent=labels[kind][2];
if(kind==='minigolf'){$('left').style.display='none';$('right').style.display='none';$('action').onclick=()=>{if(mode==='play'){loadHole();toast('BALL RESET')}}}
if(kind==='fieldgoal'||kind==='stack'){$('left').style.display='none';$('right').style.display='none'}
reset();requestAnimationFrame(function frame(now){const dt=Math.min(.04,(now-last)/1000);last=now;if(mode==='play')update(dt);draw();requestAnimationFrame(frame)});