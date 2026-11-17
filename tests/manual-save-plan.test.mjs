import test from 'node:test';
import assert from 'node:assert/strict';
import {planManualSave} from '../.tmp-core/manual-save-plan.js';
import {parseScriptToVideo} from '../.tmp-core/transcript.js';
import {createProject} from '../.tmp-core/project.js';
const source={script_to_video:{format:'script-to-video',schemaVersion:3},title:'',language:'en',segments:[{words:[{word:'Hello',start:0,end:0.5},{word:'world',start:0.5,end:1}]}]};
const words=parseScriptToVideo(source).words,project=createProject('x.mp4','x.script.json');
test('Ctrl+S snapshot always includes complete revise, TXT and project',()=>{
 const saved=planManualSave(source,project,words,'');
 assert.equal(saved.revised.script_to_video.schemaVersion,3);
 assert.equal(saved.text,'Hello world');
 assert.equal(saved.project.script.filename,'x.script.json');
 assert.deepEqual(saved.project,project);
});
test('snapshot contains word edits while original v3 remains untouched',()=>{
 const changed=words.map((w,i)=>i===0?{...w,display:'Hi'}:w);
 const saved=planManualSave(source,project,changed,'Headline');
 assert.equal(saved.revised.title,'Headline');
 assert.equal(saved.revised.segments[0].words[0].word,'Hi');
 assert.match(saved.text,/Hi world/);
 assert.equal(source.segments[0].words[0].word,'Hello');
});
test('snapshot validates original time anchors',()=>{
 assert.throws(()=>planManualSave(source,project,[{...words[0],start:1},words[1]],''),/锚点/);
});
