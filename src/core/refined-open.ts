import type {ScriptToVideoInput} from './types';
import {parseScriptToVideo,validateScriptToVideo} from './transcript';
import {buildRefinedScript,buildRefinedText} from './refined';
import {validatePresentationProject} from './project-v3';

export type RefinedOpenPlan =
 | {kind:'existing';refined:ScriptToVideoInput;txt:string}
 | {kind:'create';refined:ScriptToVideoInput;txt:string};

/** Open an immutable source v3 with an optional existing current-version v3 pair.
 * Only v3 presentation projects are recognized.
 */
export function planRefinedOpen(source:unknown,existingRefined:unknown|null,project:unknown|null):RefinedOpenPlan{
 validateScriptToVideo(source);
 if(source.script_to_video.schemaVersion!==3)
  throw new Error('原始字幕必须是 ScriptToVideo v3');
 const original=parseScriptToVideo(source);
 if(project!==null){
  if(!validatePresentationProject(project))
   throw new Error('仅支持 project v3，不兼容旧工程文件');
  if(existingRefined===null)
   throw new Error('project v3 缺少 .script.revise.json，禁止从原始字幕重建并丢失修改');
 }
 if(existingRefined!==null){
  validateScriptToVideo(existingRefined);
  if(existingRefined.script_to_video.schemaVersion!==3)
   throw new Error('工作字幕必须是 revise v3');
  const actual=parseScriptToVideo(existingRefined);
  if(actual.words.length!==original.words.length)
   throw new Error('工作字幕与原始字幕的单词数量不一致');
  actual.words.forEach((w,i)=>{
   const base=original.words[i];
   if(w.id!==base.id||w.start!==base.start||w.end!==base.end)
    throw new Error(`工作字幕与原始字幕的时间锚点不匹配：${base.id}`);
  });
  return {kind:'existing',refined:existingRefined,txt:buildRefinedText(actual.title,actual.words)};
 }
 return {kind:'create',refined:buildRefinedScript(source,original.title,original.words),
  txt:buildRefinedText(original.title,original.words)};
}
