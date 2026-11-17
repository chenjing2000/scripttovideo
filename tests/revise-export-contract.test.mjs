import test from 'node:test';
import assert from 'node:assert/strict';
import {assertScriptToVideo,assertRevisedForExport,assertPresentationProjectForExport} from '../scripts/script-to-video-contract.mjs';
import {assertExportPagePlan} from '../scripts/page-plan-validation.mjs';

const original={script_to_video:{format:'script-to-video',schemaVersion:3},title:'',language:'en',
 segments:[{words:[{word:'Hello',start:0,end:0.5},{word:'world',start:0.5,end:1}]}]};
const revised={...original,title:'A title',script_to_video:{format:'script-to-video',schemaVersion:3},
 segments:[{words:[{word:'Hi',start:0,end:0.5,hidden:true},{word:'earth',start:0.5,end:1}]}]};
const project={format:'script-to-video-project',schemaVersion:3,
 script:{filename:'sample.script.json'},
 canvas:{width:1200,height:1600},style:{textAlign:'left',fontFamily:'Arial',fontSize:40,
 fontWeight:400,lineHeight:1.4,paragraphGap:20,paddingX:36,paddingY:30,
 textColor:'#293847',highlightColor:'#b81a35',backgroundColor:'#f7f4ec'},
 export:{fps:30,quality:'standard'}};
const context={mediaName:'sample.mp4',subtitleName:'sample.script.json',mediaKind:'video',transcript:original};

test('revised export accepts edited words and hidden flags but retains timing',()=>{
 assertScriptToVideo(original);
 assert.equal(assertRevisedForExport(revised,original),revised);
 assert.equal(assertPresentationProjectForExport(project,context),project);
});
test('revised export rejects timing and segment structure changes',()=>{
 assert.throws(()=>assertRevisedForExport({...revised,segments:[{words:[
 {...revised.segments[0].words[0],start:0.1},revised.segments[0].words[1]]}]},original));
 assert.throws(()=>assertRevisedForExport({...revised,segments:[]},original));
});
test('revised export rejects whitespace, bad flags, and final paragraph break',()=>{
 for(const word of ['two words','', '  ']){
  const bad=structuredClone(revised);bad.segments[0].words[0].word=word;
  assert.throws(()=>assertRevisedForExport(bad,original));
 }
 const hidden=structuredClone(revised);hidden.segments[0].words[0].hidden=false;
 assert.throws(()=>assertRevisedForExport(hidden,original));
 const paragraph=structuredClone(revised);paragraph.segments[0].words[1].breakParagraph=true;
 assert.throws(()=>assertRevisedForExport(paragraph,original));
});
test('v3 project rejects old source and overrides',()=>{
 assert.throws(()=>assertPresentationProjectForExport({...project,overrides:{}},context));
 assert.throws(()=>assertPresentationProjectForExport({...project,source:{}},context));
});

test('revised export rejects removed original word anchors and unsupported metadata',()=>{
 const missing=structuredClone(revised);missing.segments[0].words.pop();
 assert.throws(()=>assertRevisedForExport(missing,original));
 const displayOverrides=structuredClone(revised);
 displayOverrides.script_to_video.displayOverrides={s0w0:'Other'};
 assert.throws(()=>assertRevisedForExport(displayOverrides,original));
});
test('v3 project rejects mismatched source names and invalid presentation values',()=>{
 assert.throws(()=>assertPresentationProjectForExport(
  {...project,script:{filename:'different.script.json'}},context));
 assert.throws(()=>assertPresentationProjectForExport(
  {...project,canvas:{width:1201,height:1600}},context));
});

test('page-plan preflight excludes hidden revised words without v2 overrides',()=>{
 const transcript=structuredClone(revised);
 transcript.segments[0].words[1].hidden=true;
 const empty={pages:[],switches:[],warnings:[],viewportWidth:1200,viewportHeight:900,
  availableWidth:1100,availableHeight:800};
 assert.doesNotThrow(()=>assertExportPagePlan(empty,transcript,1200,900));
 const visible=structuredClone(revised);
 assert.throws(()=>assertExportPagePlan(empty,visible,1200,900));
});
