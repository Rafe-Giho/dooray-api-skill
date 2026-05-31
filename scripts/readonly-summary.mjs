#!/usr/bin/env node
import { loadConfig, unwrap, pageLimit } from './dooray-common.mjs';
import { doorayRequest } from './dooray-http.mjs';

function parse(argv){const a={type:null,project:null,wiki:null,channel:null,limit:10,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--type')a.type=argv[++i]; else if(x==='--project')a.project=argv[++i]; else if(x==='--wiki')a.wiki=argv[++i]; else if(x==='--channel')a.channel=argv[++i]; else if(x==='--limit')a.limit=Number(argv[++i]); else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
function compactText(s,n=120){return String(s||'').replace(/\s+/g,' ').trim().slice(0,n);}
const args=parse(process.argv); if(args.help||!args.type){console.log('Usage: node readonly-summary.mjs --type projects|tasks|wikis|wiki|messenger|logs [--project CODE] [--wiki NAME] [--channel TITLE] [--limit 10] [--json]');process.exit(args.help?0:2)}
const {config}=loadConfig(args.config); const limit=pageLimit(args.limit,10);
let out={type:args.type,items:[]};
if(args.type==='projects'){
  const data=await doorayRequest(config,'GET','/project/v1/projects');
  out.totalCount=data.totalCount; out.items=unwrap(data).slice(0,limit).map(p=>({id:p.id,title:p.code,state:p.state,wikiId:p.wiki?.id}));
}else if(args.type==='tasks'){
  if(!args.project) throw new Error('--project required');
  const projects=unwrap(await doorayRequest(config,'GET','/project/v1/projects')); const project=projects.find(p=>p.id===args.project||p.code===args.project); if(!project) throw new Error(`Project not found: ${args.project}`);
  const data=await doorayRequest(config,'GET',`/project/v1/projects/${project.id}/posts?size=${Math.max(limit,20)}`);
  out.project={id:project.id,code:project.code}; out.totalCount=data.totalCount; out.items=unwrap(data).slice(0,limit).map(t=>({id:t.id,title:t.subject,number:t.taskNumber,workflow:t.workflow?.name,closed:t.closed,updatedAt:t.updatedAt,assignees:(t.users?.to||[]).map(u=>u.member?.name).filter(Boolean)}));
}else if(args.type==='wikis'){
  const data=await doorayRequest(config,'GET','/wiki/v1/wikis'); out.totalCount=data.totalCount; out.items=unwrap(data).slice(0,limit).map(w=>({id:w.id,title:w.name,homePageId:w.home?.pageId,projectId:w.project?.id}));
}else if(args.type==='wiki'){
  if(!args.wiki) throw new Error('--wiki required');
  const wikis=unwrap(await doorayRequest(config,'GET','/wiki/v1/wikis')); let wiki=wikis.find(w=>w.id===args.wiki||w.name===args.wiki);
  if(!wiki){const projects=unwrap(await doorayRequest(config,'GET','/project/v1/projects')); const project=projects.find(p=>p.id===args.wiki||p.code===args.wiki); if(project?.wiki?.id) wiki=wikis.find(w=>w.id===project.wiki.id)||{id:project.wiki.id,name:project.code};}
  if(!wiki) throw new Error(`Wiki not found: ${args.wiki}`); const pages=unwrap(await doorayRequest(config,'GET',`/wiki/v1/wikis/${wiki.id}/pages?size=${limit}`)); out.wiki={id:wiki.id,name:wiki.name}; out.items=pages.map(p=>({id:p.id,title:p.subject,root:p.root,version:p.version}));
}else if(args.type==='messenger'){
  const data=await doorayRequest(config,'GET','/messenger/v1/channels'); out.totalCount=data.totalCount; out.items=unwrap(data).slice(0,limit).map(c=>({id:c.id,title:c.title||'(direct)',type:c.type,updatedAt:c.updatedAt,status:c.status}));
}else if(args.type==='logs'){
  if(!args.channel) throw new Error('--channel required'); const channels=unwrap(await doorayRequest(config,'GET','/messenger/v1/channels')); const channel=channels.find(c=>c.id===args.channel||c.title===args.channel); if(!channel) throw new Error(`Channel not found: ${args.channel}`);
  const data=await doorayRequest(config,'GET',`/messenger/v1/channels/${channel.id}/logs?size=${limit}`); out.channel={id:channel.id,title:channel.title,type:channel.type}; out.hasMore=data.hasMore; out.items=unwrap(data).map(l=>({id:l.id,type:l.type,sentAt:l.sentAt,text:compactText(l.text||l.file?.fileName||'')}));
}else throw new Error(`Unknown type: ${args.type}`);
if(args.json) console.log(JSON.stringify(out,null,2)); else { console.log(`${out.type} summary${out.totalCount!=null?` (total ${out.totalCount})`:''}`); for(const item of out.items) console.log(`- ${item.title||item.text||item.id} ${item.updatedAt||item.sentAt||''}`.trim()); }
