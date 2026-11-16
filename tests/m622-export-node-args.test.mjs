import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const host=readFileSync('desktop/ReaderWindow.cs','utf8');

test('M6.22: the Node script is the first argument and source-json is appended after it',()=>{
 const at=host.indexOf('string[] arguments = [');
 assert.ok(at>0);
 const start=host.slice(at,host.indexOf('var evidence =',at));
 assert.match(start,/Path\.Combine\(runtime, "scripts", "export\.mjs"\)/);
 const addScript=start.indexOf('foreach (var argument in arguments) start.ArgumentList.Add(argument);');
 const addSource=start.indexOf('start.ArgumentList.Add("--source-json");');
 assert.ok(addScript>0&&addSource>addScript,'--source-json must be passed to export.mjs, not node.exe');
 assert.match(start,/arguments\[4\] = renderRefined/);
});
