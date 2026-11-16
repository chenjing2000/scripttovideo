import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {refinedFileNames}=require('../.tmp-core/refined-paths.js');
const host=readFileSync('desktop/ReaderWindow.cs','utf8');
const storage=readFileSync('desktop/RefinedStorage.cs','utf8');
const cli=readFileSync('scripts/export.mjs','utf8');

test('M6.22: all active working and export paths use .script.revise.json',()=>{
 const path=refinedFileNames('sample.script.json');
 assert.equal(path.refined,'sample.script.revise.json');
 assert.match(storage,/stem \+ "\.script\.revise\.json"/);
 assert.match(cli,/stem\+'\.script\.revise\.json'/);
 assert.match(host,/baseName \+ "\.script\.revise\.json"/);
 assert.doesNotMatch(cli,/\.script\.refined\.json/);
});

test('M6.22: old working filename safely recovers its journals before rename',()=>{
 const start=storage.indexOf('internal static void MigrateLegacyFilename(');
 const end=storage.indexOf('internal static string? ReadExisting',start);
 assert.ok(start>0&&end>start);
 const migration=storage.slice(start,end);
 assert.match(migration,/\.script\.refined\.json/);
 assert.match(migration,/File\.Exists\(paths\.Refined\) \|\| Directory\.Exists\(paths\.Refined\)/);
 assert.match(migration,/hasPairJournal && hasProjectJournal/);
 assert.match(migration,/Directory\.Exists\(pairJournal\) \|\| Directory\.Exists\(projectJournal\)/);
 assert.match(migration,/if \(hasPairJournal\) RecoverPendingPair\(legacy\)/);
 assert.match(migration,/if \(hasProjectJournal\) RecoverPendingProjectSave\(legacy, projectPath\)/);
 assert.ok(migration.indexOf('RecoverPendingPair(legacy)')<migration.indexOf('File.Move(oldPath, paths.Refined'));
 assert.ok(migration.indexOf('RecoverPendingProjectSave(legacy, projectPath)')<migration.indexOf('File.Move(oldPath, paths.Refined'));
 assert.match(migration,/File\.Move\(oldPath, paths\.Refined, overwrite: false\)/);
 assert.match(host,/MigrateLegacyFilename\(storagePaths, projectPath\)/);
 assert.match(host,/MigrateLegacyFilename\(refinedPaths, pending\.ProjectPath\)/);
});

test('M6.22 cleanup: only three-file bundle save entry remains; older pair journals are recoverable',()=>{
 assert.doesNotMatch(storage,/internal static void ReplaceContentPair\(/);
 assert.match(storage,/internal static void ReplaceProjectBundle\(/);
 assert.match(storage,/internal static void RecoverPendingPair\(/);
 assert.match(storage,/private sealed record PendingPair\(/);
});
