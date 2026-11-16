import test from 'node:test';
import assert from 'node:assert/strict';
import {isMatchingBundleSaveReply,bundleSaveSucceeded} from '../.tmp-core/bundle-save-protocol.js';

const pending={operationId:21,revision:7,fingerprint:'a'.repeat(64),subtitleName:'Talk.script.json'};
const source={fingerprint:pending.fingerprint,subtitleName:'talk.SCRIPT.JSON'};
const reply={...pending,kind:'project-bundle-saved',message:'saved'};

test('only matching active source and operation can acknowledge a save',()=>{
 assert.equal(isMatchingBundleSaveReply(pending,reply,source),true);
 assert.equal(bundleSaveSucceeded(reply),true);
 assert.equal(isMatchingBundleSaveReply({...pending,revision:8},reply,source),false);
 assert.equal(isMatchingBundleSaveReply({...pending,operationId:22},reply,source),false);
 assert.equal(isMatchingBundleSaveReply(pending,reply,{...source,fingerprint:'b'.repeat(64)}),false);
 assert.equal(isMatchingBundleSaveReply(pending,reply,{...source,subtitleName:'Other.script.json'}),false);
 assert.equal(isMatchingBundleSaveReply(null,reply,source),false);
});
test('matching failures are not success acknowledgements',()=>{
 const failure={...reply,kind:'project-bundle-save-failed'};
 assert.equal(isMatchingBundleSaveReply(pending,failure,source),true);
 assert.equal(bundleSaveSucceeded(failure),false);
});
