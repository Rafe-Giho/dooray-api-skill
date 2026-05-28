#!/usr/bin/env node
import { loadConfig, doorayRequest, unwrap } from './dooray-common.mjs';
function parse(argv){const a={wiki:null,page:null,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--wiki')a.wiki=argv[++i]; else if(x==='--page')a.page=argv[++i]; else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
const args=parse(process.argv); if(args.help||!args.wiki){console.log('Usage: node wiki-get.mjs --wiki <wiki-id-or-name> [--page <page-id>] [--json]');process.exit(args.help?0:2)}
const {config}=loadConfig(args.config); const wikis=unwrap(await doorayRequest(config,'GET','/wiki/v1/wikis'));
let wiki=wikis.find(w=>w.id===args.wiki||w.name===args.wiki);
if(!wiki) {
  const projects=unwrap(await doorayRequest(config,'GET','/project/v1/projects'));
  const project=projects.find(p=>p.id===args.wiki||p.code===args.wiki);
  if(project?.wiki?.id) wiki=wikis.find(w=>w.id===project.wiki.id) || { id: project.wiki.id, name: project.code, home: {} };
}
if(!wiki) throw new Error(`Wiki not found: ${args.wiki}`);
let pageId=args.page||wiki.home?.pageId;
if(!pageId) {
  const pages=unwrap(await doorayRequest(config,'GET',`/wiki/v1/wikis/${wiki.id}/pages?size=1`));
  pageId=pages[0]?.id;
}
if(!pageId) throw new Error(`No page id and wiki has no home page: ${wiki.name}`);
const page=unwrap(await doorayRequest(config,'GET',`/wiki/v1/wikis/${wiki.id}/pages/${pageId}`));
const out={wiki:{id:wiki.id,name:wiki.name},page:{id:page.id,subject:page.subject,updatedAt:page.updatedAt,mimeType:page.body?.mimeType,content:page.body?.content||''}};
if(args.json) console.log(JSON.stringify(out,null,2)); else console.log(`# ${out.page.subject}\n\n${out.page.content}`);
