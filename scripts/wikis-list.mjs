#!/usr/bin/env node
import { loadConfig, doorayRequest, unwrap, pageLimit } from './dooray-common.mjs';
function parse(argv){const a={limit:20,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--limit')a.limit=Number(argv[++i]); else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
const args=parse(process.argv); if(args.help){console.log('Usage: node wikis-list.mjs [--limit 20] [--json]');process.exit(0)}
const {config}=loadConfig(args.config); const data=await doorayRequest(config,'GET','/wiki/v1/wikis');
const wikis=unwrap(data).slice(0,pageLimit(args.limit,20)).map(w=>({id:w.id,name:w.name,type:w.type,scope:w.scope,homePageId:w.home?.pageId,projectId:w.project?.id}));
if(args.json) console.log(JSON.stringify({totalCount:data.totalCount,wikis},null,2)); else for(const w of wikis) console.log(`${w.name} (${w.id}) home=${w.homePageId||'-'}`);
