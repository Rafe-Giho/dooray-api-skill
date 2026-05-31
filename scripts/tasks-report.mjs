#!/usr/bin/env node
import { loadConfig, unwrap, pageLimit } from './dooray-common.mjs';
import { doorayRequest } from './dooray-http.mjs';

const DEFAULT_PROJECT = 'AI기술혁신부(SE2)';
const DEFAULT_OPEN_CLASSES = 'registered,working';

function parse(argv) {
  const a = {
    project: DEFAULT_PROJECT,
    projects: [],
    limit: 30,
    mine: true,
    includeCc: false,
    json: false,
    config: process.env.DOORAY_CONFIG,
    date: todayKst(),
  };
  for (let i = 2; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--project') a.projects.push(argv[++i]);
    else if (x === '--all-projects') a.allProjects = true;
    else if (x === '--limit') a.limit = Number(argv[++i]);
    else if (x === '--mine') a.mine = true;
    else if (x === '--all') a.mine = false;
    else if (x === '--include-cc') a.includeCc = true;
    else if (x === '--date') a.date = argv[++i];
    else if (x === '--json') a.json = true;
    else if (x === '--config') a.config = argv[++i];
    else if (x === '--help' || x === '-h') a.help = true;
    else throw new Error(`Unknown argument: ${x}`);
  }
  if (!a.projects.length) a.projects = [a.project];
  return a;
}
function todayKst() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}
function ymd(date) { return date.toISOString().slice(0, 10); }
function startKst(dateStr) { return new Date(`${dateStr}T00:00:00+09:00`); }
function dateAdd(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function daysBetween(a, b) { return Math.round((startKst(a).getTime() - startKst(b).getTime()) / 86400000); }
function compactDate(value) { return String(value || '').slice(0, 10) || null; }
function memberIdsFromRef(ref) {
  if (!ref) return [];
  if (ref.member?.organizationMemberId) return [ref.member.organizationMemberId];
  if (ref.group?.members) return ref.group.members.map(m => m.organizationMemberId).filter(Boolean);
  return [];
}
function membersFromRefs(refs = []) {
  const seen = new Map();
  for (const ref of refs) {
    if (ref.member?.organizationMemberId) seen.set(ref.member.organizationMemberId, ref.member.name || ref.member.organizationMemberId);
    for (const m of ref.group?.members || []) if (m.organizationMemberId) seen.set(m.organizationMemberId, m.name || m.organizationMemberId);
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}
function includesMe(task, me, includeCc) {
  if (!me?.id) return true;
  const refs = [...(task.users?.to || [])];
  if (includeCc) refs.push(...(task.users?.cc || []));
  return refs.some(ref => memberIdsFromRef(ref).includes(me.id));
}
function taskUrl(project, task) {
  return `https://jininfra.dooray.com/project/projects/${project.id}/posts/${task.id}`;
}
function compactTask(project, task, today) {
  const due = compactDate(task.dueDate);
  const dday = due ? daysBetween(due, today) : null;
  return {
    id: task.id,
    taskNumber: task.taskNumber,
    subject: task.subject,
    project: project.code,
    workflowClass: task.workflowClass,
    workflow: task.workflow?.name || task.workflowClass,
    dueDate: due,
    dday,
    updatedAt: task.updatedAt,
    from: task.users?.from?.member?.name || null,
    to: membersFromRefs(task.users?.to || []).map(m => m.name),
    cc: membersFromRefs(task.users?.cc || []).map(m => m.name),
    url: taskUrl(project, task),
  };
}
function categorize(tasks, today) {
  const weekEnd = ymd(dateAdd(startKst(today), 6));
  const out = { overdue: [], today: [], thisWeek: [], future: [], noDueDate: [] };
  for (const t of tasks) {
    if (!t.dueDate) out.noDueDate.push(t);
    else if (t.dueDate < today) out.overdue.push(t);
    else if (t.dueDate === today) out.today.push(t);
    else if (t.dueDate <= weekEnd) out.thisWeek.push(t);
    else out.future.push(t);
  }
  for (const rows of Object.values(out)) rows.sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return out;
}
function line(t) {
  const due = t.dueDate ? (t.dday === 0 ? 'D-0' : t.dday > 0 ? `D-${t.dday}` : `D+${Math.abs(t.dday)}`) : '기한 없음';
  return `- [${due}] ${t.project} ${t.taskNumber} / ${t.subject} — ${t.workflow}${t.dueDate ? ` (${t.dueDate})` : ''}`;
}

const args = parse(process.argv);
if (args.help) {
  console.log('Usage: node tasks-report.mjs [--project <id-or-code>] [--all-projects] [--mine|--all] [--include-cc] [--limit 30] [--date YYYY-MM-DD] [--json]');
  process.exit(0);
}
const { config } = loadConfig(args.config);
const projects = unwrap(await doorayRequest(config, 'GET', '/project/v1/projects'));
const selected = args.allProjects ? projects : args.projects.map(key => {
  const p = projects.find(x => x.id === key || x.code === key);
  if (!p) throw new Error(`Project not found: ${key}`);
  return p;
});
let me = null;
if (args.mine) {
  const m = unwrap(await doorayRequest(config, 'GET', '/common/v1/members/me'));
  me = { id: m.organizationMemberId || m.id, name: m.name };
}
const perProjectLimit = pageLimit(Math.max(args.limit, 50), 100);
const all = [];
for (const project of selected) {
  const data = await doorayRequest(config, 'GET', `/project/v1/projects/${project.id}/posts?size=${perProjectLimit}&postWorkflowClass=${encodeURIComponent(DEFAULT_OPEN_CLASSES)}`);
  const tasks = unwrap(data)
    .filter(t => !t.closed)
    .filter(t => !args.mine || includesMe(t, me, args.includeCc))
    .map(t => compactTask(project, t, args.date));
  all.push(...tasks);
}
const groups = categorize(all, args.date);
const summary = {
  total: all.length,
  overdue: groups.overdue.length,
  today: groups.today.length,
  thisWeek: groups.thisWeek.length,
  future: groups.future.length,
  noDueDate: groups.noDueDate.length,
};
const trimmedGroups = Object.fromEntries(Object.entries(groups).map(([k, rows]) => [k, rows.slice(0, pageLimit(args.limit, 30))]));
const out = { date: args.date, scope: { projects: selected.map(p => ({ id: p.id, code: p.code })), mine: args.mine, includeCc: args.includeCc, me }, summary, groups: trimmedGroups };
if (args.json) console.log(JSON.stringify(out, null, 2));
else {
  console.log(`Dooray 진행중 업무 요약 (${args.date})`);
  console.log(`총 ${summary.total}건: 기한초과 ${summary.overdue}, 오늘 ${summary.today}, 7일 내 ${summary.thisWeek}, 이후 ${summary.future}, 기한 없음 ${summary.noDueDate}`);
  const sections = [['overdue', '기한 초과'], ['today', '오늘 마감'], ['thisWeek', '7일 내 마감'], ['noDueDate', '기한 없음'], ['future', '이후 마감']];
  for (const [key, title] of sections) {
    if (!groups[key].length) continue;
    console.log(`\n${title}`);
    for (const t of groups[key].slice(0, pageLimit(args.limit, 30))) console.log(line(t));
  }
}
