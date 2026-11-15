import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {assertScriptToVideo} from '../scripts/script-to-video-contract.mjs';
const require=createRequire(import.meta.url);
const core=require('../.tmp-core/index.js');
const fixture=JSON.parse(readFileSync('fixtures/6 Minute English 01-seg1.script.json','utf8'));
const read=p=>readFileSync(p,'utf8');

test('M6.16: new script file keeps word anchors and semantic breaks',()=>{
  const parsed=core.parseScriptToVideo(fixture);
  assert.equal(assertScriptToVideo(fixture).wordCount,parsed.words.length);
  assert.ok(parsed.words.some(w=>w.breakParagraph));
  assert.equal(core.transcriptStem('Lesson.SCRIPT.JSON'),'Lesson');
  assert.throws(()=>core.transcriptStem('Lesson.transcript-studio.json'));
});
test('M6.16: all former subtitle and project formats are rejected',()=>{
  const old=structuredClone(fixture);
  old.transcript_studio=old.script_to_video;
  delete old.script_to_video;
  assert.throws(()=>assertScriptToVideo(old),/ScriptToVideo v2/);
  assert.throws(()=>core.parseScriptToVideo(old),/ScriptToVideo v2/);
  const p=core.createProject('Lesson.mp4','Lesson.script.json',core.parseScriptToVideo(fixture).words);
  assert.equal(core.validateProject(p),true);
  assert.equal(core.validateProject({...p,format:'transcript-studio-project'}),false);
  assert.equal(core.validateProject({...p,source:{...p.source,subtitleName:'Lesson.transcript-studio.json'}}),false);
});
test('M6.16: settings never import old formats and host has no migration',()=>{
  assert.equal(core.SETTINGS_FILENAME,'scripttovideo.settings.json');
  assert.equal(core.validateSettings({...core.DEFAULT_SETTINGS,format:'transcriptstudio-settings'}),false);
  const host=read('desktop/ReaderWindow.cs');
  assert.ok(host.includes('SettingsFileName = "scripttovideo.settings.json"'));
  assert.doesNotMatch(host,/TryMigrateLegacySettings|LegacySettingsFileName/);
});
test('M6.16: desktop and CLI names and Remotion composition agree',()=>{
  assert.match(read('desktop/ScriptToVideo.csproj'),/<AssemblyName>ScriptToVideo<\/AssemblyName>/);
  assert.match(read('desktop/ScriptToVideo.csproj'),/script-to-video-contract\.mjs/);
  assert.match(read('src/remotion/Root.tsx'),/id="ScriptToVideo"/);
  assert.match(read('scripts/export.mjs'),/c\.id==='ScriptToVideo'/);
  assert.match(read('src/main.tsx'),/accept="\.script\.json"/);
});
