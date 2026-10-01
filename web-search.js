'use strict';
const http = require('http');
const https = require('https');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const CONFIG = path.join(__dirname, 'private', 'oxylabs.json');
function configuration() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    if (typeof c.username !== 'string' || !c.username.trim() || typeof c.password !== 'string' || !c.password) return null;
    return { username: c.username.trim(), password: c.password, port: [8001,8002,8003,8004,8005].includes(Number(c.port)) ? Number(c.port) : 8001 };
  } catch (_) { return null; }
}
function proxyGet(target, config) {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({keepAlive:false});
    agent.createConnection = (_options, callback) => {
      const connect = http.request({hostname:'dc.oxylabs.io', port:config.port, method:'CONNECT', path:target.hostname+':443', headers:{'Proxy-Authorization':'Basic '+Buffer.from(config.username+':'+config.password).toString('base64')}});
      connect.setTimeout(12000, () => connect.destroy(new Error('PROXY_TIMEOUT')));
      connect.once('error', callback);
      connect.once('connect', (response, socket, head) => {
        if(response.statusCode !== 200){socket.destroy();callback(new Error(response.statusCode===407?'PROXY_AUTH':'PROXY_CONNECTION'));return}
        if(head.length)socket.unshift(head);
        const secure=tls.connect({socket,servername:target.hostname,rejectUnauthorized:true});
        secure.setTimeout(12000,()=>secure.destroy(new Error('PROXY_TIMEOUT')));
        secure.once('secureConnect',()=>callback(null,secure));
        secure.once('error',callback);
      });
      connect.end();
    };
    const request=https.get(target,{agent,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/rss+xml,application/xml,text/xml','Accept-Encoding':'identity'}},response=>{
      if(response.statusCode!==200){response.resume();reject(new Error('SEARCH_UPSTREAM'));return}
      let text='',bytes=0;response.setEncoding('utf8');
      response.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>600000)request.destroy(new Error('SEARCH_TOO_LARGE'));else text+=chunk});
      response.on('end',()=>resolve(text));response.on('error',reject);
    });
    request.setTimeout(20000,()=>request.destroy(new Error('PROXY_TIMEOUT')));
    request.on('error',reject);request.on('close',()=>agent.destroy());
  });
}
function decode(s) {
  return s.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
    const names={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    if(names[entity])return names[entity];
    const n=entity[1]?.toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
    return Number.isFinite(n)&&n>=0&&n<=0x10ffff?String.fromCodePoint(n):match;
  });
}
function results(xml) {
  const out=[];
  for(const item of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const field=name=>decode(item[1].match(new RegExp('<'+name+'>([\\s\\S]*?)</'+name+'>'))?.[1]||'');
    try {const link=new URL(field('link'));if(!['https:','http:'].includes(link.protocol))continue;out.push({title:field('title'),url:link.href,description:field('description')})}catch(_){}
  }
  return out.slice(0,10);
}
function install(app) {
  let requests=0,windowStart=Date.now(),active=0;
  app.use('/web-search', (req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(req.headers.origin==='https://charliesturm0106-alt.github.io'){res.set('Access-Control-Allow-Origin',req.headers.origin);res.set('Vary','Origin')}
    next();
  });
  app.get('/web-search/status',(_req,res)=>res.json({configured:!!configuration()}));
  app.get('/web-search',async(req,res)=>{
    const q=typeof req.query.q==='string'?req.query.q.trim():'';
    if(!q||q.length>200)return res.status(400).json({error:'Enter a search between 1 and 200 characters.'});
    const config=configuration();if(!config)return res.status(503).json({error:'Web search is waiting for the site owner to finish proxy setup.'});
    if(Date.now()-windowStart>60000){requests=0;windowStart=Date.now()}
    if(requests>=30||active>=3)return res.status(429).json({error:'Search is busy. Please try again shortly.'});
    requests++;active++;
    try {
      const url=new URL('https://www.bing.com/search');url.searchParams.set('format','rss');url.searchParams.set('q',q);url.searchParams.set('setlang','en-US');
      const items=results(await proxyGet(url,config));
      res.json({query:q,source:'Bing RSS',results:items});
    }catch(error){res.status(502).json({error:error.message==='PROXY_AUTH'?'The proxy login was rejected. The site owner needs to check its proxy credentials.':'The search connection failed. Try again shortly.'})}
    finally{active--}
  });
}
module.exports={install,configuration,proxyGet,results};

