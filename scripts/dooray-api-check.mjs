#!/usr/bin/env node
import { asArray, configDefault, loadConfig, readToken, unwrap, redact } from './dooray-common.mjs';
import { doorayRequest } from './dooray-http.mjs';

function parse(argv) {
  const a = { project: null, wiki: null, messengerLimit: 5, json: false, config: process.env.DOORAY_CONFIG };
  for (let i = 2; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--project') a.project = argv[++i];
    else if (x === '--wiki') a.wiki = argv[++i];
    else if (x === '--json') a.json = true;
    else if (x === '--config') a.config = argv[++i];
    else if (x === '--help' || x === '-h') a.help = true;
    else throw new Error(`Unknown argument: ${x}`);
  }
  return a;
}
async function check(name, fn) {
  try { return { name, ok: true, ...(await fn()) }; }
  catch (error) { return { name, ok: false, error: error.message, status: error.status || null }; }
}
function finish(results, args) {
  const ok = results.every(r => r.ok);
  const out = { ok, checkedAt: new Date().toISOString(), results };
  if (args.json) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`Dooray API check: ${ok ? 'ok' : 'failed'}`);
    for (const r of results) console.log(`- ${r.name}: ${r.skipped ? `skipped (${r.reason})` : r.ok ? 'ok' : `failed (${r.error})`}`);
  }
  process.exit(ok ? 0 : 1);
}

const args = parse(process.argv);
if (args.help) {
  console.log('Usage: node dooray-api-check.mjs [--project <id-or-code>] [--wiki <id-or-name-or-project-code>] [--json]');
  process.exit(0);
}
const loaded = loadConfig(args.config);
const { config } = loaded;
args.project ||= asArray(configDefault(config, ['defaults.taskProjects', 'defaults.project', 'defaultProject'], []))[0] || null;
args.wiki ||= asArray(configDefault(config, ['defaults.wiki', 'defaults.wikiProject', 'defaults.wikiProjects', 'defaultWiki'], []))[0] || null;
const results = [];
const tokenCheck = await check('config/token', async () => {
  await readToken(config);
  return { configPath: loaded.configPath, config: redact(config), tokenAvailable: true };
});
results.push(tokenCheck);
if (!tokenCheck.ok) finish(results, args);
let projects = [];
results.push(await check('common/me', async () => {
  const me = unwrap(await doorayRequest(config, 'GET', '/common/v1/members/me'));
  return { member: { id: me.organizationMemberId || me.id, name: me.name } };
}));
results.push(await check('project/projects', async () => {
  const data = await doorayRequest(config, 'GET', '/project/v1/projects');
  projects = unwrap(data);
  return { totalCount: data.totalCount, returned: projects.length };
}));
results.push(await check('project/open-posts', async () => {
  if (!args.project) return { skipped: true, reason: 'Pass --project or set defaults.taskProjects/defaults.project to check project posts.' };
  const project = projects.find(p => p.id === args.project || p.code === args.project) || unwrap(await doorayRequest(config, 'GET', '/project/v1/projects')).find(p => p.id === args.project || p.code === args.project);
  if (!project) throw new Error(`Project not found: ${args.project}`);
  const data = await doorayRequest(config, 'GET', `/project/v1/projects/${project.id}/posts?size=5&postWorkflowClass=registered,working`);
  return { project: { id: project.id, code: project.code }, totalCount: data.totalCount, returned: unwrap(data).length };
}));
results.push(await check('wiki/list-get', async () => {
  const data = await doorayRequest(config, 'GET', '/wiki/v1/wikis');
  const wikis = unwrap(data);
  if (!args.wiki) return { skipped: true, reason: 'Pass --wiki or set defaults.wiki to check a wiki page.' };
  let wiki = wikis.find(w => w.id === args.wiki || w.name === args.wiki);
  if (!wiki) {
    const project = projects.find(p => p.id === args.wiki || p.code === args.wiki);
    if (project?.wiki?.id) wiki = wikis.find(w => w.id === project.wiki.id) || { id: project.wiki.id, name: project.code };
  }
  if (!wiki) throw new Error(`Wiki not found: ${args.wiki}`);
  const pages = unwrap(await doorayRequest(config, 'GET', `/wiki/v1/wikis/${wiki.id}/pages?size=1`));
  return { totalCount: data.totalCount, wiki: { id: wiki.id, name: wiki.name }, firstPage: pages[0] ? { id: pages[0].id, subject: pages[0].subject } : null };
}));
results.push(await check('messenger/channels', async () => {
  const data = await doorayRequest(config, 'GET', '/messenger/v1/channels');
  return { totalCount: data.totalCount, returned: unwrap(data).length };
}));
finish(results, args);
