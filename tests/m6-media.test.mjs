import test from 'node:test';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const {MEDIA_PRIORITY,findMediaCandidates,transcriptStem,validCanvas}=require('../.tmp-core/media.js');
test('JSON drives prioritized same-stem media discovery',()=>{
 const f='My Lesson.script.json',files=['My Lesson.wav','My Lesson.mkv','My Lesson.mp3','My Lesson.mp4'];
 assert.equal(transcriptStem(f),'My Lesson');
 assert.deepEqual(findMediaCandidates(f,files)[0]?.name,'My Lesson.mp4');
 assert.deepEqual(findMediaCandidates(f,files.slice(0,3))[0]?.name,'My Lesson.mkv');
 assert.deepEqual(findMediaCandidates(f,['My Lesson.WAV','My Lesson.MP3'])[0]?.kind,'audio');
 assert.equal(findMediaCandidates(f,['Other.mp4']).length,0);
 assert.throws(()=>transcriptStem('raw.json'));
});
test('Canvas accepts even pixels and rejects invalid export dimensions',()=>{
 assert.ok(validCanvas(1200,1600));assert.ok(validCanvas(1920,1080));
 for(const [w,h] of [[0,1600],[1201,1600],[1200,1601],[4000,1080],[640,200]])assert.equal(validCanvas(w,h),false);
});

test('M6.17: five allowed formats are tried in fixed priority, independent of directory order',()=>{
 const f='Lesson.script.json',names=['Lesson.wav','Lesson.mp3','Lesson.m4a','Lesson.mkv','Lesson.mp4','Lesson.mov','Lesson.webm','Lesson.flac','other.mp4'];
 const candidates=findMediaCandidates(f,names);
 assert.deepEqual(MEDIA_PRIORITY,['.mp4','.mkv','.m4a','.mp3','.wav']);
 assert.deepEqual(candidates.map(c=>c.name),['Lesson.mp4','Lesson.mkv','Lesson.m4a','Lesson.mp3','Lesson.wav']);
 assert.deepEqual(candidates.map(c=>c.kind),['video','video','audio','audio','audio']);
 assert.deepEqual(findMediaCandidates(f,['LESSON.M4A']),[{name:'LESSON.M4A',kind:'audio',extension:'.m4a'}]);
 assert.deepEqual(findMediaCandidates(f,['Lesson.flac','Lesson.aac','Lesson.mov','Lesson.webm','sub/Lesson.mp4']),[]);
});
