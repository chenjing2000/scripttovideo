import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {assertScriptToVideo} from '../scripts/script-to-video-contract.mjs';
const require=createRequire(import.meta.url),core=require('../.tmp-core/index.js');
const data=JSON.parse(readFileSync('fixtures/6 Minute English 01-seg1.script.json','utf8'));
const raw=JSON.parse(readFileSync('fixtures/6 Minute English 01-seg1.json','utf8'));
const clone=structuredClone;
function okay(d){const cli=assertScriptToVideo(d),parsed=core.parseScriptToVideo(d);assert.equal(cli.wordCount,parsed.words.length);return parsed;}
function reject(d,pattern){assert.throws(()=>assertScriptToVideo(d),pattern);assert.throws(()=>core.parseScriptToVideo(d),pattern);}
test('M5: v3 200 source anchor words/times preserved',()=>{
 const t=okay(data);assert.equal(t.words.length,200);
 assert.deepEqual(t.words.map(w=>[w.original,w.start,w.end]),raw.segments.flatMap(s=>s.words.map(w=>[w.word.trim(),w.start,w.end])));
});
test('M5: no break after animal lovers; In the UK shares paragraph',()=>{
 const t=okay(data);const a=t.words.find(w=>w.original==='lovers.');assert.equal(a.breakParagraph,false);
 assert.equal(t.words.find(w=>w.original==='without.').breakParagraph,true);
});
test('M5: only v3 with title accepted; raw, v2, v1 and old fields rejected',()=>{
 reject(raw,/v3/);
 const a=clone(data);a.script_to_video.schemaVersion=1;reject(a,/v3/);
 const old=clone(data);old.script_to_video.schemaVersion=2;reject(old,/v3/);
 const missingTitle=clone(data);delete missingTitle.title;reject(missingTitle,/title/);
 const wrongTitle=clone(data);wrongTitle.title=null;reject(wrongTitle,/title/);
 const b=clone(data);b.enscript={format:'enscript-transcript',schemaVersion:1,paragraphBreaksAfter:[]};reject(b,/旧|禁止/);
 const c=clone(data);c.segments[0].words[0].paragraphAfter=true;reject(c,/旧/);
});
test('M5: word break can split inside segment; no break on punctuation alone',()=>{
 const a=clone(data);a.segments[4].words[9].breakParagraph=true;
 const t=okay(a);assert.equal(t.words.find(w=>w.id==='s4w9').breakParagraph,true);
 assert.equal(t.words.find(w=>w.id==='s4w8').breakParagraph,false);
});
test('M5: false, null, string and terminal break invalid',()=>{
 for(const value of [false,null,'true',0]){const a=clone(data);a.segments[4].words[9].breakParagraph=value;reject(a,/breakParagraph/);}
 const b=clone(data);b.segments.at(-1).words.at(-1).breakParagraph=true;reject(b,/最后|末词/);
});
test('M5: word_segments is only raw data, never a break carrier',()=>{
 const a=clone(data);a.word_segments[1].breakParagraph=true;reject(a,/word_segments/);
});

test('M5: unknown schema keys and all displayOverrides rejected',()=>{
 const a=clone(data);a.script_to_video.extra=true;reject(a,/字段/);
 const b=clone(data);b.script_to_video.displayOverrides={'s4w0':'two words'};reject(b,/displayOverrides|字段|覆盖/);
});
test('M5: malformed or reversed source word timestamps rejected',()=>{
 const a=clone(data);a.segments[3].words[0].start=-10;reject(a,/时间/);
 const b=clone(data);b.segments[3].words[0].word='two tokens';reject(b,/单词/);
});

test('Code review: saved project rejects malformed style and old subtitle overrides',()=>{
 const p=core.createProject('lesson.script.json');
 assert.equal(core.validateProject(p),true);
 assert.equal(core.validateProject({...p,mediaKind:'audio'}),true);
 assert.equal(core.normalizeProjectStyle({...p,mediaKind:'audio'}).mediaKind,undefined);
 assert.equal(core.validateProject({...p,style:{...p.style,fontSize:0}}),false);
 assert.equal(core.validateProject({...p,style:{...p.style,paddingX:-3}}),false);
 assert.equal(core.validateProject({...p,style:{...p.style,textColor:'red'}}),false);
 assert.equal(core.validateProject({...p,export:{fps:25,quality:'standard'}}),false);
 assert.equal(core.validateProject({...p,overrides:{s1w2:{breakParagraph:'yes'}}}),false);
 assert.equal(core.validateProject({...p,script:{filename:'wrong.json'}}),false);
});
