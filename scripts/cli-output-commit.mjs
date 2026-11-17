import {copyFile,link,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';

/**
 * Publish a completed render without ever overwriting or exposing a partial MP4.
 * Keep the fast hard-link path when cache and destination share a volume.
 * The optional link operation allows deterministic EXDEV testing without a second disk.
 */
export async function commitCliOutput(renderedPath,outputPath,linkFile=link){
 const name=path.basename(outputPath,path.extname(outputPath));
 const extension=path.extname(outputPath);
 async function publish(source){
  for(let i=0;;i++){
   const candidate=i===0?outputPath:path.join(path.dirname(outputPath),name+' ('+i+')'+extension);
   try{await linkFile(source,candidate);return candidate}
   catch(error){if(error?.code==='EEXIST')continue;throw error}
  }
 }
 try{return await publish(renderedPath)}
 catch(error){if(error?.code!=='EXDEV')throw error}

 // Hard links cannot cross volumes. Copy to a private directory on the output
 // volume first, then publish with a same-volume exclusive link.
 const stagingDir=await mkdtemp(path.join(path.dirname(outputPath),'.script-to-video-commit-'));
 try{
  const staged=path.join(stagingDir,'complete.mp4');
  await copyFile(renderedPath,staged);
  return await publish(staged);
 }finally{
  try{await rm(stagingDir,{recursive:true,force:true})}
  catch(error){console.warn('Failed to clean output staging directory:',stagingDir,error)}
 }
}
