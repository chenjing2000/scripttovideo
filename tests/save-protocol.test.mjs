import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSaveReply,isSaveFailure,advanceSave} from '../.tmp-core/save-protocol.js';

const operation={
 operationId:42,revision:7,fingerprint:'source-sha',subtitleName:'sample.script.json',
 reason:'export',stage:'refined'
};
const refinedOk={kind:'refined-saved',operationId:42,revision:7,
 fingerprint:'source-sha',subtitleName:'sample.script.json'};

test('a matching refined acknowledgement advances to project save',()=>{
 assert.equal(matchesSaveReply(operation,refinedOk),true);
 assert.deepEqual(advanceSave(operation,refinedOk),{...operation,stage:'project'});
 assert.equal(advanceSave({...operation,stage:'project'},
  {...refinedOk,kind:'project-v3-saved'}),null);
});

test('stale operation, revision and source cannot advance save',()=>{
 for(const reply of [
  {...refinedOk,operationId:41},
  {...refinedOk,revision:6},
  {...refinedOk,fingerprint:'other-sha'},
  {...refinedOk,subtitleName:'other.script.json'},
  {...refinedOk,kind:'project-v3-saved'}
 ]){
  assert.equal(matchesSaveReply(operation,reply),false);
  assert.equal(advanceSave(operation,reply),null);
 }
});

test('save failure never advances to next stage',()=>{
 const failure={...refinedOk,kind:'refined-save-failed'};
 assert.equal(matchesSaveReply(operation,failure),true);
 assert.equal(isSaveFailure(failure),true);
 assert.equal(advanceSave(operation,failure),null);
});

test('project stage only accepts project acknowledgements',()=>{
 const project={...operation,stage:'project'};
 assert.equal(matchesSaveReply(project,refinedOk),false);
 assert.equal(matchesSaveReply(project,{...refinedOk,kind:'project-v3-saved'}),true);
});
