import test from 'node:test';
import assert from 'node:assert/strict';
import {assertScriptToVideo,assertRefinedForExport,assertPresentationProjectForExport} from '../scripts/script-to-video-contract.mjs';
import {createHash} from 'node:crypto';

const original={script_to_video:{format:'script-to-video',schemaVersion:2},language:'en',
 segments:[{words:[{word:'Hello',start:0,end:0.5},{word:'world',start:0.5,end:1}]}]};
const refined={...original,title:'A title',script_to_video:{format:'script-to-video',schemaVersion:3},
 segments:[{words:[{word:'Hi',start:0,end:0.5,hidden:true},{word:'earth',start:0.5,end:1}]}]};
const sourceBytes=Buffer.from(JSON.stringify(original));
const project={format:'script-to-video-project',schemaVersion:3,
 source:{videoName:'sample.mp4',subtitleName:'sample.script.json',
 subtitleSha256:createHash('sha256').update(sourceBytes).digest('hex')},
 canvas:{width:1200,height:1600},style:{textAlign:'left',fontFamily:'Arial',fontSize:40,
 fontWeight:400,lineHeight:1.4,paragraphGap:20,paddingX:36,paddingY:30,
 textColor:'#293847',highlightColor:'#b81a35',backgroundColor:'#f7f4ec'},
 export:{fps:30,quality:'standard'}};
const context={mediaName:'sample.mp4',subtitleName:'sample.script.json',subtitleBytes:sourceBytes,
 mediaKind:'video',transcript:original};

test('refined export accepts edited words and hidden flags but retains timing',()=>{
 assertScriptToVideo(original);
 assert.equal(assertRefinedForExport(refined,original),refined);
 assert.equal(assertPresentationProjectForExport(project,context),project);
});
test('refined export rejects timing and segment structure changes',()=>{
 assert.throws(()=>assertRefinedForExport({...refined,segments:[{words:[
 {...refined.segments[0].words[0],start:0.1},refined.segments[0].words[1]]}]},original));
 assert.throws(()=>assertRefinedForExport({...refined,segments:[]},original));
});
test('refined export rejects whitespace, bad flags, and final paragraph break',()=>{
 for(const word of ['two words','', '  ']){
  const bad=structuredClone(refined);bad.segments[0].words[0].word=word;
  assert.throws(()=>assertRefinedForExport(bad,original));
 }
 const hidden=structuredClone(refined);hidden.segments[0].words[0].hidden=false;
 assert.throws(()=>assertRefinedForExport(hidden,original));
 const paragraph=structuredClone(refined);paragraph.segments[0].words[1].breakParagraph=true;
 assert.throws(()=>assertRefinedForExport(paragraph,original));
});
test('v3 project rejects overrides and mismatched immutable source fingerprint',()=>{
 assert.throws(()=>assertPresentationProjectForExport({...project,overrides:{}},context));
 assert.throws(()=>assertPresentationProjectForExport({...project,source:{...project.source,subtitleSha256:'0'.repeat(64)}},context));
});

test('refined export rejects removed original word anchors and unsupported metadata',()=>{
 const missing=structuredClone(refined);missing.segments[0].words.pop();
 assert.throws(()=>assertRefinedForExport(missing,original));
 const displayOverrides=structuredClone(refined);
 displayOverrides.script_to_video.displayOverrides={s0w0:'Other'};
 assert.throws(()=>assertRefinedForExport(displayOverrides,original));
});
test('v3 project rejects mismatched source names and invalid presentation values',()=>{
 assert.throws(()=>assertPresentationProjectForExport(
  {...project,source:{...project.source,subtitleName:'different.script.json'}},context));
 assert.throws(()=>assertPresentationProjectForExport(
  {...project,canvas:{width:1201,height:1600}},context));
});
