import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const host = readFileSync(new URL('../desktop/ReaderWindow.cs', import.meta.url), 'utf8');
const media = readFileSync(new URL('../desktop/LocalMediaServer.cs', import.meta.url), 'utf8');

test('M6.20: reload button follows settings and is disabled without a desktop project or while busy', () => {
  assert.match(ui, /iconButton\('settings','设置',openSettings,exporting\)}\{iconButton\('reload','重新加载当前文章',requestReload,/);
  assert.match(ui, /requestReload,!desktop\|\|!project\|\|exporting\|\|importing\|\|reloading/);
});

test('M6.20: unsaved changes require confirmation without discarding state beforehand', () => {
  assert.match(ui, /if\(hasUnsavedChanges\(\)\)\{setPendingReload\(true\);return\}/);
  assert.match(ui, /label:'放弃修改并重新加载',variant:'danger',onClick:startReload/);
  assert.match(ui, /importBaseStateRef\.current=\{currentRevision:projectEditStateRef\.current\.currentRevision,draftChanged:projectEditStateRef\.current\.draftChanged\}/);
});

test('M6.20: native reload reuses the current full transcript path and existing OpenPair', () => {
  const reload = host.split('case "reload":')[1]?.split('case "import-selected":')[0];
  assert.ok(reload, 'reload command exists');
  assert.match(reload, /source \?\? throw new InvalidOperationException/);
  assert.match(reload, /CancelPendingMediaImport\(\)/);
  assert.match(reload, /OpenPair\(current\.Transcript\)/);
  assert.doesNotMatch(reload, /LoadOrCreateSettings\(/);
});

test('M6.20: absent project is re-evaluated from disk and project save lock is reset', () => {
  assert.match(host, /File\.Exists\(projectPath\) \? File\.ReadAllText\(projectPath\) : null/);
  assert.doesNotMatch(host, /projectSaveLocked|previousProjectSaveLocked/);
  assert.match(ui, /if\(data\.project!==null\)/);
  assert.match(ui, /setProjectLoadBlocked\(blocked\)/);
});

test('M6.20: successful reload resets playback, editor and scroll', () => {
  assert.match(ui, /setMediaState\('loading'\);setTime\(0\);setPlaying\(false\)/);
  assert.match(ui, /transcriptRef\.current\?\.scrollTo\(\{top:0\}\)/);
  assert.match(ui, /setEditing\(null\);setWordTool\(null\);setToolLeaving\(false\);resetProjectDirtyState\(\)/);
});

test('M6.20: failed reload preserves existing view and clears its busy state', () => {
  assert.match(host, /kind = "reload-failed", message = error\.Message/);
  assert.match(ui, /data\.kind==='reload-failed'\)\{clearReload\(\);notify/);
  assert.match(ui, /kind:'pair-rejected',requestId:data\.requestId/);
  assert.match(host, /private void RollbackMediaImport\(/);
});

test('M6.20: refreshed media uses fresh token URLs and does not use HTTP cache', () => {
  assert.match(media, /var token = Guid\.NewGuid\(\)\.ToString\("N"\)/);
  assert.match(media, /Cache-Control: no-store/);
  assert.match(host, /new\[\] \{ "\.mp4", "\.mkv", "\.m4a", "\.mp3", "\.wav" \}/);
});
