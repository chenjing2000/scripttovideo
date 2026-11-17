import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parseScriptToVideo,validateScriptToVideo}=require('../.tmp-core/transcript.js');
const {buildRevisedScript,buildRevisedText}=require('../.tmp-core/revise.js');
const {createProject}=require('../.tmp-core/project.js');
const {reviseFileNames}=require('../.tmp-core/revise-paths.js');
const {planReviseOpen}=require('../.tmp-core/revise-open.js');
const {validatePresentationProject,toPresentationProject}=require('../.tmp-core/project-v3.js');

const source={script_to_video:{format:'script-to-video',schemaVersion:3},title:'',language:'en',segments:[{words:[{word:'Hello',start:0,end:0.4},{word:'world.',start:0.4,end:1}]}]};
test('M6.22: v3 original to v3 revised, title and word edits survive round trip',()=>{
 const parsed=parseScriptToVideo(source);
 const words=parsed.words.map((w,i)=>i===0?{...w,display:'Hi',breakParagraph:true}:w);
 const revised=buildRevisedScript(source,'Edited title',words);
 assert.equal(revised.script_to_video.schemaVersion,3);
 assert.equal(revised.title,'Edited title');
 assert.equal(revised.segments[0].words[0].word,'Hi');
 assert.equal(revised.segments[0].words[0].start,0);
 assert.equal(revised.segments[0].words[0].breakParagraph,true);
 assert.equal(parseScriptToVideo(revised).words[0].display,'Hi');
 assert.equal(buildRevisedText('Edited title',words),'Edited title\r\n\r\nHi\r\n\r\nworld.');
 validateScriptToVideo(revised);
});
test('M6.22: hidden word remains in JSON but is absent from TXT',()=>{
 const words=parseScriptToVideo(source).words.map((w,i)=>i===0?{...w,hidden:true}:w);
 const revised=buildRevisedScript(source,'',words);
 assert.equal(revised.segments[0].words.length,2);
 assert.equal(revised.segments[0].words[0].hidden,true);
 assert.equal(revised.segments[0].text,'world.');
 assert.equal(buildRevisedText('',words),'world.');
 assert.equal(parseScriptToVideo(revised).words[0].hidden,true);
});
test('M6.22: rejects reordered or retimed anchors',()=>{
 const words=parseScriptToVideo(source).words;
 assert.throws(()=>buildRevisedScript(source,'',words.slice().reverse()),/锚点/);
 assert.throws(()=>buildRevisedScript(source,'',[{...words[0],start:2},words[1]]),/锚点/);
});
test('M6.22: v3 requires title including empty title',()=>{
 const revised=buildRevisedScript(source,'',parseScriptToVideo(source).words);
 assert.equal(revised.title,'');
 assert.throws(()=>validateScriptToVideo({...revised,title:null}),/title/);
});


test('M6.22: v3 presentation projects reject embedded subtitle overrides',()=>{
 const view=createProject('demo.mp4','demo.script.json',parseScriptToVideo(source).words);
 const clean=toPresentationProject(view);
 assert.equal(validatePresentationProject({...clean,overrides:{}}),false);
 assert.equal(validatePresentationProject({...clean,schemaVersion:2}),false);
 assert.equal(validatePresentationProject({...clean,style:{...clean.style,fontSize:-1}}),false);
});

test('M6.22: persisted v3 validates shared fields directly without v2 coercion',()=>{
 const view=createProject('demo.mp4','demo.script.json',parseScriptToVideo(source).words);
 const p=toPresentationProject(view);
 assert.equal(validatePresentationProject(p),true);
 assert.equal(validatePresentationProject({...p,titleStyle:null}),false);
 assert.equal(validatePresentationProject({...p,titleStyle:[]}),false);
 assert.equal(validatePresentationProject({...p,source:{...p.source,subtitleName:'invalid.json'}}),false);
 assert.equal(validatePresentationProject({...p,canvas:{...p.canvas,width:321}}),false);
 assert.equal(validatePresentationProject({...p,schemaVersion:2}),false);
 assert.equal(validatePresentationProject({...p,overrides:{}}),false);
});

