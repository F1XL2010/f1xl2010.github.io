/* Local-only integrity/link/credential-pattern checks. Does not test the product. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),errors=[],warnings=[];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const all=walk(root), rel=p=>path.relative(root,p).split(path.sep).join('/');
const archived=JSON.parse(fs.readFileSync(path.join(root,'archive/2026-11-06-before-refresh/preservation-manifest.json')));
for(const r of archived.files){const p=path.join(root,'archive/2026-11-06-before-refresh',r.path);if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==r.sha256)errors.push('Changed preserved document: '+r.path);}
const source=JSON.parse(fs.readFileSync(path.join(root,'reference/portal-v409/manifest.json')));
for(const r of source.files){const p=path.join(root,r.path);if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==r.sha256||r.sha256!==r.sourceSha256)errors.push('Changed source reference: '+r.path);}
let links=0;
for(const p of all.filter(p=>p.endsWith('.md')&&!rel(p).startsWith('archive/2026-11-06-before-refresh/'))){
 const s=fs.readFileSync(p,'utf8');
 for(const m of s.matchAll(/\]\(([^)]+)\)/g)){
  const t=m[1].replace(/^<|>$/g,''); if(/^(?:[a-z]+:|#)/i.test(t))continue;
  const local=t.split('#')[0]; if(!local)continue; links++;
  const target=path.resolve(path.dirname(p),decodeURIComponent(local));if(!fs.existsSync(target))errors.push('Missing link '+rel(p)+' -> '+t);
 }
}
const patterns={googleAccessToken:/ya29\.[A-Za-z0-9_-]{20,}/,privateKey:/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,githubToken:/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/,googleApiKey:/AIza[0-9A-Za-z_-]{30,}/,discordToken:/[MN][A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{25,}/};
for(const p of all.filter(p=>/\.(md|json|gs|html|cjs)$/.test(p))){const s=fs.readFileSync(p,'utf8');for(const [label,r]of Object.entries(patterns))if(r.test(s))errors.push('Credential-pattern review needed: '+label+' in '+rel(p));}
for(const forbidden of ['people.json','intake.json','ledger.json','.clasprc.json','.env'])if(all.some(p=>path.basename(p)===forbidden))errors.push('Raw private/credential artifact included: '+forbidden);
const release=JSON.parse(fs.readFileSync(path.join(root,'reference/launch-2026-11-06/release.json')));
if(release.state!=='LIVE_SWITCH_COMPLETED'||release.portalVersion!==409||release.renamedWorkbooks!==153)errors.push('Launch reference mismatch');
warnings.push('Archived original Markdown links are not rewritten or treated as portable dependencies; see archive/README.md.');
warnings.push('Credential-pattern scanning is not proof that arbitrary future additions contain no sensitive information; review before distribution.');
const generated=new Set(['MANIFEST.json','VALIDATION.json']);
const manifest={edition:'3.0',date:'2026-11-06',files:all.filter(p=>!generated.has(rel(p))).map(p=>({path:rel(p),bytes:fs.statSync(p).size,sha256:sha(fs.readFileSync(p))})).sort((a,b)=>a.path.localeCompare(b.path))};
const result={checkedAt:new Date().toISOString(),pass:errors.length===0,preservedDocuments:archived.files.length,portalSourceFiles:source.files.length,currentLocalLinksChecked:links,packFiles:manifest.files.length,errors,warnings,scope:'Local documentation/reference integrity only; no new live-system test'};
if(!errors.length)fs.writeFileSync(path.join(root,'MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'VALIDATION.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
