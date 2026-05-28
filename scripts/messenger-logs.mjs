#!/usr/bin/env node
import { loadConfig, doorayRequest, unwrap, pageLimit } from './dooray-common.mjs';
function parse(argv){const a={channel:null,limit:10,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--channel')a.channel=argv[++i]; else if(x==='--limit')a.limit=Number(argv[++i]); else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
const args=parse(process.argv); if(args.help||!args.channel){console.log('Usage: node messenger-logs.mjs --channel <channel-id-or-title> [--limit 10] [--json]');process.exit(args.help?0:2)}
const {config}=loadConfig(args.config); const channels=unwrap(await doorayRequest(config,'GET','/messenger/v1/channels'));
const channel=channels.find(c=>c.id===args.channel||c.title===args.channel); if(!channel) throw new Error(`Channel not found: ${args.channel}`);
const size=pageLimit(args.limit,10); const data=await doorayRequest(config,'GET',`/messenger/v1/channels/${channel.id}/logs?size=${size}`);
const logs=unwrap(data).map(l=>({id:l.id,seq:l.seq,type:l.type,sentAt:l.sentAt,sender:l.sender?.member?.organizationMemberId,text:l.text||'',fileName:l.file?.fileName||null}));
if(args.json) console.log(JSON.stringify({channel:{id:channel.id,title:channel.title,type:channel.type},hasMore:data.hasMore,logs},null,2)); else for(const l of logs) console.log(`${l.sentAt} [${l.type}] ${l.text || l.fileName || ''}`);
