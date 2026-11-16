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

test('M6.22 breaking: no old filename migration or legacy pair journal recovery remains',()=>{
 assert.doesNotMatch(storage,/MigrateLegacyFilename|RecoverPendingPair|PendingPair|\.script\.refined\.json/);
 assert.doesNotMatch(host,/MigrateLegacyFilename|RecoverPendingPair|MigrateLegacyRefined|refined-migrate/);
 assert.match(storage,/internal static void RecoverPendingProjectSave\(/);
 assert.match(storage,/internal static void ReplaceProjectBundle\(/);
});

test('M6.22 breaking: revised filename is the only persisted content path',()=>{
 assert.match(storage,/stem \+ "\.script\.revise\.json"/);
 assert.doesNotMatch(host,/\.script\.refined\.json/);
});
