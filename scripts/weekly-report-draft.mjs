#!/usr/bin/env node
import fs from 'node:fs';
import { configDefault, loadConfig, unwrap, expandHome } from './dooray-common.mjs';
import { doorayRequest } from './dooray-http.mjs';

function parse(argv){const a={project:null,post:null,input:null,out:null,date:new Date().toISOString().slice(0,10),title:null,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--project')a.project=argv[++i]; else if(x==='--post')a.post=argv[++i]; else if(x==='--input')a.input=argv[++i]; else if(x==='--out')a.out=argv[++i]; else if(x==='--date')a.date=argv[++i]; else if(x==='--title')a.title=argv[++i]; else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
function mondayOf(d){const x=new Date(`${d}T00:00:00+09:00`); const day=x.getDay()||7; x.setDate(x.getDate()-day+1); return x;}
function weekOfMonth(dateStr){const d=new Date(`${dateStr}T00:00:00+09:00`); const week=Math.ceil(d.getDate()/7); return `${d.getMonth()+1}월 ${week}주차`;}
function defaultTitle(dateStr){return `${weekOfMonth(dateStr)} 주간업무보고서`;} 
function escapeReg(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
async function fetchPost(config, projectKey, postKey){
  const projects=unwrap(await doorayRequest(config,'GET','/project/v1/projects')); const project=projects.find(p=>p.id===projectKey||p.code===projectKey); if(!project) throw new Error(`Project not found: ${projectKey}`);
  let postId=postKey;
  if(!/^\d+$/.test(postId||'')){const list=unwrap(await doorayRequest(config,'GET',`/project/v1/projects/${project.id}/posts?size=100`)); const post=list.find(p=>p.taskNumber===postKey||String(p.number)===postKey||p.subject===postKey); if(!post) throw new Error(`Post not found in first 100 posts: ${postKey}`); postId=post.id;}
  const post=unwrap(await doorayRequest(config,'GET',`/project/v1/projects/${project.id}/posts/${postId}`));
  return {project,post,content:post.body?.content||''};
}
function replaceDates(text,dateStr){
  return text
    .replace(/(No\.?\s*[:：-]?\s*)(\d{4}[.\-/년]\s*\d{1,2}[.\-/월]\s*\d{1,2}일?)/gi, `$1${dateStr}`)
    .replace(/(회의\s*일시\s*[:：|]\s*)(\d{4}[.\-/년]\s*\d{1,2}[.\-/월]\s*\d{1,2}일?)/g, `$1${dateStr}`)
    .replace(/(작성\s*일자?\s*[:：|]\s*)(\d{4}[.\-/년]\s*\d{1,2}[.\-/월]\s*\d{1,2}일?)/g, `$1${dateStr}`);
}
function replaceLikelyTitle(text,title){
  const lines=text.split('\n');
  for(let i=0;i<Math.min(lines.length,8);i++){
    if(/^#{1,3}\s+/.test(lines[i])){ lines[i]=`${lines[i].match(/^#{1,3}\s+/)[0]}${title}`; return lines.join('\n'); }
    if(/주간업무보고|회의록|주간회의/.test(lines[i])){ lines[i]=title; return lines.join('\n'); }
  }
  return `${title}\n\n${text}`;
}
function blankProgressTables(text){
  const lines=text.split('\n'); const out=[];
  for(let i=0;i<lines.length;i++){
    if(lines[i].includes('|') && i+1<lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i+1])){
      const header=lines[i]; const cols=header.split('|').map(c=>c.trim());
      const targets=cols.map((c,idx)=>/(진행\s*사항|이슈\s*사항|이슈사항|진행사항)/.test(c)?idx:-1).filter(idx=>idx>=0);
      out.push(lines[i],lines[i+1]); i+=2;
      while(i<lines.length && lines[i].includes('|')){
        if(targets.length){
          const cells=lines[i].split('|');
          for(const idx of targets) if(idx<cells.length) cells[idx]=' • ';
          out.push(cells.join('|'));
        } else out.push(lines[i]);
        i++;
      }
      i--; continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}
function parseDateToken(s){
  const m=String(s).match(/(\d{1,2})[.\-/월]\s*(\d{1,2})/); if(!m) return null;
  const y=new Date().getFullYear(); return new Date(`${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}T00:00:00+09:00`);
}
function filterLeaveAndTravel(text,dateStr){
  const base=new Date(`${dateStr}T00:00:00+09:00`);
  const lines=text.split('\n'); let inSection=false;
  return lines.filter(line=>{
    if(/휴가|외근/.test(line) && /^\s*#{1,6}\s+/.test(line)) { inSection=true; return true; }
    if(inSection && /^#{1,6}\s+/.test(line) && !/휴가|외근/.test(line)) inSection=false;
    if(!inSection) return true;
    if(!/^\s*[-*•]|\|/.test(line)) return true;
    const d=parseDateToken(line); return !d || d>=base;
  }).join('\n');
}
function draft(content,{date,title}){
  let text=content;
  text=replaceLikelyTitle(text,title);
  text=replaceDates(text,date);
  text=blankProgressTables(text);
  text=filterLeaveAndTravel(text,date);
  return text;
}
const args=parse(process.argv); if(args.help||(!args.post&&!args.input)){console.log('Usage: node weekly-report-draft.mjs [--project <id-or-code>] (--post <post-id> | --input previous.md) [--date YYYY-MM-DD] [--title TITLE] [--out draft.md] [--json]');process.exit(args.help?0:2)}
let source={type:args.input?'file':'dooray'}; let content=''; let sourcePost=null;
if(args.input){content=fs.readFileSync(expandHome(args.input),'utf8'); source.path=expandHome(args.input);} else {const {config}=loadConfig(args.config); const project=args.project||configDefault(config,['defaults.project','defaults.taskProjects.0','defaultProject'],null); if(!project) throw new Error('Missing project. Pass --project <id-or-code> or set defaults.project in the Dooray config.'); const fetched=await fetchPost(config,project,args.post); content=fetched.content; sourcePost=fetched.post; source={type:'dooray',project:fetched.project.code,postId:fetched.post.id,taskNumber:fetched.post.taskNumber,subject:fetched.post.subject};}
const title=args.title||defaultTitle(args.date); const output=draft(content,{date:args.date,title});
if(args.out) fs.writeFileSync(expandHome(args.out),output);
if(args.json) console.log(JSON.stringify({source,date:args.date,title,out:args.out?expandHome(args.out):null,content:output},null,2)); else console.log(output);
