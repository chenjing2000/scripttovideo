import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../.tmp-core/index.js');

const transcript = core.parseScriptToVideo({title:'',language:'en',script_to_video:{format:'script-to-video',schemaVersion:3},segments: [
  {words: [{word:'Hello.',start:7.293,end:7.613}]},
  {words: [{word:'Here',start:8,end:8.4},{word:'again.',start:8.5,end:9}]}
]});
const style = {...core.DEFAULT_STYLE, fontSize: 10, lineHeight: 1, paddingX: 0, paddingY: 0};
const measure = text => text.length * 5;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8);

test('Silent opening is uncolored and stationary, with stateless midpoint and rewind', () => {
  const word = transcript.words[0];
  const layout = core.buildLayout(transcript.words, style, 30, 20, measure);
  const plan = core.buildScrollPlan(layout);
  for (const time of [0, 7, 7.292]) {
    assert.equal(core.wordProgress(time, word.start, word.end), 0);
    assert.equal(core.scrollOffset(plan, time), 0);
  }
  const middle = (word.start + word.end) / 2;
  near(core.wordProgress(middle, word.start, word.end), .5);
  assert.equal(core.wordProgress(word.end + 1, word.start, word.end), 1);
  near(core.wordProgress(middle, word.start, word.end), .5);
  assert.equal(core.wordProgress(0, word.start, word.end), 0);
  assert.equal(word.display, 'Hello.');
});


test('Queued scroll consumes remaining silence and stays continuous and bounded', () => {
  const rows = [[0,1],[1.01,1.03],[1.05,1.06],[1.8,2]].map(([firstStart,lastEnd], index) => ({
    index, firstStart, lastEnd, top: index === 3 ? 80 : index * 20, bottom: index === 3 ? 100 : (index + 1) * 20,
    startWord: index, endWord: index
  }));
  const plan = core.buildScrollPlan({rows, totalHeight:100, viewportHeight:40, viewportWidth:100, wordRows:[0,1,2,3]});
  assert.equal(plan.events.length, 3);
  near(plan.events[0].end, 1.15);
  near(plan.events[1].start, 1.15);
  near(plan.events[1].end, 1.30);
  near(plan.events[2].start, 1.30);
  near(plan.events[2].end, 1.80);
  let last = 0;
  for (let time = 0; time < 2.1; time += .001) {
    const next = core.scrollOffset(plan, time);
    assert.ok(next >= last && next <= 60);
    assert.ok(next - last < .3, 'adjacent 1 ms samples must remain continuous');
    last = next;
  }
  near(core.scrollOffset(plan, 2), 60);
  const midpoint = core.scrollOffset(plan, 1.55);
  near(midpoint, 50);
  near(core.scrollOffset(plan, 0), 0);
  near(core.scrollOffset(plan, 1.55), midpoint);
});


test('edited paragraphs are independent of the source JSON',()=>{const original=transcript.words;const revised=original.map(w=>w.id==='s1w0'?{...w,breakParagraph:true}:w);assert.equal(revised[1].breakParagraph,true);assert.equal(original[1].breakParagraph,false)});
