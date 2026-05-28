#!/usr/bin/env node
import { loadConfig, doorayRequest, unwrap, pageLimit } from './dooray-common.mjs';

function parse(argv){const a={project:null,limit:20,open:false,mine:false,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--project')a.project=argv[++i]; else if(x==='--limit')a.limit=Number(argv[++i]); else if(x==='--open')a.open=true; else if(x==='--mine')a.mine=true; else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
function isMine(t, me){ if(!me) return true; const ids=[...(t.users?.to||[]), ...(t.users?.cc||[])].map(u=>u.member?.organizationMemberId).filter(Boolean); return ids.includes(me.id); }
function compact(t){return {id:t.id,taskNumber:t.taskNumber,subject:t.subject,project:t.project?.code,closed:t.closed,workflowClass:t.workflowClass,workflow:t.workflow?.name,dueDate:t.dueDate||null,dueDateFlag:t.dueDateFlag,updatedAt:t.updatedAt,to:(t.users?.to||[]).map(u=>u.member?.name).filter(Boolean)}}
const args=parse(process.argv); if(args.help||!args.project){console.log('Usage: node tasks-list.mjs --project <project-id-or-code> [--open] [--mine] [--limit 20] [--json]');process.exit(args.help?0:2)}
const {config}=loadConfig(args.config);
const projects=unwrap(await doorayRequest(config,'GET','/project/v1/projects'));
const project=projects.find(p=>p.id===args.project||p.code===args.project);
if(!project) throw new Error(`Project not found: ${args.project}`);
const size=pageLimit(Math.max(args.limit,50),50);
const data=await doorayRequest(config,'GET',`/project/v1/projects/${project.id}/posts?size=${size}`);
let me=null; if(args.mine){ const m=unwrap(await doorayRequest(config,'GET','/common/v1/members/me')); me={id:m.id,name:m.name}; }
let tasks=unwrap(data).filter(t=>(!args.open||!t.closed)&&(!args.mine||isMine(t,me))).slice(0,pageLimit(args.limit,20)).map(compact);
if(args.json) console.log(JSON.stringify({project:{id:project.id,code:project.code},totalCount:data.totalCount,returned:tasks.length,tasks},null,2));
else for(const t of tasks) console.log(`${t.taskNumber} [${t.workflow||t.workflowClass}] ${t.subject} due=${t.dueDate||'-'} to=${t.to.join(',')||'-'}`);
