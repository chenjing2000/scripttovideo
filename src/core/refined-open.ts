import type {Project,ScriptToVideoInput} from './types';
import {parseScriptToVideo,validateScriptToVideo} from './transcript';
import {buildRefinedScript,buildRefinedText} from './refined';
import {prepareLegacyMigration} from './migration';
import {validateProject} from './project';
import {validatePresentationProject} from './project-v3';
import {sameCanonicalJson} from './canonical-json';

export type RefinedOpenPlan =
 | {kind:'existing';refined:ScriptToVideoInput;txt:string}
 | {kind:'create';refined:ScriptToVideoInput;txt:string;legacyProject?:Project}
 | {kind:'recover-migration';refined:ScriptToVideoInput;txt:string;legacyProject:Project};

/** Pure, side-effect-free decision for first-open and recovery.
 * The host must write and verify content files before changing a legacy project.
 */
export function planRefinedOpen(source:unknown,existingRefined:unknown|null,project:unknown|null):RefinedOpenPlan{
 validateScriptToVideo(source);
 if(source.script_to_video.schemaVersion!==2)
  throw new Error('原始字幕必须是 ScriptToVideo v2；v3 仅用于 .script.revise.json 工作副本');
 const original=parseScriptToVideo(source);
 let legacy:Project|undefined;
 if(project!==null){
  if(typeof project!=='object'||project===null||Array.isArray(project))
   throw new Error('工程文件格式无效，禁止自动创建或覆盖 refined');
  const schema=(project as {schemaVersion?:unknown}).schemaVersion;
  if(schema===2){
   if(!validateProject(project,original.words))throw new Error('旧工程校验失败，禁止自动迁移');
   legacy=project;
  }else if(schema===3){
   if(!validatePresentationProject(project))throw new Error('v3 工程校验失败，禁止覆盖');
   if(existingRefined===null)throw new Error('v3 工程缺少 refined，禁止从原始字幕重建并丢失修改');
  }else{
   throw new Error('不支持的工程版本，禁止自动创建 refined');
  }
 }
 if(existingRefined!==null){
  validateScriptToVideo(existingRefined);
  if(existingRefined.script_to_video.schemaVersion!==3)
   throw new Error('现有 refined 必须是 v3 字幕');
  const actual=parseScriptToVideo(existingRefined);
  if(actual.words.length!==original.words.length)throw new Error('refined 与原始字幕的单词数量不一致');
  actual.words.forEach((w,i)=>{
   const base=original.words[i];
   if(w.id!==base.id||w.start!==base.start||w.end!==base.end)
    throw new Error(`refined 与原始字幕的时间锚点不匹配：${base.id}`);
  });
  if(legacy){
   // A crash may leave refined in place while the legacy project is still v2.
   // Resume only when every migrated word and metadata field matches exactly.
   const expected=prepareLegacyMigration(source,legacy,false);
   if(!sameCanonicalJson(existingRefined,expected.refined))
    throw new Error('现有 refined 与旧工程迁移结果不一致，禁止自动合并');
   return {kind:'recover-migration',refined:existingRefined,txt:expected.txt,legacyProject:legacy};
  }
  return {kind:'existing',refined:existingRefined,txt:buildRefinedText(actual.title,actual.words)};
 }
 if(legacy){
  const migrated=prepareLegacyMigration(source,legacy,false);
  return {kind:'create',...migrated,legacyProject:legacy};
 }
 return {kind:'create',refined:buildRefinedScript(source,original.title,original.words),
  txt:buildRefinedText(original.title,original.words)};
}
