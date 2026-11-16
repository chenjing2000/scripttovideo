import test from 'node:test';
import assert from 'node:assert/strict';
import {planManualSave} from '../.tmp-core/manual-save-plan.js';
import {parseScriptToVideo} from '../.tmp-core/transcript.js';
import {buildRefinedScript,buildRefinedText} from '../.tmp-core/refined.js';
import {createProject} from '../.tmp-core/project.js';
import {toPresentationProject} from '../.tmp-core/project-v3.js';

const source={
 script_to_video:{format:'script-to-video',schemaVersion:2},
 title:'Original',language:'en',
 segments:[{words:[{word:'Hello',start:0,end:0.5},{word:'world',start:0.5,end:1}]}]
};
function fixture(){
 const words=parseScriptToVideo(source).words;
 const project=createProject('sample.mp4','sample.script.json',words);
 project.source.subtitleSha256='a'.repeat(64);
 const refined=buildRefinedScript(source,'Original',words);
 const text=buildRefinedText('Original',words);
 const presentation=toPresentationProject(project);
 return {words,project,refined,text,presentation};
}

test('unchanged content and presentation require no writes',()=>{
 const f=fixture();
 const plan=planManualSave(source,f.refined,f.text,f.presentation,f.project,f.words,'Original');
 assert.equal(plan.contentChanged,false);
 assert.equal(plan.projectChanged,false);
});

test('word changes update refined and TXT, not presentation',()=>{
 const f=fixture();
 const words=f.words.map((word,i)=>i===0?{...word,display:'Hi'}:word);
 const plan=planManualSave(source,f.refined,f.text,f.presentation,f.project,words,'Original');
 assert.equal(plan.contentChanged,true);
 assert.equal(plan.projectChanged,false);
 assert.equal(plan.refined.segments[0].words[0].word,'Hi');
 assert.match(plan.text,/Hi/);
 assert.equal(source.segments[0].words[0].word,'Hello');
});

test('style-only changes require only presentation write',()=>{
 const f=fixture();
 const project={...f.project,style:{...f.project.style,fontSize:f.project.style.fontSize+2}};
 const plan=planManualSave(source,f.refined,f.text,f.presentation,project,f.words,'Original');
 assert.equal(plan.contentChanged,false);
 assert.equal(plan.projectChanged,true);
 assert.equal(plan.project.style.fontSize,project.style.fontSize);
});

test('savedAt-only changes do not trigger a write',()=>{
 const f=fixture();
 const project={...f.project,savedAt:'2026-11-16T10:00:00Z'};
 const plan=planManualSave(source,f.refined,f.text,f.presentation,project,f.words,'Original');
 assert.equal(plan.projectChanged,false);
 assert.deepEqual(plan.project,f.presentation);
});

test('missing presentation file requires creation even without edits',()=>{
 const f=fixture();
 const plan=planManualSave(source,f.refined,f.text,null,f.project,f.words,'Original');
 assert.equal(plan.contentChanged,false);
 assert.equal(plan.projectChanged,true);
});

test('changing immutable original timing anchor is rejected',()=>{
 const f=fixture();
 const words=f.words.map((word,i)=>i===0?{...word,start:0.1}:word);
 assert.throws(()=>planManualSave(source,f.refined,f.text,f.presentation,f.project,words,'Original'),/锚点/);
});
