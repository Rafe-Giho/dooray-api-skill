#!/usr/bin/env node
import { loadConfig, doorayRequest, unwrap, pageLimit } from './dooray-common.mjs';

function parse(argv){
  const a={channel:'AI기술혁신부',limit:100,json:false,config:process.env.DOORAY_CONFIG};
  for(let i=2;i<argv.length;i++){
    const x=argv[i];
    if(x==='--channel') a.channel=argv[++i];
    else if(x==='--limit') a.limit=Number(argv[++i]);
    else if(x==='--json') a.json=true;
    else if(x==='--config') a.config=argv[++i];
    else if(x==='--help'||x==='-h') a.help=true;
    else throw new Error(`Unknown argument: ${x}`);
  }
  return a;
}

const args=parse(process.argv);
if(args.help){
  console.log('Usage: node meeting-links-from-messenger.mjs [--channel AI기술혁신부] [--limit 100] [--json]');
  process.exit(0);
}
const {config}=loadConfig(args.config);
const channels=unwrap(await doorayRequest(config,'GET','/messenger/v1/channels'));
const channel=channels.find(c=>c.id===args.channel||c.title===args.channel);
if(!channel) throw new Error(`Channel not found: ${args.channel}`);
const size=pageLimit(args.limit,100);
const data=await doorayRequest(config,'GET',`/messenger/v1/channels/${channel.id}/logs?size=${size}`);
const logs=unwrap(data);
const urlRe=/https:\/\/[^\s]+\.dooray\.com\/home\/(\d+)\/(\d+)/g;
const rows=[];
for(const l of logs){
  const text=l.text||'';
  const matches=[...text.matchAll(urlRe)];
  if(matches.length || /회의록|주간회의록|주간 회의록/.test(text)){
    rows.push({
      sentAt:l.sentAt,
      sender:l.sender?.member?.name||l.sender?.member?.organizationMemberId||null,
      type:l.type,
      text,
      homeLinks:matches.map(m=>({url:m[0],homeId:m[1],postId:m[2]})),
    });
  }
}
if(args.json) console.log(JSON.stringify({channel:{id:channel.id,title:channel.title},hasMore:data.hasMore,rows},null,2));
else for(const r of rows){
  console.log(`${r.sentAt} ${r.sender||''} ${r.text.replace(/\s+/g,' ').trim()}`);
  for(const link of r.homeLinks) console.log(`  ${link.url} homeId=${link.homeId} postId=${link.postId}`);
}
