import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const C=require('../.tmp-core/index.js');
const fixture=JSON.parse(fs.readFileSync('fixtures/demo.script.json','utf8'));
const transcript=C.parseScriptToVideo(fixture);
test('WhisperX parse: stable IDs, source timestamps',()=>{assert.equal(transcript.words.length,14);assert.equal(transcript.words[0].id,'s0w0');assert.equal(transcript.words[0].start,.3)});
test('WhisperX invalid source reports error',()=>assert.throws(()=>C.parseScriptToVideo({segments:[]})));
test('Word editing never changes timing',()=>{const copy=C.updateWord(transcript.words,'s0w0','Read');assert.equal(copy[0].display,'Read');assert.equal(copy[0].start,.3);assert.equal(transcript.words[0].display,'Reading');assert.throws(()=>C.updateWord(copy,'s0w0','two words'))});
test('Linear word-progress boundaries and rewind',()=>{assert.equal(C.wordProgress(0,1,2),0);assert.equal(C.wordProgress(1.5,1,2),.5);assert.equal(C.wordProgress(3,1,2),1);assert.equal(C.wordProgress(1,2,2),0)});

test('project settings never mutate original transcript',()=>{const p=C.createProject('demo.script.json');assert.equal(p.script.filename,'demo.script.json');assert.equal(transcript.words[0].original,'Reading')});
