#!/usr/bin/env node
import fs from 'node:fs';
import { loadConfig, doorayRequest, unwrap, expandHome } from './dooray-common.mjs';

function parse(argv){const a={project:null,subject:null,input:null,yes:false,json:false,config:process.env.DOORAY_CONFIG}; for(let i=2;i<argv.length;i++){const x=argv[i]; if(x==='--project')a.project=argv[++i]; else if(x==='--subject')a.subject=argv[++i]; else if(x==='--input')a.input=argv[++i]; else if(x==='--yes')a.yes=true; else if(x==='--json')a.json=true; else if(x==='--config')a.config=argv[++i]; else if(x==='--help'||x==='-h')a.help=true; else throw new Error(`Unknown argument: ${x}`);} return a;}
const args=parse(process.argv);
if(args.help||!args.project||!args.subject||!args.input){console.log('Usage: node post-create.mjs --project <project-id-or-code> --subject "title" --input draft.md --yes [--json]');process.exit(args.help?0:2)}
if(!args.yes){console.error('Refusing to create Dooray post without --yes. Show the draft to the user and get explicit approval first.');process.exit(2)}
const {config}=loadConfig(args.config);
const projects=unwrap(await doorayRequest(config,'GET','/project/v1/projects'));
const project=projects.find(p=>p.id===args.project||p.code===args.project); if(!project) throw new Error(`Project not found: ${args.project}`);
const content=fs.readFileSync(expandHome(args.input),'utf8');
const payload={subject:args.subject,body:{mimeType:'text/x-markdown',content}};
const created=unwrap(await doorayRequest(config,'POST',`/project/v1/projects/${project.id}/posts`,JSON.stringify(payload)));
const out={project:{id:project.id,code:project.code},created};
console.log(JSON.stringify(out,null,2));
