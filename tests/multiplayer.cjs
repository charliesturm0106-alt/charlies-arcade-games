const assert=require('assert/strict'),{randomUUID}=require('crypto');
const WS=require('ws');
const base=process.argv[2]||'http://127.0.0.1:8080';
const tokens=[];let socket;
async function exchange(token,message){const r=await fetch(base+'/mp/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,message})});assert.equal(r.status,200);return (await r.json()).messages}
const token=()=>{const t=randomUUID();tokens.push(t);return t};
(async()=>{try{
 const a=token(),b=token(),code=randomUUID().replace(/-/g,'').slice(0,6).toUpperCase();
 let m=await exchange(a,{type:'create',room:code,name:'Host'});const id=m.find(x=>x.type==='joined').id;
 m=await exchange(a,{type:'create',room:code,name:'Host'});assert.equal(m.find(x=>x.type==='joined').id,id);
 m=await exchange(b,{type:'join',room:code.toLowerCase(),name:'Friend'});assert.equal(m.find(x=>x.type==='joined').players.length,2);
 await exchange(a,{type:'state',x:10,z:20,color:123});m=await exchange(b);assert(m.some(x=>x.type==='snapshot'&&x.players.some(p=>p.id===id&&p.x===10&&p.z===20&&p.color===123)));
 await exchange(b,{type:'state',x:30,z:40,color:456});m=await exchange(a);assert(m.some(x=>x.type==='snapshot'&&x.players.some(p=>p.id!==id&&p.x===30&&p.z===40&&p.color===456)));
 console.log('PASS two HTTPS clients, idempotent create, bidirectional position/paint');
 const received=[];socket=new WS(base.replace(/^http/,'ws')+'/ws?token='+a);socket.on('message',r=>received.push(JSON.parse(r)));
 await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});
 socket.send(JSON.stringify({type:'join',room:code}));
 await new Promise(r=>setTimeout(r,500));assert(received.some(x=>x.type==='joined'&&x.id===id));
 socket.terminate();m=await exchange(a,{type:'create',room:code});assert.equal(m.find(x=>x.type==='joined').id,id);assert.equal(m.find(x=>x.type==='joined').players.length,2);
 console.log('PASS WebSocket to HTTPS session migration without duplicate players');
 for(let i=0;i<4;i++){m=await exchange(token(),{type:'join',room:code});assert(m.some(x=>x.type==='joined'))}
 m=await exchange(token(),{type:'join',room:code});assert(m.some(x=>x.type==='error'&&x.message.includes('full')));
 m=await exchange(a,{type:'join',room:'MISSING'});assert(m.some(x=>x.type==='error'));m=await exchange(a);assert(m.some(x=>x.type==='snapshot'&&x.players.length===6));
 console.log('PASS six-player limit and failed join preserves current room');
 for(const t of tokens)await exchange(t,{type:'leave'});
 const health=await(await fetch(base+'/health')).json();assert.equal(health.version,'1.2.2');console.log('PASS cleanup; health:',JSON.stringify(health));
 }finally{socket?.terminate();for(const t of tokens)await exchange(t,{type:'leave'}).catch(()=>{})}
})().catch(e=>{console.error(e);process.exitCode=1});


