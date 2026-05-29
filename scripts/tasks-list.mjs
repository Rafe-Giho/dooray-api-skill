#!/usr/bin/env node
import { loadConfig, doorayRequest, unwrap, pageLimit } from './dooray-common.mjs';

function parse(argv){const a={project:null,limit:20,open:false,mine:false,includeCc:false,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--project')a.project=argv[++i]; else if(x==='--limit')a.limit=Number(argv[++i]); else if(x==='--open')a.open=true; else if(x==='--mine')a.mine=true; else if(x==='--include-cc')a.includeCc=true; else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
function memberIds(ref){ if(ref.member?.organizationMemberId) return [ref.member.organizationMemberId]; return (ref.group?.members||[]).map(m=>m.organizationMemberId).filter(Boolean); }
function isMine(t, me, includeCc){ if(!me) return true; const refs=[...(t.users?.to||[])]; if(includeCc) refs.push(...(t.users?.cc||[])); return refs.some(ref=>memberIds(ref).includes(me.id)); }
function names(refs=[]){ const seen=new Set(); for(const ref of refs){ if(ref.member?.name) seen.add(ref.member.name); for(const m of ref.group?.members||[]) if(m.name) seen.add(m.name); } return [...seen]; }
function compact(t){return {id:t.id,taskNumber:t.taskNumber,subject:t.subject,project:t.project?.code,closed:t.closed,workflowClass:t.workflowClass,workflow:t.workflow?.name,dueDate:t.dueDate||null,dueDateFlag:t.dueDateFlag,updatedAt:t.updatedAt,to:names(t.users?.to||[]),cc:names(t.users?.cc||[])}}
const args=parse(process.argv); if(args.help||!args.project){console.log('Usage: node tasks-list.mjs --project <project-id-or-code> [--open] [--mine] [--include-cc] [--limit 20] [--json]');process.exit(args.help?0:2)}
const {config}=loadConfig(args.config);
const projects=unwrap(await doorayRequest(config,'GET','/project/v1/projects'));
const project=projects.find(p=>p.id===args.project||p.code===args.project);
if(!project) throw new Error(`Project not found: ${args.project}`);
const size=pageLimit(Math.max(args.limit,50),100);
const query=args.open?`size=${size}&postWorkflowClass=registered,working`:`size=${size}`;
const data=await doorayRequest(config,'GET',`/project/v1/projects/${project.id}/posts?${query}`);
let me=null; if(args.mine){ const m=unwrap(await doorayRequest(config,'GET','/common/v1/members/me')); me={id:m.organizationMemberId||m.id,name:m.name}; }
let tasks=unwrap(data).filter(t=>(!args.open||!t.closed)&&(!args.mine||isMine(t,me,args.includeCc))).slice(0,pageLimit(args.limit,20)).map(compact);
if(args.json) console.log(JSON.stringify({project:{id:project.id,code:project.code},totalCount:data.totalCount,returned:tasks.length,tasks},null,2));
else for(const t of tasks) console.log(`${t.taskNumber} [${t.workflow||t.workflowClass}] ${t.subject} due=${t.dueDate||'-'} to=${t.to.join(',')||'-'}`);
