import test from 'node:test';
import assert from 'node:assert/strict';
import {link,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {commitCliOutput} from '../scripts/cli-output-commit.mjs';

async function withOutput(run){
 const root=await mkdtemp(path.join(tmpdir(),'scripttovideo-cli-commit-'));
 try{
  const cache=path.join(root,'cache'),out=path.join(root,'output');
  await mkdir(cache);await mkdir(out);
  const source=path.join(cache,'render-output.mp4');
  const destination=path.join(out,'lesson.exported.mp4');
  await writeFile(source,'render-complete');
  await run({source,destination,out});
 }finally{await rm(root,{recursive:true,force:true})}
}
const read=p=>readFile(p,'utf8');
const exdev=()=>Object.assign(new Error('Cross-device link not permitted'),{code:'EXDEV'});
const denied=()=>Object.assign(new Error('Destination is not writable'),{code:'EACCES'});

test('CLI same-volume commit uses an exclusive link and leaves render source intact',()=>withOutput(async({source,destination,out})=>{
 const saved=await commitCliOutput(source,destination);
 assert.equal(saved,destination);
 assert.equal(await read(saved),'render-complete');
 assert.equal(await read(source),'render-complete');
 assert.deepEqual(await readdir(out),['lesson.exported.mp4']);
}));

test('CLI commit selects the lowest free suffix without replacing existing files',()=>withOutput(async({source,destination,out})=>{
 await writeFile(destination,'original');
 await writeFile(path.join(out,'lesson.exported (2).mp4'),'existing two');
 const saved=await commitCliOutput(source,destination);
 assert.equal(saved,path.join(out,'lesson.exported (1).mp4'));
 assert.equal(await read(destination),'original');
 assert.equal(await read(path.join(out,'lesson.exported (2).mp4')),'existing two');
 assert.equal(await read(saved),'render-complete');
}));

test('CLI concurrent commits cannot overwrite or lose either output',()=>withOutput(async({source,destination,out})=>{
 const other=path.join(out,'second-render.mp4');
 await writeFile(other,'another render');
 const [first,second]=await Promise.all([
  commitCliOutput(source,destination),
  commitCliOutput(other,destination)
 ]);
 assert.notEqual(first,second);
 assert.deepEqual([await read(first),await read(second)].sort(),['another render','render-complete']);
}));

test('simulated EXDEV copies to output volume then links only a fully copied file',()=>withOutput(async({source,destination,out})=>{
 let crossVolumeAttempts=0,stageLinks=0;
 const linkAcrossVolumes=async(from,to)=>{
  if(from===source){crossVolumeAttempts++;throw exdev()}
  stageLinks++;
  assert.equal(await read(from),'render-complete');
  return link(from,to);
 };
 await writeFile(destination,'existing');
 const saved=await commitCliOutput(source,destination,linkAcrossVolumes);
 assert.equal(saved,path.join(out,'lesson.exported (1).mp4'));
 assert.equal(await read(destination),'existing');
 assert.equal(await read(saved),'render-complete');
 assert.equal(await read(source),'render-complete');
 assert.equal(crossVolumeAttempts,1);
 assert.ok(stageLinks>=2); // occupied base, then successful numbered output
 assert.deepEqual((await readdir(out)).sort(),['lesson.exported (1).mp4','lesson.exported.mp4']);
}));

test('failed cross-volume final link preserves existing output and render source',()=>withOutput(async({source,destination,out})=>{
 await writeFile(destination,'original');
 const linkWithFailure=async(from,to)=>{
  if(from===source)throw exdev();
  if(to===destination)return link(from,to); // EEXIST retries safely
  throw denied();
 };
 await assert.rejects(commitCliOutput(source,destination,linkWithFailure),{code:'EACCES'});
 assert.equal(await read(destination),'original');
 assert.equal(await read(source),'render-complete');
 assert.deepEqual(await readdir(out),['lesson.exported.mp4']);
}));

test('failed cross-volume copy leaves no published output or staging directory',()=>withOutput(async({source,destination,out})=>{
 const missing=path.join(path.dirname(source),'missing.mp4');
 const linkWithExdev=async()=>{throw exdev()};
 await assert.rejects(commitCliOutput(missing,destination,linkWithExdev),{code:'ENOENT'});
 assert.deepEqual(await readdir(out),[]);
 assert.equal(await read(source),'render-complete');
}));

test('non-cross-volume I/O errors fail immediately without creating a fallback',()=>withOutput(async({source,destination,out})=>{
 let attempts=0;
 const fail=async()=>{attempts++;throw denied()};
 await assert.rejects(commitCliOutput(source,destination,fail),{code:'EACCES'});
 assert.equal(attempts,1);
 assert.deepEqual(await readdir(out),[]);
 assert.equal(await read(source),'render-complete');
}));
