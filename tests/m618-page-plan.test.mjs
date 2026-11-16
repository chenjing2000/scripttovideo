import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertExportPagePlan} from '../scripts/page-plan-validation.mjs';

const transcript={segments:[{words:[{start:0,end:1},{start:1,end:2}]}]};
const word=(index,id)=>({index,id,x:index*30,width:20});
const row={startWord:0,endWord:1,top:10,height:20,paragraphStart:true,paragraphEnd:true,endsSentence:false,words:[word(0,'s0w0'),word(1,'s0w1')]};
const page={index:0,rows:[row],firstWordId:'s0w0',lastWordId:'s0w1',firstStart:0,lastEnd:2,usedHeight:20};
const valid={pages:[page],switches:[0],warnings:[],availableWidth:180,availableHeight:80,viewportWidth:200,viewportHeight:100};
const clone=v=>structuredClone(v);
const check=(p,t=transcript)=>assertExportPagePlan(p,t,200,100);
test('CR-010: valid explicit page plan passes preflight',()=>assert.doesNotThrow(()=>check(clone(valid))));
test('CR-010: invalid viewport, page structure and word IDs fail preflight',()=>{
 for(const mutate of [
  p=>p.viewportHeight=101,
  p=>p.pages[0].rows=[],
  p=>p.pages[0].rows[0].words[0].id='wrong',
  p=>p.pages[0].rows[0].words.pop(),
  p=>p.switches[0]=1,
  p=>p.pages[0].rows[0].top=99,
  p=>p.pages[0].firstWordId='wrong'
 ]){const p=clone(valid);mutate(p);assert.throws(()=>check(p),/Invalid export page-plan snapshot/);}
});
test('CR-010: hidden source words must not appear in explicit plan',()=>{
 const hidden=clone(transcript);
 hidden.segments[0].words[1].hidden=true;
 assert.throws(()=>check(clone(valid),hidden),/Invalid export page-plan snapshot/);
});
test('CR-010: no explicit page plan retains automatic pagination in preview',()=>{
 const canvas=readFileSync('src/ui/ReaderCanvas.tsx','utf8');
 assert.match(canvas,/if\(pagePlan!==undefined\)/);
 assert.match(canvas,/throw new Error\('Invalid export page-plan snapshot/);
 assert.match(canvas,/return paginate\(words,style,canvasWidth,availableHeight/);
});
test('CR-010: CLI preflights snapshots before Remotion bundling',()=>{
 const cli=readFileSync('scripts/export.mjs','utf8');
 assert.match(cli,/assertExportPagePlan\(pagePlan,input,width,height-videoHeight\)/);
 assert.ok(cli.indexOf('assertExportPagePlan(pagePlan')<cli.indexOf("await import('@remotion/bundler')"));
});

test('CR-010: desktop publish embeds the CLI page-plan validator',()=>{
 const project=readFileSync('desktop/ScriptToVideo.csproj','utf8');
 assert.match(project,/EmbeddedResource Include="\.\.\/scripts\/page-plan-validation\.mjs" LogicalName="TSRUNTIME\/scripts\/page-plan-validation\.mjs"/);
});
