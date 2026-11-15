import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {findMediaCandidates}=require('../.tmp-core/media.js');
const {probeInPriority}=require('../.tmp-core/media-probe.js');
const host=readFileSync('desktop/ReaderWindow.cs','utf8');
const server=readFileSync('desktop/LocalMediaServer.cs','utf8');
const ui=readFileSync('src/main.tsx','utf8');
const cli=readFileSync('scripts/export.mjs','utf8');

const candidates=findMediaCandidates('lesson.script.json',[
 'lesson.wav','lesson.mp3','lesson.m4a','lesson.mkv','lesson.mp4'
]);
const good={duration:42,videoRatio:null};
test('M6.17: probe stops at first decodable format and skips unreadable earlier files',async()=>{
 const seen=[];
 const r=await probeInPriority(candidates,async c=>c.name,new AbortController().signal,async (url)=>{
  seen.push(url);
  if(url.endsWith('.mp4')||url.endsWith('.mkv'))throw Error('codec unsupported');
  return good;
 });
 assert.equal(r.selected.item.name,'lesson.m4a');
 assert.deepEqual(seen,['lesson.mp4','lesson.mkv','lesson.m4a']);
 assert.deepEqual(r.failures.map(x=>x.name),['lesson.mp4','lesson.mkv']);
});
test('M6.17: all candidates fail without selecting a media source',async()=>{
 const r=await probeInPriority(candidates,async c=>c.name,new AbortController().signal,async()=>{throw Error('decode')});
 assert.equal(r.selected,null);
 assert.equal(r.failures.length,5);
});
test('M6.17: aborted import cannot commit a stale result',async()=>{
 const ctrl=new AbortController();
 await assert.rejects(probeInPriority(candidates,async c=>c.name,ctrl.signal,async()=>{ctrl.abort();return good}),/探测已取消/);
});
test('M6.17: desktop host probes without replacing the active token and commits on success',()=>{
 assert.match(host,/case "import-selected":/);
 assert.match(host,/case "import-cancel":/);
 assert.match(host,/case "pair-rejected":/);
 assert.match(host,/private void CancelPendingMediaImport\(\)/);
 assert.match(host,/server\.PrepareCandidate\(media\)/);
 assert.match(host,/server\.CommitCandidate\(selected\.Url\)/);
 assert.match(server,/tokenPaths\.TryGetValue/);
 assert.match(server,/".m4a" => "audio\/mp4"/);
 assert.match(ui,/probeInPriority\(candidates/);
 assert.match(ui,/pair-applied/);
});
test('M6.17: CLI explicitly supports M4A as audio but no unsupported formats',()=>{
 assert.match(cli,/\['\.mp4','\.mkv','\.m4a','\.mp3','\.wav'\]/);
 assert.match(cli,/\['\.m4a','\.mp3','\.wav'\]\.includes\(ext\)/);
});
