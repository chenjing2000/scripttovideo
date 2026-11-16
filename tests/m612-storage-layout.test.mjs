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
test('M6.22: no obsolete global project location; v2 originals and separate revised v3 working copies are supported',()=>{
 assert.doesNotMatch(cs,/"\.script-to-video", "projects"/);
 assert.doesNotMatch(cs,/project\.settings\.json/);
 assert.match(cs,/version\.GetInt32\(\) != 2/);
 assert.doesNotMatch(cs,/version\.GetInt32\(\) != 2 && version\.GetInt32\(\) != 3/);
 assert.match(ui,/planManualSave\(disk\.original,disk\.refined,disk\.text,disk\.project,project,currentWords/);
 assert.match(ui,/kind:'project-bundle-save'/);
 assert.match(ui,/a\.download=transcriptStem\(project\.source\.subtitleName\)\+'\.project\.json'/);
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
