import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parseScriptToVideo,validateScriptToVideo}=require('../.tmp-core/transcript.js');
const {buildRefinedScript,buildRefinedText}=require('../.tmp-core/refined.js');
const {createProject}=require('../.tmp-core/project.js');
const {refinedFileNames}=require('../.tmp-core/refined-paths.js');
const {planRefinedOpen}=require('../.tmp-core/refined-open.js');
const {validatePresentationProject,toPresentationProject}=require('../.tmp-core/project-v3.js');

const source={script_to_video:{format:'script-to-video',schemaVersion:2},language:'en',segments:[{words:[{word:'Hello',start:0,end:0.4},{word:'world.',start:0.4,end:1}]}]};
test('M6.22: v2 to full v3 refined, title and word edits survive round trip',()=>{
 const parsed=parseScriptToVideo(source);
 const words=parsed.words.map((w,i)=>i===0?{...w,display:'Hi',breakParagraph:true}:w);
 const refined=buildRefinedScript(source,'Edited title',words);
 assert.equal(refined.script_to_video.schemaVersion,3);
 assert.equal(refined.title,'Edited title');
 assert.equal(refined.segments[0].words[0].word,'Hi');
 assert.equal(refined.segments[0].words[0].start,0);
 assert.equal(refined.segments[0].words[0].breakParagraph,true);
 assert.equal(parseScriptToVideo(refined).words[0].display,'Hi');
 assert.equal(buildRefinedText('Edited title',words),'Edited title\r\n\r\nHi\r\n\r\nworld.');
 validateScriptToVideo(refined);
});
test('M6.22: hidden word remains in JSON but is absent from TXT',()=>{
 const words=parseScriptToVideo(source).words.map((w,i)=>i===0?{...w,hidden:true}:w);
 const refined=buildRefinedScript(source,'',words);
 assert.equal(refined.segments[0].words.length,2);
 assert.equal(refined.segments[0].words[0].hidden,true);
 assert.equal(refined.segments[0].text,'world.');
 assert.equal(buildRefinedText('',words),'world.');
 assert.equal(parseScriptToVideo(refined).words[0].hidden,true);
});
test('M6.22: rejects reordered or retimed anchors',()=>{
 const words=parseScriptToVideo(source).words;
 assert.throws(()=>buildRefinedScript(source,'',words.slice().reverse()),/锚点/);
 assert.throws(()=>buildRefinedScript(source,'',[{...words[0],start:2},words[1]]),/锚点/);
});
test('M6.22: v3 requires title including empty title',()=>{
 const refined=buildRefinedScript(source,'',parseScriptToVideo(source).words);
 assert.equal(refined.title,'');
 assert.throws(()=>validateScriptToVideo({...refined,title:null}),/title/);
});


test('M6.22: v3 presentation projects reject embedded subtitle overrides',()=>{
 const view=createProject('demo.mp4','demo.script.json',parseScriptToVideo(source).words);
 const clean=toPresentationProject(view);
 assert.equal(validatePresentationProject({...clean,overrides:{}}),false);
 assert.equal(validatePresentationProject({...clean,schemaVersion:2}),false);
 assert.equal(validatePresentationProject({...clean,style:{...clean.style,fontSize:-1}}),false);
});

test('M6.22: canonical paths stay inside the existing work folder',()=>{
 assert.deepEqual(refinedFileNames('lesson01.script.json'),{
  workFolder:'lesson01',project:'lesson01.project.json',
  refined:'lesson01.script.revise.json',text:'lesson01.txt'});
 assert.throws(()=>refinedFileNames('../bad.script.json'),/无效/);
 assert.throws(()=>refinedFileNames('bad.json'),/script.json/);
});
test('M6.22: refined rejects whitespace within one word',()=>{
 const words=parseScriptToVideo(source).words.map((w,i)=>i===0?{...w,display:'two words'}:w);
 assert.throws(()=>buildRefinedScript(source,'',words),/文字无效/);
});

test('M6.22: first open creates refined even with no edits',()=>{
 const plan=planRefinedOpen(source,null,null);
 assert.equal(plan.kind,'create');
 assert.equal(plan.refined.script_to_video.schemaVersion,3);
 assert.equal(plan.txt,'Hello world.');
});
test('M6.22: existing refined remains authoritative',()=>{
 const words=parseScriptToVideo(source).words.map((w,i)=>i===0?{...w,display:'Hi'}:w);
 const refined=buildRefinedScript(source,'Title',words);
 const plan=planRefinedOpen(source,refined,null);
 assert.equal(plan.kind,'existing');
 assert.equal(plan.refined,refined);
 assert.equal(plan.txt,'Title\r\n\r\nHi world.');
});
test('M6.22: existing invalid refined is never silently replaced',()=>{
 const refined=buildRefinedScript(source,'',parseScriptToVideo(source).words);
 assert.throws(()=>planRefinedOpen(source,{...refined,title:null},null),/title/);
 const mismatched=structuredClone(refined);
 mismatched.segments[0].words[0].start=0.1;
 assert.throws(()=>planRefinedOpen(source,mismatched,null),/时间锚点/);
});

test('M6.22: v3 project requires a valid refined working copy',()=>{
 const original=createProject('demo.mp4','demo.script.json',parseScriptToVideo(source).words);
 const v3=toPresentationProject(original);
 assert.equal(validatePresentationProject(v3),true);
 assert.throws(()=>planRefinedOpen(source,null,v3),/缺少 \.script\.revise\.json/);
 const refined=buildRefinedScript(source,'',parseScriptToVideo(source).words);
 assert.equal(planRefinedOpen(source,refined,v3).kind,'existing');
 assert.throws(()=>planRefinedOpen(source,refined,{...v3,overrides:{}}),/仅支持 project v3/);
});

test('M6.22: refined does not preserve stale duplicate word_segments',()=>{
 const input={...source,word_segments:[{word:'obsolete',start:0,end:0.4}]};
 const words=parseScriptToVideo(input).words.map((w,i)=>i===0?{...w,display:'Updated'}:w);
 const refined=buildRefinedScript(input,'',words);
 assert.equal(Object.hasOwn(refined,'word_segments'),false);
 assert.equal(refined.segments[0].words[0].word,'Updated');
});



test('M6.22: revised v3 must never be opened or regenerated as immutable source v2',()=>{
 const revised=buildRefinedScript(source,'A title',parseScriptToVideo(source).words);
 assert.throws(()=>planRefinedOpen(revised,null,null),/v2/);
 assert.throws(()=>buildRefinedScript(revised,'new title',parseScriptToVideo(revised).words),/v2/);
 
});

test('M6.22 breaking: old project v2 is rejected with or without revised content',()=>{
 const old=createProject('demo.mp4','demo.script.json',parseScriptToVideo(source).words);
 const revised=buildRefinedScript(source,'Current',parseScriptToVideo(source).words);
 assert.throws(()=>planRefinedOpen(source,null,old),/仅支持 project v3/);
 assert.throws(()=>planRefinedOpen(source,revised,old),/仅支持 project v3/);
});
