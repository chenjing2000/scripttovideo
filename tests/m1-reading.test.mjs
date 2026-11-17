import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../.tmp-core/index.js');

const transcript = core.parseScriptToVideo({title:'',language:'en',script_to_video:{format:'script-to-video',schemaVersion:3},segments: [
  {words: [{word:'Hello.',start:7.293,end:7.613}]},
  {words: [{word:'Here',start:8,end:8.4},{word:'again.',start:8.5,end:9}]}
]});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8);

test('Silent opening has no highlight and word progression is stateless on rewind', () => {
  const word = transcript.words[0];
  for (const time of [0, 7, 7.292])
    assert.equal(core.wordProgress(time, word.start, word.end), 0);
  const middle = (word.start + word.end) / 2;
  near(core.wordProgress(middle, word.start, word.end), .5);
  assert.equal(core.wordProgress(word.end + 1, word.start, word.end), 1);
  near(core.wordProgress(middle, word.start, word.end), .5);
  assert.equal(core.wordProgress(0, word.start, word.end), 0);
  assert.equal(word.display, 'Hello.');
});

test('edited paragraphs are independent of the source JSON',()=>{const original=transcript.words;const revised=original.map(w=>w.id==='s1w0'?{...w,breakParagraph:true}:w);assert.equal(revised[1].breakParagraph,true);assert.equal(original[1].breakParagraph,false)});
