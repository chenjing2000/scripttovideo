import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {canonicalJson,sameCanonicalJson}=require('../.tmp-core/canonical-json.js');

test('M6.22: snapshot JSON comparison ignores object key order at every depth',()=>{
 const a={x:1,nested:{z:2,y:3},items:[{b:2,a:1}]};
 const b={items:[{a:1,b:2}],nested:{y:3,z:2},x:1};
 assert.equal(canonicalJson(a),canonicalJson(b));
 assert.equal(sameCanonicalJson(a,b),true);
});

test('M6.22: canonical comparison preserves array order and actual edit differences',()=>{
 assert.equal(sameCanonicalJson({words:['a','b']},{words:['b','a']}),false);
 assert.equal(sameCanonicalJson({title:''},{title:'Edited'}),false);
 assert.equal(sameCanonicalJson({hidden:false},{hidden:true}),false);
 assert.equal(sameCanonicalJson(null,null),true);
});
