import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transcriptStem} from '../.tmp-core/media.js';
const cs=readFileSync('desktop/ReaderWindow.cs','utf8');
const ui=readFileSync('src/main.tsx','utf8');

test('M6.12: exact JSON suffix becomes shared work-folder and both output names',()=>{
 assert.equal(transcriptStem('lesson01.script.json'),'lesson01');
 assert.equal(transcriptStem('My Lesson.SCRIPT.JSON'),'My Lesson');
 assert.throws(()=>transcriptStem('lesson01.json'));
 assert.match(cs,/var workFolder = Path.Combine\(folder, stem\)/);
 assert.match(cs,/var projectPath = Path.Combine\(workFolder, stem \+ "\.project\.json"\)/);
 assert.match(cs,/var storagePaths = RefinedStorage\.Resolve\(subtitle\)/);
 assert.match(cs,/RefinedStorage\.RecoverPendingProjectSave\(storagePaths, projectPath\)/);
 assert.doesNotMatch(cs,/MigrateLegacyFilename|RecoverPendingPair/);
});
test('M6.22: no obsolete global project location; v3 originals and separate revised v3 working copies are supported',()=>{
 assert.doesNotMatch(cs,/"\.script-to-video", "projects"/);
 assert.doesNotMatch(cs,/project\.settings\.json/);
 assert.match(cs,/version\.GetInt32\(\) != 3/);
 assert.match(cs,/!root\.TryGetProperty\("title", out var title\)/);
 assert.match(cs,/meta\.TryGetProperty\("displayOverrides", out _\)/);
 assert.match(ui,/if\(input\.script_to_video\.schemaVersion!==3\)/);
 assert.doesNotMatch(cs,/version\.GetInt32\(\) != 2/);
 assert.match(ui,/planManualSave\(disk\.original,disk\.refined,disk\.text,disk\.project,project,currentWords/);
 assert.match(ui,/kind:'project-bundle-save'/);
 assert.match(ui,/stem\+'\.script\.revise\.json'/);
 assert.match(ui,/stem\+'\.project\.json'/);
 assert.match(ui,/stem\+'\.txt'/);
 assert.doesNotMatch(ui,/saveProjectView\(project,currentWords\)/);
 assert.doesNotMatch(ui,/transcriptStem\(project\.source\.subtitleName\)\+'\.article\.txt'/);
});
test('M6.12: existing corrupt project cannot be silently overwritten',()=>{
 assert.doesNotMatch(cs,/projectSaveLocked|previousProjectSaveLocked/);
 assert.match(cs,/if \(!JsonElement\.DeepEquals\(stored\.RootElement, oldRefined\)\)/);
 assert.match(cs,/schema\.GetInt32\(\) != 3/);
 assert.match(ui,/setProjectLoadBlocked\(blocked\)/);
 assert.match(ui,/if\(projectLoadBlocked\)return notify/);
 assert.match(ui,/保存工程 Ctrl\+S',doSave,!project\|\|exporting\|\|projectLoadBlocked/);
});
test('M6.12: saves only on demand and does not create empty directory on import',()=>{
 const open=cs.slice(cs.indexOf('private void OpenPair'),cs.indexOf('private Source CheckSource'));
 assert.doesNotMatch(open,/Directory\.CreateDirectory/);
 assert.match(cs,/private static void AtomicWrite/);
 assert.match(cs,/File\.Move\(temp, file, overwrite: true\)/);
 assert.match(cs,/RefinedStorage\.ReplaceProjectBundle\(paths, current\.Project,/);
 assert.match(cs,/File\.ReadAllText\(paths\.Refined, Encoding\.UTF8\)/);
 assert.match(cs,/File\.ReadAllText\(paths\.Text, Encoding\.UTF8\)/);
 assert.match(cs,/kind = "project-bundle-saved"/);
});

test('M6.22: browser downloads cannot acknowledge an unverified save',()=>{
 const start=ui.indexOf('// Browser-only fallback.');
 const end=ui.indexOf(' const doExport=()=>{',start);
 assert.ok(start>0&&end>start);
 const branch=ui.slice(start,end);
 assert.match(branch,/\.script\.revise\.json/);
 assert.match(branch,/\.project\.json/);
 assert.doesNotMatch(branch,/acknowledgeProjectSave|updateProjectEditState/);
 assert.match(branch,/浏览器下载不清除未保存标记/);
});

test('M6.22: dotnet publish rebuilds Vite before selecting embedded WebView2 assets',()=>{
 const project=readFileSync('desktop/ScriptToVideo.csproj','utf8');
 assert.match(project,/<Target Name="BuildEmbeddedWebUi" BeforeTargets="AssignTargetPaths"/);
 assert.match(project,/<Exec Command="npm run build" WorkingDirectory="\$\(MSBuildProjectDirectory\)\/\.\."\s*\/>/);
 const idx=project.indexOf('<Target Name="BuildEmbeddedWebUi"');
 const end=project.indexOf('</Target>',idx);
 const target=project.slice(idx,end);
 assert.ok(target.indexOf('<Exec Command="npm run build"')<target.indexOf('<EmbeddedResource Include="../dist/index.html"'));
 assert.match(target,/<BuiltWebAsset Include="\.\.\/dist\/assets\/\*\*\/\*"\s*\/>/);
 assert.match(target,/<BuiltWebAsset Update="@\(BuiltWebAsset\)">/);
 assert.match(target,/<LogicalName>TSUI\/assets\/\%\(BuiltWebAsset\.RecursiveDir\)\%\(BuiltWebAsset\.Filename\)\%\(BuiltWebAsset\.Extension\)<\/LogicalName>/);
 assert.match(target,/<EmbeddedResource Include="@\(BuiltWebAsset\)"\s*\/>/);
 assert.doesNotMatch(project.slice(end),/EmbeddedResource Include="\.\.\/dist\/index.html"/);
});
