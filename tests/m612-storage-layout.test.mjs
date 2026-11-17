import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transcriptStem} from '../.tmp-core/media.js';
const host=readFileSync('desktop/ReaderWindow.cs','utf8');
const ui=readFileSync('src/main.tsx','utf8');
const storage=readFileSync('desktop/ReviseStorage.cs','utf8');
test('work files remain under the exact script stem folder',()=>{
 assert.equal(transcriptStem('lesson.script.json'),'lesson');
 assert.equal(transcriptStem('My Lesson.SCRIPT.JSON'),'My Lesson');
 assert.throws(()=>transcriptStem('lesson.json'));
 assert.match(host,/var workFolder = Path.Combine\(folder, stem\)/);
 assert.match(host,/var projectPath = Path.Combine\(workFolder, stem \+ "\.project\.json"\)/);
});
test('import allows missing revise and never creates derived TXT',()=>{
 const start=host.indexOf('private void OpenPair('),end=host.indexOf('private void SaveProjectBundle(',start);
 const code=host.slice(start,end);
 assert.match(code,/ReviseStorage\.ReadExisting/);
 assert.doesNotMatch(code,/CreateInitial|RepairRefinedText|CreateMissingText|RecoverPendingProjectSave/);
 assert.match(ui,/planReviseOpen\(input,revised\)/);
 assert.doesNotMatch(ui,/kind:'revised-create'|kind:'revised-repair-text'/);
});
test('project mismatch causes default settings to replace old project',()=>{
 assert.match(ui,/stored\.script\.filename\.toLowerCase\(\)!==data\.subtitleName\.toLowerCase\(\)/);
 assert.match(ui,/kind:'project-reset',project:current/);
 assert.match(host,/case "project-reset":/);
 assert.match(host,/ReviseStorage\.AtomicWrite\(current\.Project,project\.GetRawText\(\)\)/);
});
test('Ctrl+S writes revise, TXT and project without old snapshots',()=>{
 assert.match(storage,/AtomicWrite\(paths\.Revised,revised\)/);
 assert.match(storage,/AtomicWrite\(paths\.Text,text\)/);
 assert.match(storage,/AtomicWrite\(projectPath,project\)/);
 assert.doesNotMatch(storage,/PendingProjectSave|ReplaceIfUnchanged|RecoverPendingProjectSave/);
 assert.doesNotMatch(ui,/previousRefined|previousText|previousProject|confirmedDiskSnapshotRef/);
});
test('browser download does not acknowledge a verified save',()=>{
 const start=ui.indexOf(' const doSave='),end=ui.indexOf(' const doExport=',start);
 assert.ok(start>0&&end>start);
 const body=ui.slice(start,end),browser=body.slice(body.indexOf('}else{'));
 assert.match(browser,/\.script\.revise\.json/);
 assert.match(browser,/\.project\.json/);
 assert.doesNotMatch(browser,/acknowledgeProjectSave/);
});
test('desktop settings and work files share one atomic-writer implementation',()=>{
 assert.doesNotMatch(host,/private static void AtomicWrite\(/);
 assert.match(host,/ReviseStorage\.AtomicWrite\(settingsFile,/);
 assert.match(host,/ReviseStorage\.AtomicWrite\(marker,checksum\)/);
 assert.match(host,/ReviseStorage\.AtomicWrite\(browserMarker,checksum\)/);
 assert.match(storage,/internal static void AtomicWrite\(/);
});

test('dotnet publish builds fresh WebView2 UI before embedding resources',()=>{
 const csproj=readFileSync('desktop/ScriptToVideo.csproj','utf8');
 assert.match(csproj,/<Target Name="BuildEmbeddedWebUi" BeforeTargets="AssignTargetPaths"/);
 assert.ok(csproj.indexOf('npm run build')<csproj.indexOf('BuiltWebAsset Update='));
});
