const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const helpers = require(path.join(root, 'backend/scripts/staffCancellationFinalEvidence.js'));
const finalRoot = path.join(root, 'logs/staff-cancellation-final-feb7697070dd45d28096711142dd7830');
function json(p) { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); }
function log(p) { const b = fs.readFileSync(p); return b[0] === 255 && b[1] === 254 ? b.subarray(2).toString('utf16le') : b.toString('utf8').replace(/^\uFEFF/, ''); }
function files(directory) { return fs.readdirSync(directory, {withFileTypes:true}).flatMap(d => d.isDirectory() ? files(path.join(directory, d.name)) : [path.join(directory, d.name)]); }
const all = files(path.join(root, 'logs'));
const hashes = Object.fromEntries(all.map(p => [path.relative(root,p).split(path.sep).join('/'), crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const hashPath = path.join(__dirname, 'historical-evidence-hashes.json');
if (!fs.existsSync(hashPath)) fs.writeFileSync(hashPath, JSON.stringify(hashes,null,2));
const review = { historicalOnly:true, finalRun:{}, historicalSummaries:[], screenshots:[], unchangedHistoricalFiles:true };
const final = json(path.join(finalRoot,'final-summary.json'));
review.finalRun = {runId:final.runId,status:final.status,exitCode:final.exitCode,startedAt:final.startedAt,finishedAt:final.finishedAt,stages:final.stages.map(s=>({id:s.id,status:s.status,exitCode:s.exitCode})),counts:final.counts,checks:[]};
for (const suite of ['cancellation','documents']) {
  const summary=json(path.join(finalRoot,suite,'summary.json'));
  const runner=json(path.join(finalRoot,suite,'runner.json'));
  helpers.validateBrowser(summary,runner,suite==='cancellation'?helpers.cancellationIds:helpers.documentIds);
  review.finalRun.checks.push({suite,readOnlyValidator:'PASS',pass:summary.pass,fail:summary.fail,skip:summary.skip,browserProduct:summary.browserProduct,runId:summary.runId});
}
for (const suite of ['focused-sql','backend-full','frontend-regression']) {
  review.finalRun.checks.push({suite,actualTap:helpers.parseTap(log(path.join(finalRoot,suite,'suite.log')))});
}
review.finalRun.cleanupRecordCount=helpers.cleanupRecords(finalRoot).length;
review.finalRun.liveDockerCleanup='NOT RECHECKED: session Docker access denied; historical cleanup stage PASS';
for (const p of all.filter(p=>/summary\.json$/.test(p))) {
  try {
    const s=json(p);
    review.historicalSummaries.push({path:path.relative(root,p).split(path.sep).join('/'),status:s.status,runId:s.runId,pass:s.pass,fail:s.fail,skip:s.skip,counts:s.counts,browserProduct:s.browserProduct,startedAt:s.startedAt,finishedAt:s.finishedAt,steps:Array.isArray(s.steps)?s.steps.map(v=>({id:v.id,status:v.status})):undefined});
  } catch { review.historicalSummaries.push({path:path.relative(root,p),readError:true}); }
}
for (const p of all.filter(p=>p.endsWith('.png'))) {
  const b=fs.readFileSync(p); const png=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  review.screenshots.push({path:path.relative(root,p).split(path.sep).join('/'),validPNG:png,width:png?b.readUInt32BE(16):null,height:png?b.readUInt32BE(20):null,sha256:hashes[path.relative(root,p).split(path.sep).join('/')]});
}
const before=json(hashPath);
review.unchangedHistoricalFiles=Object.entries(before).every(([p,h])=>hashes[p]===h);
fs.writeFileSync(path.join(__dirname,'historical-evidence-review.json'),JSON.stringify(review,null,2));
console.log(JSON.stringify({finalRun:review.finalRun,summaryCount:review.historicalSummaries.length,screenshotCount:review.screenshots.length,unchangedHistoricalFiles:review.unchangedHistoricalFiles},null,2));
