#!/usr/bin/env node
import { loadConfig, doorayRequest, unwrap } from './dooray-common.mjs';
function parse(argv){const a={project:null,post:null,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--project')a.project=argv[++i]; else if(x==='--post')a.post=argv[++i]; else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
const args=parse(process.argv); if(args.help||!args.project||!args.post){console.log('Usage: node post-get.mjs --project <project-id-or-code> --post <post-id-or-task-number> [--json]');process.exit(args.help?0:2)}
const {config}=loadConfig(args.config); const projects=unwrap(await doorayRequest(config,'GET','/project/v1/projects'));
const project=projects.find(p=>p.id===args.project||p.code===args.project); if(!project) throw new Error(`Project not found: ${args.project}`);
let postId=args.post;
if(!/^\d+$/.test(postId)) {
  const list=unwrap(await doorayRequest(config,'GET',`/project/v1/projects/${project.id}/posts?size=100`));
  const post=list.find(p=>p.taskNumber===args.post||String(p.number)===args.post);
  if(!post) throw new Error(`Post/task not found in first 100 posts: ${args.post}`);
  postId=post.id;
}
const post=unwrap(await doorayRequest(config,'GET',`/project/v1/projects/${project.id}/posts/${postId}`));
const out={id:post.id,taskNumber:post.taskNumber,subject:post.subject,project:post.project?.code,closed:post.closed,workflow:post.workflow?.name,createdAt:post.createdAt,updatedAt:post.updatedAt,body:{mimeType:post.body?.mimeType,content:post.body?.content||''},files:(post.files||[]).map(f=>({id:f.id,name:f.name,size:f.size}))};
if(args.json) console.log(JSON.stringify(out,null,2)); else console.log(`# ${out.subject}\n\n${out.body.content}`);
