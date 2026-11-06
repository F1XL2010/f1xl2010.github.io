/* Run with Node from any working directory. Local documentation only. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const versionText=fs.readFileSync(path.join(root,'PACK-VERSION.md'),'utf8');
const edition=versionText.match(/^- Version: \*\*(.+?)\*\*/m)?.[1];
const reviewed=versionText.match(/^- Refreshed: \*\*(.+?)\*\*/m)?.[1];
if(!edition||!reviewed)throw Error('PACK-VERSION needs Version and Refreshed fields');
const files=[
 'PACK-VERSION.md','ai-pack/START-HERE-AI.md','ai-pack/CURRENT-STATUS.md',
 'ai-pack/PROJECT-PRINCIPLES.md','ai-pack/KNOWN-ISSUES.md',
 'ai-pack/ARCHITECTURE.md','ai-pack/DATA-SOURCES.md',
 'ai-pack/LEAGUE-RULES-AND-EXCEPTIONS.md','ai-pack/TICKETS-AND-PENALTIES.md',
 'ai-pack/ROLES-AND-ACCESS.md','ai-pack/PRESEASON-WORKFLOW.md','ai-pack/WORKFLOWS.md',
 'ai-pack/STATISTICS-AND-HISTORY.md','ai-pack/DISCORD.md','ai-pack/DECISION-HISTORY.md',
 'ai-pack/OPERATIONS.md','ai-pack/RESULT-IMPORT-VALIDATION.md','ai-pack/TESTING-CHECKLIST.md',
 'ai-pack/BACKUP-AND-RECOVERY.md','ai-pack/TRANSFER-AND-MAINTENANCE.md',
 'ai-pack/EVIDENCE-AND-COVERAGE.md','ai-pack/CODE-MAP.md','ai-pack/GLOSSARY.md'
];
let out='# F1XL — handover for another AI\n\nEdition: '+reviewed+', pack '+edition+'. Generated from the maintained topic documents. Start with the first four sections; use the topic index for later detail.\n\nThis is a self-contained current briefing, not credentials or a complete live-data backup. The full handover folder adds preserved older notes, a dated Portal source reference and launch evidence. If attached alone, links to those files require the folder; the explanations here remain usable. The old chat is not needed to understand the core rules and decisions. Do not treat archived approvals or this briefing as authority to make changes.\n\n## Contents\n\n';
out+=files.map((p,i)=>`${i+1}. ${p.replace(/^ai-pack\//,'').replace(/\.md$/,'')}`).join('\n')+'\n';
for(const file of files){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 const adjusted=src.replace(/\]\(([^)]+)\)/g,(all,target)=>{
   if(/^(?:[a-z]+:|#|\/)/i.test(target))return all;
   const [p,...frag]=target.split('#');const rel=path.posix.normalize(path.posix.join(path.posix.dirname(file),p));
   return ']('+rel+(frag.length?'#'+frag.join('#'):'')+')';
 });
 out+='\n\n---\n\nSource: '+file+'\n\n'+adjusted.trim()+'\n';
}
fs.writeFileSync(path.join(root,'HANDOVER-FOR-ANOTHER-AI.md'),out);
console.log(JSON.stringify({briefing:'HANDOVER-FOR-ANOTHER-AI.md',documents:files.length,bytes:Buffer.byteLength(out)}));
