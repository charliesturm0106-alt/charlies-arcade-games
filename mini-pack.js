'use strict';
const kind=document.body.dataset.game,$=id=>document.getElementById(id),c=$('game'),ctx=c.getContext('2d'),W=c.width,H=c.height;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),lerp=(a,b,t)=>a+(b-a)*t,keys={left:false,right:false},diffNames=['ROOKIE','PRO','HARD','LEGEND'];
let mode='ready',state={},score=0,best=+(localStorage.getItem('hs_pack_'+kind)||0),difficulty=clamp(+(localStorage.getItem('diff_pack_'+kind)||1),0,3),last=performance.now(),soundOn=true,audio=null,toastTimer=0,pointer={down:false,x:0,y:0};
const diffCfg=[
 {speed:.82,pressure:.78,window:1.22,reward:.86},
 {speed:1,pressure:1,window:1,reward:1},
 {speed:1.18,pressure:1.22,window:.82,reward:1.22},
 {speed:1.38,pressure:1.48,window:.66,reward:1.48}
];
function setupChrome(){
 const d=document.createElement('div');d.className='difficulty';d.innerHTML='<span>DIFFICULTY</span><input id="difficulty" type="range" min="0" max="3" step="1" value="'+difficulty+'" aria-label="Difficulty"><strong id="difficultyName">'+diffNames[difficulty]+'</strong>';
 const hud=document.querySelector('.hud');hud.parentNode.insertBefore(d,hud);$('difficulty').addEventListener('input',e=>{if(mode==='play'||mode==='pause'){e.target.value=difficulty;toast('Change difficulty before starting');return}difficulty=+e.target.value;localStorage.setItem('diff_pack_'+kind,String(difficulty));$('difficultyName').textContent=diffNames[difficulty];reset()});
 const meter=document.createElement('div');meter.className='sideMeter';meter.id='sideMeter';meter.innerHTML='<span class="sideMeterLabel" id="meterLabel">POWER</span><div class="sideMeterTrack"><div class="sideMeterFill" id="meterFill"></div><div class="sideMeterZone" id="meterZone"></div></div><strong class="sideMeterValue" id="meterValue">0%</strong><span class="sideMeterHint" id="meterHint"></span>';document.querySelector('.stage').appendChild(meter)
}
setupChrome();
function cfg(){return diffCfg[difficulty]}
function setMeter(label,value,show=true,zone=null,hint=''){const el=$('sideMeter');el.classList.toggle('show',show);$('meterLabel').textContent=label;$('meterFill').style.height=clamp(value,0,100)+'%';$('meterValue').textContent=Math.round(clamp(value,0,100))+'%';$('meterHint').textContent=hint;if(zone===null){$('meterZone').style.display='none'}else{$('meterZone').style.display='block';$('meterZone').style.bottom=clamp(zone*100-3,2,92)+'%'}}
function beep(freq=520,d=.055){if(!soundOn)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=.025;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d);o.stop(audio.currentTime+d+.01)}catch(e){}}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),900)}
function hud(a,b,c1,d){$('l1').textContent=a[0];$('v1').textContent=a[1];$('l2').textContent=b[0];$('v2').textContent=b[1];$('l3').textContent=c1[0];$('v3').textContent=c1[1];$('l4').textContent=d[0];$('v4').textContent=d[1]}
function saveBest(v){if(v>best){best=v;localStorage.setItem('hs_pack_'+kind,String(best));toast('NEW BEST');beep(920,.08)}}
function showOverlay(title,msg,button='Play'){mode=mode==='pause'?'pause':mode;$('title').textContent=title;$('message').textContent=msg;$('start').textContent=button;$('overlay').hidden=false}
function hideOverlay(){$('overlay').hidden=true}
function pause(){if(mode==='play'){mode='pause';showOverlay('Paused','Your run is paused.','Resume')}else if(mode==='pause'){mode='play';hideOverlay();last=performance.now()}}
function finish(title,msg){mode='over';saveBest(Math.floor(score));showOverlay(title,msg+' · Best: '+best,'Play Again');$('difficulty').disabled=false}
function canvasPoint(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function reset(){
 score=0;const d=cfg();
 if(kind==='fieldgoal')state={kicks:0,makes:0,distance:28,aim:0,aimDir:1,power:.32,powerDir:1,wind:(Math.random()-.5)*(10+d.pressure*8),kick:null,result:'',resultT:0,streak:0,pressurePulse:0};
 if(kind==='minigolf')state={hole:0,strokes:0,totalStrokes:0,ball:{x:78,y:520,vx:0,vy:0},drag:null,settled:true,penalty:0,holes:[
  {name:'Bank Alley',par:2,start:[72,520],cup:[345,100],blocks:[{x:148,y:282,w:130,h:26}],sand:[{x:55,y:180,w:95,h:80}],water:[]},
  {name:'Twin Walls',par:3,start:[70,510],cup:[335,95],blocks:[{x:82,y:330,w:215,h:24},{x:238,y:205,w:100,h:24}],sand:[],water:[{x:35,y:205,w:110,h:85}]},
  {name:'Needle',par:3,start:[65,520],cup:[350,95],blocks:[{x:145,y:385,w:30,h:150},{x:250,y:185,w:30,h:150}],sand:[{x:190,y:270,w:50,h:120}],water:[]},
  {name:'Switchback',par:4,start:[70,505],cup:[332,108],blocks:[{x:70,y:352,w:230,h:24},{x:120,y:218,w:230,h:24}],sand:[{x:292,y:380,w:78,h:90}],water:[{x:35,y:100,w:92,h:95}]},
  {name:'Final Island',par:4,start:[62,510],cup:[345,102],blocks:[{x:148,y:270,w:124,h:92}],sand:[{x:290,y:150,w:90,h:110}],water:[{x:35,y:180,w:95,h:155}]}
 ]};loadHole();
 if(kind==='turbo')state={x:W/2,road:0,time:42-difficulty*2,gates:[],hazards:[],spawn:.25,passed:0,combo:0,nitro:0,boost:0,speed:255*d.speed,heat:0};
 if(kind==='meteor')state={x:W/2,y:H-88,meteors:[],orbs:[],spawn:.28,orbSpawn:3.2,time:0,shield:0,energy:0,combo:0,lives:difficulty===0?2:1,flash:0};
 if(kind==='stack')state={blocks:[{x:92,y:570,w:236,h:28}],moving:{x:0,y:542,w:236,h:28,vx:(145+difficulty*20)},level:0,combo:0,wind:0,windT:2.4,movingY:0};
 updateHUD();updateMeter()
}
function loadHole(){if(kind!=='minigolf')return;const h=state.holes[state.hole];state.ball={x:h.start[0],y:h.start[1],vx:0,vy:0};state.strokes=0;state.drag=null;state.settled=true}
function start(){reset();mode='play';hideOverlay();last=performance.now();$('pause').disabled=false;$('difficulty').disabled=true}
function action(){
 if(mode!=='play')return;
 if(kind==='fieldgoal')kickFieldGoal();
 else if(kind==='turbo'&&state.nitro>=100){state.nitro=0;state.boost=2.7;toast('NITRO');beep(760)}
 else if(kind==='meteor'&&state.energy>=100){state.energy=0;state.shield=3.2;toast('SHIELD');beep(760)}
 else if(kind==='stack')dropBlock()
}
function kickFieldGoal(){
 const s=state,d=cfg();if(s.kick||s.result)return;const dist=s.distance,need=clamp(.45+(dist-28)*.0095,.45,.86),accuracy=Math.abs(s.aim+s.wind*.038),powerErr=Math.abs(s.power-need),aimWindow=.20*d.window,powerWindow=.18*d.window,made=accuracy<aimWindow&&powerErr<powerWindow;
 s.kicks++;if(made){s.makes++;s.streak++;score+=Math.round((115+dist*2.6+s.streak*18)*d.reward);beep(820);s.result=s.streak>=3?'CLUTCH!':'GOOD!'}else{s.streak=0;beep(210);s.result=powerErr>powerWindow?'POWER MISS':'WIDE'}
 s.kick={t:0,made,startX:W/2,startY:505,targetX:W/2+s.aim*132+s.wind*2.25,targetY:155};s.resultT=1.05
}
function dropBlock(){
 const s=state,d=cfg(),m=s.moving,base=s.blocks[s.blocks.length-1],left=Math.max(m.x,base.x),right=Math.min(m.x+m.w,base.x+base.w),overlap=right-left;
 if(overlap<=0){finish('Tower Fell','You stacked '+s.level+' blocks');return}
 const threshold=Math.max(1.7,4*d.window),perfect=Math.abs((m.x+m.w/2)-(base.x+base.w/2))<threshold,w=perfect?base.w:overlap,x=perfect?base.x:left;
 s.blocks.push({x,y:m.y,w,h:m.h});s.level++;score=Math.round((s.level*110+s.combo*28)*d.reward);if(perfect){s.combo++;toast('PERFECT ×'+s.combo);beep(880)}else{s.combo=0;beep(520)}
 const speed=Math.min(390,(150+s.level*14+difficulty*22))*d.speed,dir=s.level%2?1:-1;s.moving={x:dir>0?0:W-w,y:m.y-28,w,h:28,vx:speed*dir};s.windT=Math.max(.9,2.5-s.level*.04)
 if(s.moving.y<190){for(const b of s.blocks)b.y+=28;s.moving.y+=28}
}
function update(dt){if(kind==='fieldgoal')updateField(dt);if(kind==='minigolf')updateGolf(dt);if(kind==='turbo')updateTurbo(dt);if(kind==='meteor')updateMeteor(dt);if(kind==='stack')updateStack(dt);updateHUD();updateMeter()}
function updateField(dt){
 const s=state,d=cfg();s.pressurePulse+=dt;
 if(!s.kick&&!s.result){s.aim+=s.aimDir*dt*(.82+s.distance*.007)*d.speed;if(Math.abs(s.aim)>1){s.aim=clamp(s.aim,-1,1);s.aimDir*=-1}s.power+=s.powerDir*dt*.82*d.speed;if(s.power>.98||s.power<.08){s.power=clamp(s.power,.08,.98);s.powerDir*=-1}}
 if(s.kick){s.kick.t+=dt*1.45;if(s.kick.t>=1)s.kick=null}
 if(s.result){s.resultT-=dt;if(s.resultT<=0){s.result='';if(s.kicks>=10){score+=Math.round(s.makes*260*d.reward);finish('Drive Complete','You made '+s.makes+' of 10');return}s.distance=28+Math.floor(s.kicks/2)*(7+difficulty);s.wind=(Math.random()-.5)*(11+d.pressure*10+s.distance*.08)}}
}
function pointInRect(x,y,o){return x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h}
function circleRect(cx,cy,r,o){const x=clamp(cx,o.x,o.x+o.w),y=clamp(cy,o.y,o.y+o.h);return Math.hypot(cx-x,cy-y)<r}
function updateGolf(dt){
 const s=state,b=s.ball,h=s.holes[s.hole],d=cfg();if(!s.settled){let nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;const r=9;if(nx<r||nx>W-r){b.vx*=-.70;nx=clamp(nx,r,W-r)}if(ny<r||ny>H-r){b.vy*=-.70;ny=clamp(ny,r,H-r)}
  for(const o of h.blocks){if(circleRect(nx,ny,r,o)){const hitX=b.x<o.x||b.x>o.x+o.w;if(hitX)b.vx*=-.72;else b.vy*=-.72;nx=b.x+b.vx*dt;ny=b.y+b.vy*dt;beep(260,.025);break}}
  b.x=nx;b.y=ny;if(h.water.some(o=>pointInRect(b.x,b.y,o))){s.strokes++;s.penalty++;toast('WATER +1');loadHole();return}
  const inSand=h.sand.some(o=>pointInRect(b.x,b.y,o)),drag=Math.pow(inSand?.955:.986-difficulty*.0015,dt*60);b.vx*=drag;b.vy*=drag;let sp=Math.hypot(b.vx,b.vy);const cupDx=h.cup[0]-b.x,cupDy=h.cup[1]-b.y,cupDist=Math.hypot(cupDx,cupDy),cupR=18-difficulty*.75,catchR=cupR+13;
  if(cupDist<catchR&&sp<240&&cupDist>1){const pull=(1-cupDist/catchR)*(170-difficulty*8);b.vx+=cupDx/cupDist*pull*dt;b.vy+=cupDy/cupDist*pull*dt;b.vx*=Math.pow(.92,dt*60);b.vy*=Math.pow(.92,dt*60);sp=Math.hypot(b.vx,b.vy)}
  const crossedCup=cupDist<cupR&&sp<310;
  if(crossedCup){b.x=h.cup[0];b.y=h.cup[1];b.vx=b.vy=0;score+=Math.round((1050-s.strokes*120+h.par*55)*d.reward);s.totalStrokes+=s.strokes;s.hole++;beep(900,.09);if(s.hole>=s.holes.length){score+=Math.max(0,2500-s.totalStrokes*70);finish('Course Complete','Total strokes: '+s.totalStrokes);return}loadHole();toast('SUNK! · HOLE '+(s.hole+1))}
  else if(sp<6){b.vx=b.vy=0;s.settled=true}
 }
}
function updateTurbo(dt){
 const s=state,d=cfg();s.time-=dt;if(s.time<=0){score+=Math.round(s.passed*30*d.reward);finish('Time!','You cleared '+s.passed+' gates');return}s.boost=Math.max(0,s.boost-dt);s.heat=Math.max(0,s.heat-dt*8);const steer=((keys.right?1:0)-(keys.left?1:0))*285;s.x=clamp(s.x+steer*dt,52,W-52);const sp=(s.speed+Math.min(155,s.passed*4.3))*(s.boost?1.26:1);s.road=(s.road+sp*dt)%70;s.spawn-=dt;if(s.spawn<=0){const width=Math.max(62,124-s.passed*.8-difficulty*10);s.gates.push({y:-35,c:82+Math.random()*(W-164),w:width,checked:false});if(Math.random()<.35+difficulty*.1)s.hazards.push({x:60+Math.random()*(W-120),y:-90,w:24+Math.random()*15,h:32,vy:sp*(.82+Math.random()*.18)});s.spawn=Math.max(.62,.94-difficulty*.08)+Math.random()*.18}
 for(const h of s.hazards){h.y+=h.vy*dt;if(Math.abs(s.x-h.x)<(h.w/2+16)&&Math.abs(525-h.y)<36){h.dead=true;s.time=Math.max(0,s.time-(2+difficulty));s.combo=0;s.heat=100;toast('-'+(2+difficulty)+' SEC');beep(160)}}
 for(const g of s.gates){g.y+=sp*dt;if(!g.checked&&g.y>492){g.checked=true;if(Math.abs(s.x-g.c)<g.w/2-17){s.passed++;s.combo++;score+=Math.round((60+s.combo*12)*d.reward);s.nitro=Math.min(100,s.nitro+15+difficulty*2);beep(620)}else{s.combo=0;s.time=Math.max(0,s.time-(2+difficulty*.5));toast('MISSED GATE');beep(190)}}}s.gates=s.gates.filter(g=>g.y<H+55);s.hazards=s.hazards.filter(h=>!h.dead&&h.y<H+55)
}
function updateMeteor(dt){
 const s=state,d=cfg();s.time+=dt;s.shield=Math.max(0,s.shield-dt);s.flash=Math.max(0,s.flash-dt);score+=dt*(8+s.combo*.35)*d.reward;const steer=((keys.right?1:0)-(keys.left?1:0))*310;s.x=clamp(s.x+steer*dt,26,W-26);s.spawn-=dt;
 if(s.spawn<=0){const r=10+Math.random()*18,type=Math.random()<(difficulty*.09+.08)?'hunter':Math.random()<.18?'fast':'rock';s.meteors.push({x:r+Math.random()*(W-r*2),y:-35,r,vy:(150+Math.min(260,s.time*4.5)+Math.random()*80)*d.speed,vx:(Math.random()-.5)*42,type});s.spawn=Math.max(.12,.61/d.pressure-s.time*.0038)}
 s.orbSpawn-=dt;if(s.orbSpawn<=0){s.orbs.push({x:35+Math.random()*(W-70),y:-20,r:9});s.orbSpawn=2.8+difficulty*.45+Math.random()*2.5}
 for(const m of s.meteors){if(m.type==='hunter')m.vx+=Math.sign(s.x-m.x)*22*dt*d.pressure;m.x+=m.vx*dt;m.y+=m.vy*dt*(m.type==='fast'?1.28:1);if(Math.hypot(m.x-s.x,m.y-s.y)<m.r+17){m.dead=true;if(s.shield){score+=40;s.combo++;beep(700)}else if(s.lives>1){s.lives--;s.flash=.7;toast('HIT · 1 LIFE LEFT');beep(170)}else{finish('Impact!','You survived '+s.time.toFixed(1)+' seconds');return}}else if(!m.passed&&m.y>s.y+35){m.passed=true;s.combo++;score+=14*d.reward}}
 for(const o of s.orbs){o.y+=(170+Math.min(120,s.time*2.2))*dt;if(Math.hypot(o.x-s.x,o.y-s.y)<27){o.dead=true;s.energy=Math.min(100,s.energy+30);score+=28;beep(760)}}s.meteors=s.meteors.filter(m=>!m.dead&&m.y<H+55);s.orbs=s.orbs.filter(o=>!o.dead&&o.y<H+35)
}
function updateStack(dt){const s=state,d=cfg();s.windT-=dt;if(s.windT<=0){s.windT=1.2+Math.random()*1.8;s.wind=(Math.random()-.5)*(18+difficulty*11)}s.moving.vx+=s.wind*dt;s.moving.vx=clamp(s.moving.vx,-420*d.speed,420*d.speed);s.moving.x+=s.moving.vx*dt;if(s.moving.x<0){s.moving.x=0;s.moving.vx=Math.abs(s.moving.vx)}if(s.moving.x+s.moving.w>W){s.moving.x=W-s.moving.w;s.moving.vx=-Math.abs(s.moving.vx)}}
function updateHUD(){const s=state;if(kind==='fieldgoal')hud(['MAKES',s.makes],['KICKS',s.kicks+'/10'],['STREAK','×'+s.streak],['BEST',best]);if(kind==='minigolf')hud(['HOLE',(s.hole+1)+'/5'],['STROKES',s.strokes],['PAR',s.holes[s.hole]?.par||'-'],['BEST',best]);if(kind==='turbo')hud(['GATES',s.passed],['COMBO','×'+s.combo],['TIME',Math.max(0,s.time).toFixed(1)],['BEST',best]);if(kind==='meteor')hud(['SCORE',Math.floor(score)],['COMBO','×'+s.combo],['LIVES',s.lives],['BEST',best]);if(kind==='stack')hud(['LEVEL',s.level],['COMBO','×'+s.combo],['WIDTH',Math.round(s.moving.w)],['BEST',best])}
function updateMeter(){
 if(kind==='fieldgoal'){const need=clamp(.45+(state.distance-28)*.0095,.45,.86);setMeter('POWER',state.power*100,true,need,'target zone')}
 else if(kind==='minigolf'){const p=state.drag?clamp(Math.hypot(state.drag.x-state.ball.x,state.drag.y-state.ball.y)/145,0,1)*100:0;setMeter('POWER',p,true,null,'drag back')}
 else if(kind==='turbo')setMeter('NITRO',state.nitro,true,null,state.nitro>=100?'READY':'clean gates');
 else if(kind==='meteor')setMeter('SHIELD',state.energy,true,null,state.energy>=100?'READY':'collect energy');
 else setMeter('',0,false)
}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function draw(){ctx.clearRect(0,0,W,H);if(kind==='fieldgoal')drawField();if(kind==='minigolf')drawGolf();if(kind==='turbo')drawTurbo();if(kind==='meteor')drawMeteor();if(kind==='stack')drawStack()}
function drawField(){
 const s=state,d=cfg(),sky=ctx.createLinearGradient(0,0,0,210);sky.addColorStop(0,'#13263f');sky.addColorStop(1,'#264c5c');ctx.fillStyle=sky;ctx.fillRect(0,0,W,210);ctx.fillStyle='#132036';ctx.fillRect(0,35,W,80);for(let i=0;i<70;i++){ctx.fillStyle=i%4?'#c9d7e455':'#65d6ff77';ctx.fillRect((i*61)%W,48+(i%5)*11,5,5)}
 ctx.fillStyle='#174a2c';ctx.fillRect(0,115,W,H-115);for(let y=150;y<H;y+=58){ctx.strokeStyle='#ffffff52';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}for(let x=18;x<W;x+=34){ctx.fillStyle='#ffffff20';ctx.fillRect(x,118,2,H-118)}
 ctx.strokeStyle='#ffd95a';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(130,182);ctx.lineTo(130,68);ctx.moveTo(290,182);ctx.lineTo(290,68);ctx.moveTo(130,182);ctx.lineTo(290,182);ctx.stroke();ctx.strokeStyle='#fff5';ctx.lineWidth=2;ctx.strokeRect(145,190,130,18);
 const aimX=W/2+s.aim*132,win=.20*d.window*132;ctx.fillStyle='#68f3a633';ctx.fillRect(W/2-win,188,win*2,320);ctx.strokeStyle='#77e8ff';ctx.lineWidth=3;ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(aimX,510);ctx.lineTo(aimX,205);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle=s.wind>0?'#ffdf76':'#7cecff';ctx.font='900 13px system-ui';ctx.textAlign='left';ctx.fillText('WIND '+(s.wind>0?'→ ':'← ')+Math.abs(s.wind).toFixed(1),22,28);ctx.fillStyle='#ffffffaa';ctx.fillText(s.distance+' YARDS',22,49);
 let bx=W/2,by=505;if(s.kick){const t=clamp(s.kick.t,0,1);bx=lerp(s.kick.startX,s.kick.targetX,t);by=lerp(s.kick.startY,s.kick.targetY,t)-Math.sin(t*Math.PI)*160}ctx.fillStyle='#7a3c18';ctx.beginPath();ctx.ellipse(bx,by,9,14,.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.fillRect(W/2-18,520,36,6);
 if(s.result){ctx.fillStyle='#06110dd8';ctx.fillRect(0,245,W,88);ctx.fillStyle=s.result==='GOOD!'||s.result==='CLUTCH!'?'#62efa0':'#ff7688';ctx.font='1000 42px system-ui';ctx.textAlign='center';ctx.fillText(s.result,W/2,301)}
}
function drawGolf(){
 const s=state,h=s.holes[s.hole],d=cfg();const grass=ctx.createLinearGradient(0,0,W,H);grass.addColorStop(0,'#3a9656');grass.addColorStop(1,'#24673e');ctx.fillStyle=grass;ctx.fillRect(0,0,W,H);for(let y=0;y<H;y+=28){ctx.fillStyle=y%56?'#ffffff08':'#00000008';ctx.fillRect(0,y,W,28)}
 ctx.strokeStyle='#e8f5dc';ctx.lineWidth=4;ctx.strokeRect(18,18,W-36,H-36);for(const o of h.sand)rounded(o.x,o.y,o.w,o.h,18,'#d8c487');for(const o of h.water){rounded(o.x,o.y,o.w,o.h,18,'#2f87b7');ctx.strokeStyle='#7bdfff66';ctx.lineWidth=2;for(let y=o.y+12;y<o.y+o.h;y+=16){ctx.beginPath();ctx.moveTo(o.x+8,y);ctx.lineTo(o.x+o.w-8,y);ctx.stroke()}}for(const o of h.blocks){rounded(o.x,o.y,o.w,o.h,7,'#bda864');ctx.fillStyle='#765f30';ctx.fillRect(o.x+5,o.y+5,o.w-10,4)}
 ctx.fillStyle='#17231b';ctx.beginPath();ctx.arc(h.cup[0],h.cup[1],12*d.window,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.cup[0],h.cup[1]);ctx.lineTo(h.cup[0],h.cup[1]-48);ctx.stroke();ctx.fillStyle='#ff5d6c';ctx.beginPath();ctx.moveTo(h.cup[0],h.cup[1]-48);ctx.lineTo(h.cup[0]+28,h.cup[1]-38);ctx.lineTo(h.cup[0],h.cup[1]-28);ctx.fill();
 ctx.fillStyle='#ffffffbb';ctx.font='1000 12px system-ui';ctx.textAlign='left';ctx.fillText('HOLE '+(s.hole+1)+' · '+h.name.toUpperCase(),24,35);
 if(s.drag){ctx.strokeStyle='#89e8ff';ctx.lineWidth=4;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(s.ball.x,s.ball.y);ctx.lineTo(s.ball.x+(s.ball.x-s.drag.x)*1.35,s.ball.y+(s.ball.y-s.drag.y)*1.35);ctx.stroke();ctx.setLineDash([])}
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.ball.x,s.ball.y,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b7c5d1';ctx.stroke()
}
function drawTurbo(){
 const s=state;const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#17122f');sky.addColorStop(1,'#080b16');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);for(let i=0;i<16;i++){const bw=18+(i%3)*8,bh=70+(i*37)%130,x=(i*41)%W;ctx.fillStyle='#11172b';ctx.fillRect(x,80-bh/2,bw,bh);ctx.fillStyle=i%2?'#6c5dff55':'#42dbff55';for(let yy=10;yy<bh-8;yy+=18)ctx.fillRect(x+5,80-bh/2+yy,bw-10,4)}
 ctx.fillStyle='#28273a';ctx.fillRect(45,0,W-90,H);ctx.fillStyle='#171726';ctx.fillRect(51,0,W-102,H);ctx.strokeStyle='#5ee9ff';ctx.lineWidth=3;ctx.strokeRect(45,0,W-90,H);ctx.fillStyle='#ffffff2d';for(let y=-70;y<H;y+=70)ctx.fillRect(W/2-3,y+s.road,6,34);
 for(const h of s.hazards){rounded(h.x-h.w/2,h.y,h.w,h.h,6,'#ff5f69');ctx.fillStyle='#fff';ctx.fillRect(h.x-3,h.y+7,6,h.h-14)}
 for(const g of s.gates){ctx.shadowColor='#4ff0a2';ctx.shadowBlur=12;ctx.fillStyle='#4ff0a2';ctx.fillRect(g.c-g.w/2,g.y,8,48);ctx.fillRect(g.c+g.w/2-8,g.y,8,48);ctx.fillStyle='#7cf1ff';ctx.fillRect(g.c-g.w/2,g.y,g.w,5);ctx.shadowBlur=0}
 rounded(s.x-19,490,38,70,9,s.heat?'#ff445b':'#ff7a4f');ctx.fillStyle='#b8ecff';ctx.fillRect(s.x-12,503,24,15);ctx.fillStyle='#141826';ctx.fillRect(s.x-12,536,24,12);if(s.boost){ctx.fillStyle='#68f3ff';ctx.fillRect(s.x-8,560,16,28)}
}
function drawMeteor(){
 const s=state;const g=ctx.createRadialGradient(W/2,H*.8,10,W/2,H*.5,430);g.addColorStop(0,'#18245b');g.addColorStop(1,'#070917');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);for(let i=0;i<70;i++){ctx.fillStyle=i%6?'#ffffff66':'#8bdcff';ctx.fillRect((i*83)%W,(i*137+s.time*28)%H,2,2)}
 for(const m of s.meteors){ctx.fillStyle=m.type==='hunter'?'#d95767':m.type==='fast'?'#dc9658':'#9d6b47';ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=m.type==='hunter'?'#ff8ca0':'#ff8a55';ctx.lineWidth=3;ctx.stroke();if(m.type==='fast'){ctx.strokeStyle='#ffad6688';ctx.beginPath();ctx.moveTo(m.x,m.y-m.r);ctx.lineTo(m.x-m.vx*.08,m.y-m.r-40);ctx.stroke()}}
 for(const o of s.orbs){ctx.shadowColor='#6cecff';ctx.shadowBlur=16;ctx.fillStyle='#6cecff';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
 ctx.save();ctx.translate(s.x,s.y);ctx.fillStyle=s.flash?'#ff8b94':'#d6f6ff';ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(19,18);ctx.lineTo(0,10);ctx.lineTo(-19,18);ctx.closePath();ctx.fill();ctx.fillStyle='#63d9ff';ctx.fillRect(-5,10,10,16);ctx.restore();if(s.shield){ctx.strokeStyle='#68efff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,31,0,Math.PI*2);ctx.stroke()}
}
function drawStack(){
 const s=state;const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#31204b');grad.addColorStop(.55,'#14182c');grad.addColorStop(1,'#080b13');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);ctx.fillStyle='#ffffff22';for(let i=0;i<45;i++)ctx.fillRect((i*97)%W,(i*53)%H,2,2);ctx.fillStyle='#0d1320';for(let i=0;i<10;i++){const x=i*48-20,h=90+(i*29)%110;ctx.fillRect(x,H-h,38,h)}
 for(let i=0;i<s.blocks.length;i++){const b=s.blocks[i],h=(i*47)%360;rounded(b.x,b.y,b.w,b.h,4,'hsl('+h+' 75% 60%)');ctx.fillStyle='#ffffff24';ctx.fillRect(b.x+4,b.y+4,b.w-8,4)}rounded(s.moving.x,s.moving.y,s.moving.w,s.moving.h,4,'#65e3ff');ctx.fillStyle='#ffffff99';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText('WIND '+(s.wind>2?'→':s.wind<-2?'←':'•')+' · TAP / SPACE TO DROP',W/2,48)
}
function golfDragPoint(p){const s=state,d=s.drag;if(!d)return p;const rawX=p.x-d.startX,rawY=p.y-d.startY,raw=Math.hypot(rawX,rawY);if(raw<1)return{x:s.ball.x,y:s.ball.y};const scale=1.9,virtual=Math.min(145,raw*scale),ux=rawX/raw,uy=rawY/raw;return{x:s.ball.x+ux*virtual,y:s.ball.y+uy*virtual}}
c.addEventListener('pointerdown',e=>{if(mode!=='play')return;const p=canvasPoint(e);pointer.down=true;pointer.x=p.x;pointer.y=p.y;if(kind==='minigolf'){const s=state;if(s.settled&&Math.hypot(p.x-s.ball.x,p.y-s.ball.y)<48)s.drag={x:s.ball.x,y:s.ball.y,startX:p.x,startY:p.y}}else if(kind==='stack')action()});
c.addEventListener('pointermove',e=>{if(!pointer.down||mode!=='play')return;const p=canvasPoint(e);pointer.x=p.x;pointer.y=p.y;if(kind==='minigolf'&&state.drag){const q=golfDragPoint(p);state.drag.x=q.x;state.drag.y=q.y}});
function pointerUp(e){if(!pointer.down)return;pointer.down=false;if(kind==='minigolf'&&state.drag&&mode==='play'){const s=state,p=canvasPoint(e),q=golfDragPoint(p),dx=s.ball.x-q.x,dy=s.ball.y-q.y,mag=clamp(Math.hypot(dx,dy),0,145);if(mag>10){const k=mag/Math.max(1,Math.hypot(dx,dy))*(3.0+difficulty*.12);s.ball.vx=dx*k;s.ball.vy=dy*k;s.settled=false;s.strokes++;beep(430)}s.drag=null}}
c.addEventListener('pointerup',pointerUp);c.addEventListener('pointercancel',()=>{pointer.down=false;if(kind==='minigolf')state.drag=null});
function hold(id,key){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);keys[key]=true});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>keys[key]=false))}
hold('left','left');hold('right','right');$('action').onclick=action;
$('start').onclick=()=>mode==='pause'?pause():start();$('pause').onclick=pause;$('restart').onclick=start;$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent='Sound: '+(soundOn?'On':'Off')};
document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['a','arrowleft'].includes(k))keys.left=true;if(['d','arrowright'].includes(k))keys.right=true;if((k===' '||k==='arrowup')&&!e.repeat){e.preventDefault();action()}if(k==='p'&&!e.repeat){e.preventDefault();pause()}});
document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(['a','arrowleft'].includes(k))keys.left=false;if(['d','arrowright'].includes(k))keys.right=false});
window.addEventListener('blur',()=>{keys.left=keys.right=false;if(mode==='play')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause()});
const labels={fieldgoal:['Field Goal Frenzy','Difficulty changes wind, timing speed, and the size of the accuracy windows.','KICK'],minigolf:['Mini Golf','Five themed holes now include sand, water, tighter cups, and harder physics.','RESET BALL'],turbo:['Turbo Slalom','Difficulty narrows gates, raises speed, adds hazards, and makes misses more expensive.','NITRO'],meteor:['Meteor Dodge','Harder levels add faster storms, rarer energy, and tracking meteors.','SHIELD'],stack:['Stack Tower','Difficulty increases block speed, wind drift, and shrinks the perfect-drop window.','DROP']};
$('title').textContent=labels[kind][0];$('message').textContent=labels[kind][1];$('action').textContent=labels[kind][2];
if(kind==='minigolf'){$('left').style.display='none';$('right').style.display='none';$('action').onclick=()=>{if(mode==='play'){loadHole();toast('BALL RESET')}}}
if(kind==='fieldgoal'||kind==='stack'){$('left').style.display='none';$('right').style.display='none'}
reset();requestAnimationFrame(function frame(now){const dt=Math.min(.04,(now-last)/1000);last=now;if(mode==='play')update(dt);draw();requestAnimationFrame(frame)});