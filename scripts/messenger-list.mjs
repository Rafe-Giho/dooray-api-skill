#!/usr/bin/env node
import { loadConfig, unwrap, pageLimit } from './dooray-common.mjs';
import { doorayRequest } from './dooray-http.mjs';
function parse(argv){const a={limit:20,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--limit')a.limit=Number(argv[++i]); else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
const args=parse(process.argv); if(args.help){console.log('Usage: node messenger-list.mjs [--limit 20] [--json]');process.exit(0)}
const {config}=loadConfig(args.config); const data=await doorayRequest(config,'GET','/messenger/v1/channels');
const channels=unwrap(data).slice(0,pageLimit(args.limit,20)).map(c=>({id:c.id,title:c.title||'',type:c.type,status:c.status,updatedAt:c.updatedAt,displayed:c.displayed,archivedAt:c.archivedAt,capacity:c.capacity}));
if(args.json) console.log(JSON.stringify({totalCount:data.totalCount,channels},null,2)); else for(const c of channels) console.log(`${c.title||'(direct)'} (${c.id}) type=${c.type} updated=${c.updatedAt}`);
