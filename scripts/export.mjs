import {readFile,copyFile,mkdir,stat,unlink} from 'node:fs/promises';
import path from 'node:path';import {execFileSync} from 'node:child_process';import{fileURLToPath}from'node:url';
import {assertScriptToVideo,assertRevisedForExport,assertPresentationProjectForExport} from './script-to-video-contract.mjs';
import {createCliTaskCacheDir} from './cli-cache.mjs';
import {commitCliOutput} from './cli-output-commit.mjs';
import {assertExportPagePlan} from './page-plan-validation.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function getArg(name){const i=process.argv.indexOf(`--${name}`);return i<0?undefined:process.argv[i+1]}
const media=getArg('media'),json=getArg('json'),sourceJson=getArg('source-json'),output=getArg('out'),projectPath=getArg('project'),cacheArg=getArg('cache-dir');
if(!media||!json||!sourceJson||!projectPath||!output){console.error('Usage: npm run export -- --media MEDIA --source-json SOURCE.script.json --json WORK.script.revise.json --project WORK.project.json --out OUTPUT.mp4 [--cache-dir DIRECTORY]');process.exit(2)}
const cacheRoot=cacheArg?path.resolve(cacheArg):path.join(path.dirname(path.resolve(output)),'.script-to-video-cache');
let publicDir,bundleLocation;
try{
 const originalPath=sourceJson;
 const subtitleBytes=await readFile(originalPath);
 const original=JSON.parse(subtitleBytes.toString('utf8').replace(/^\uFEFF/,''));assertScriptToVideo(original);
 const stem=path.basename(originalPath).slice(0,-'.script.json'.length);
 if(!path.basename(originalPath).toLowerCase().endsWith('.script.json')||
    path.basename(media,path.extname(media)).toLowerCase()!==stem.toLowerCase())
  throw Error('Media and original .script.json must have the same stem');
 if(path.resolve(sourceJson)===path.resolve(json))
  throw Error('Revised export requires a separate revised subtitle path');
 if(path.resolve(sourceJson)!==path.resolve(path.join(path.dirname(sourceJson),stem+'.script.json')))
  throw Error('Invalid original subtitle path');
 // Derived files live under <original-folder>/<stem>/, not beside the original.
 if(path.resolve(json)!==path.resolve(path.join(path.dirname(sourceJson),stem,stem+'.script.revise.json')))
  throw Error('Revised subtitle must be in the companion derived-data folder');
 const input=assertRevisedForExport(
  JSON.parse((await readFile(json,'utf8')).replace(/^\uFEFF/,'')),original);
 const ext=path.extname(media).toLowerCase();if(!['.mp4','.mkv','.m4a','.mp3','.wav'].includes(ext))throw Error('Unsupported media extension');
 const mediaKind=['.m4a','.mp3','.wav'].includes(ext)?'audio':'video';
 const project=JSON.parse(await readFile(projectPath,'utf8'));
 const context={mediaName:path.basename(media),subtitleName:path.basename(originalPath),subtitleBytes,mediaKind,transcript:original};
 assertPresentationProjectForExport(project,context);
 const width=project?.canvas?.width??1200,height=project?.canvas?.height??1600;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<320||height<320||width>3840||height>3840||width%2||height%2)throw Error('Invalid even canvas dimensions');
 let durationSec=Number(getArg('duration')),videoHeight=mediaKind==='audio'?0:Number(getArg('video-height'));
 if(!getArg('duration')||(mediaKind==='video'&&!getArg('video-height'))){
  const meta=JSON.parse(execFileSync(getArg('ffprobe')||'ffprobe',['-v','quiet','-show_entries','format=duration:stream=width,height,codec_type','-of','json',media],{encoding:'utf8'}));
  durationSec=Number(meta.format.duration);
  if(mediaKind==='video'){const stream=meta.streams.find(s=>s.codec_type==='video');if(!stream)throw Error('Missing video stream');videoHeight=Math.round(width*stream.height/stream.width)}
 }
 if(!Number.isFinite(durationSec)||durationSec<=0||!Number.isInteger(videoHeight)||videoHeight<0||videoHeight>=height)throw Error('Media leaves no room for transcript, or invalid duration');
 const last=input.segments.at(-1)?.words.at(-1)?.end??0;
 if(last>durationSec+0.5)throw Error(`Subtitle ends at ${last}s, beyond media duration ${durationSec}s`);
 if([media,json,sourceJson,projectPath].filter(Boolean).some(f=>path.resolve(f)===path.resolve(output)))throw Error('Cannot overwrite input');
 await mkdir(path.dirname(output),{recursive:true});
 const cacheDir=await createCliTaskCacheDir(cacheRoot);
 // Keep Node/Chromium temporary work associated with this export task.
 process.env.TEMP=cacheDir;process.env.TMP=cacheDir;process.env.TMPDIR=cacheDir;
 publicDir=path.join(cacheDir,'media');await mkdir(publicDir,{recursive:true});
 const bundleRoot=path.join(cacheDir,'bundle');
 const filename='__export_input'+ext;await copyFile(media,path.join(publicDir,filename));
 const pagePlan=getArg('page-plan')?JSON.parse(await readFile(getArg('page-plan'),'utf8')):undefined;
 if(pagePlan!==undefined)assertExportPagePlan(pagePlan,input,width,height-videoHeight);
 const inputProps={transcript:input,project,mediaKind,videoHeight,mediaFile:filename,pagePlan,durationSec};
 const {bundle}=await import('@remotion/bundler');const {getCompositions,renderMedia}=await import('@remotion/renderer');
 const browserExecutable=getArg('browser');console.log('Bundling Remotion...');
 bundleLocation=await bundle({publicDir,entryPoint:path.join(root,'src/remotion/index.ts'),outDir:bundleRoot});
 const compositions=await getCompositions(bundleLocation,{inputProps,browserExecutable});
 const composition=compositions.find(c=>c.id==='ScriptToVideo');if(!composition)throw Error('Missing ScriptToVideo composition');
 const intermediate=path.join(cacheDir,'render-output.mp4');
 await renderMedia({composition,serveUrl:bundleLocation,codec:'h264',audioCodec:'aac',browserExecutable,concurrency:2,outputLocation:intermediate,inputProps,crf:18,onProgress:({progress})=>console.log('render '+Math.round(progress*100)+'%')});
 await stat(intermediate);
 // Atomically publish with no overwrite, including when --cache-dir is on another volume.
 const committedOutput=await commitCliOutput(intermediate,output);
 await unlink(intermediate);
 console.log('Export succeeded:',committedOutput);
}catch(e){console.error('Export failed:',e);process.exitCode=1}
