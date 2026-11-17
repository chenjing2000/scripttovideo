import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const core=require('../.tmp-core/index.js');
const source={script_to_video:{format:'script-to-video',schemaVersion:3},title:'',language:'en',segments:[{words:[{word:'Hello',start:0,end:0.5},{word:'world',start:0.5,end:1}]}]};
test('revise is optional and the original v3 is authoritative until edited',()=>{
 const plan=core.planReviseOpen(source,null);
 assert.equal(plan.kind,'source');
 assert.equal(plan.script,source);
});
test('existing revise is loaded preferentially with unchanged time anchors',()=>{
 const original=core.parseScriptToVideo(source);
 const changed=original.words.map((w,i)=>i===0?{...w,display:'Hi',hidden:true}:w);
 const revised=core.buildRevisedScript(source,'Edited',changed);
 const plan=core.planReviseOpen(source,revised);
 assert.equal(plan.kind,'existing');
 assert.equal(plan.script,revised);
 assert.equal(core.parseScriptToVideo(plan.script).words[0].display,'Hi');
 assert.equal(core.buildRevisedText('Edited',changed),'Edited\r\n\r\nworld');
 assert.equal(source.segments[0].words[0].word,'Hello');
});
test('revise rejects altered time anchors and bad v2 originals',()=>{
 const w=core.parseScriptToVideo(source).words;
 const revised=core.buildRevisedScript(source,'',w);
 const invalid=structuredClone(revised);invalid.segments[0].words[0].start=0.1;
 assert.throws(()=>core.planReviseOpen(source,invalid),/锚点/);
 assert.throws(()=>core.planReviseOpen({...source,script_to_video:{...source.script_to_video,schemaVersion:2}},null),/v3/);
});
test('project v3 is the only in-memory and persisted model',()=>{
 const p=core.createProject('demo.script.json');
 assert.equal(p.schemaVersion,3);
 assert.equal(p.script.filename,'demo.script.json');
 assert.equal(core.validateProject(p),true);
 assert.equal(core.validateProject({...p,schemaVersion:2}),false);
 assert.equal(core.validateProject({...p,overrides:{}}),false);
 assert.equal(core.validateProject({...p,source:{}}),false);
 assert.equal(core.validateProject({...p,style:{...p.style,firstLineIndentCh:4}}),false);
 assert.equal(core.validateProject({...p,script:{filename:'other.json'}}),false);
});
test('revise paths are confined to the source stem folder',()=>{
 assert.deepEqual(core.reviseFileNames('lesson.script.json'),{
  workFolder:'lesson',project:'lesson.project.json',revised:'lesson.script.revise.json',text:'lesson.txt'});
 assert.throws(()=>core.reviseFileNames('../lesson.script.json'),/无效/);
});