test('M6.22: canonical paths stay inside the existing work folder',()=>{
 assert.deepEqual(reviseFileNames('lesson01.script.json'),{
  workFolder:'lesson01',project:'lesson01.project.json',
  revised:'lesson01.script.revise.json',text:'lesson01.txt'});
 assert.throws(()=>reviseFileNames('../bad.script.json'),/无效/);
 assert.throws(()=>reviseFileNames('bad.json'),/script.json/);
});
test('M6.22: revised rejects whitespace within one word',()=>{
 const words=parseScriptToVideo(source).words.map((w,i)=>i===0?{...w,display:'two words'}:w);
 assert.throws(()=>buildRevisedScript(source,'',words),/文字无效/);
});

test('M6.22: first open creates revised even with no edits',()=>{
 const plan=planReviseOpen(source,null,null);
 assert.equal(plan.kind,'create');
 assert.equal(plan.revised.script_to_video.schemaVersion,3);
 assert.equal(plan.txt,'Hello world.');
});
test('M6.22: existing revised remains authoritative',()=>{
 const words=parseScriptToVideo(source).words.map((w,i)=>i===0?{...w,display:'Hi'}:w);
 const revised=buildRevisedScript(source,'Title',words);
 const plan=planReviseOpen(source,revised,null);
 assert.equal(plan.kind,'existing');
 assert.equal(plan.revised,revised);
 assert.equal(plan.txt,'Title\r\n\r\nHi world.');
});
test('M6.22: existing invalid revised is never silently replaced',()=>{
 const revised=buildRevisedScript(source,'',parseScriptToVideo(source).words);
 assert.throws(()=>planReviseOpen(source,{...revised,title:null},null),/title/);
 const mismatched=structuredClone(revised);
 mismatched.segments[0].words[0].start=0.1;
 assert.throws(()=>planReviseOpen(source,mismatched,null),/时间锚点/);
});

test('M6.22: v3 project requires a valid revised working copy',()=>{
 const original=createProject('demo.mp4','demo.script.json',parseScriptToVideo(source).words);
 const v3=toPresentationProject(original);
 assert.equal(validatePresentationProject(v3),true);
 assert.throws(()=>planReviseOpen(source,null,v3),/缺少 \.script\.revise\.json/);
 const revised=buildRevisedScript(source,'',parseScriptToVideo(source).words);
 assert.equal(planReviseOpen(source,revised,v3).kind,'existing');
 assert.throws(()=>planReviseOpen(source,revised,{...v3,overrides:{}}),/仅支持 project v3/);
});

test('M6.22: revised does not preserve stale duplicate word_segments',()=>{
 const input={...source,word_segments:[{word:'obsolete',start:0,end:0.4}]};
 const words=parseScriptToVideo(input).words.map((w,i)=>i===0?{...w,display:'Updated'}:w);
 const revised=buildRevisedScript(input,'',words);
 assert.equal(Object.hasOwn(revised,'word_segments'),false);
 assert.equal(revised.segments[0].words[0].word,'Updated');
});



test('M6.22 breaking: v2 subtitle input is rejected at every core entry point',()=>{
 const old={...source,script_to_video:{...source.script_to_video,schemaVersion:2}};
 assert.throws(()=>parseScriptToVideo(old),/v3/);
 assert.throws(()=>planReviseOpen(old,null,null),/v3/);
 assert.throws(()=>buildRevisedScript(old,'new title',parseScriptToVideo(source).words),/v3/);
});


test('M6.22 breaking: old project v2 is rejected with or without revised content',()=>{
 const old=createProject('demo.mp4','demo.script.json',parseScriptToVideo(source).words);
 const revised=buildRevisedScript(source,'Current',parseScriptToVideo(source).words);
 assert.throws(()=>planReviseOpen(source,null,old),/仅支持 project v3/);
 assert.throws(()=>planReviseOpen(source,revised,old),/仅支持 project v3/);
});
