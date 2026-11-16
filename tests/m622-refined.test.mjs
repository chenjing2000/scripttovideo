import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parseScriptToVideo,validateScriptToVideo}=require('../.tmp-core/transcript.js');
const {buildRefinedScript,buildRefinedText}=require('../.tmp-core/refined.js');

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
