import test from 'node:test';
import assert from 'node:assert/strict';
import {isMatchingBundleSaveReply,bundleSaveSucceeded} from '../.tmp-core/bundle-save-protocol.js';
const pending={operationId:21,revision:7,subtitleName:'Talk.script.json'};
const source={subtitleName:'talk.SCRIPT.JSON'};
const reply={...pending,kind:'project-bundle-saved',message:'saved'};
test('stale operation and wrong script cannot acknowledge Ctrl+S',()=>{
 assert.equal(isMatchingBundleSaveReply(pending,reply,source),true);
 assert.equal(isMatchingBundleSaveReply({...pending,operationId:22},reply,source),false);
 assert.equal(isMatchingBundleSaveReply({...pending,revision:8},reply,source),false);
 assert.equal(isMatchingBundleSaveReply(pending,reply,{subtitleName:'other.script.json'}),false);
 assert.equal(isMatchingBundleSaveReply(null,reply,source),false);
});
test('failure replies must never clear dirty state',()=>{
 assert.equal(bundleSaveSucceeded(reply),true);
 assert.equal(bundleSaveSucceeded({...reply,kind:'project-bundle-save-failed'}),false);
});
