import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviseFileNames} from '../.tmp-core/revise-paths.js';
const host=readFileSync('desktop/ReaderWindow.cs','utf8');
const storage=readFileSync('desktop/ReviseStorage.cs','utf8');
const cli=readFileSync('scripts/export.mjs','utf8');
test('all active working paths use .script.revise.json',()=>{
 const path=reviseFileNames('sample.script.json');
 assert.equal(path.revised,'sample.script.revise.json');
 assert.match(storage,/\.script\.revise\.json/);
 assert.match(cli,/\.script\.revise\.json/);
 assert.match(host,/\.script\.revise\.json/);
});
test('old journal, pair recovery and old file naming are absent',()=>{
 assert.doesNotMatch(storage,/MigrateLegacyFilename|RecoverPendingPair|PendingProjectSave|\.script\.refined\.json/);
 assert.doesNotMatch(host,/MigrateLegacyFilename|RecoverPendingPair|RecoverPendingProjectSave/);
});
