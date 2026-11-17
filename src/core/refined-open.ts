import type {ScriptToVideoInput} from './types';
import {parseScriptToVideo,validateScriptToVideo} from './transcript';
/** A revised subtitle is optional. The original is always needed to validate timing anchors. */
export function planRefinedOpen(source:unknown,existingRefined:unknown|null):
 {kind:'existing'|'source';script:ScriptToVideoInput}{
 validateScriptToVideo(source);
 if(existingRefined===null)return {kind:'source',script:source};
 validateScriptToVideo(existingRefined);
 const original=parseScriptToVideo(source),revised=parseScriptToVideo(existingRefined);
 if(revised.words.length!==original.words.length)throw new Error('revise 单词数量与原始字幕不一致');
 revised.words.forEach((w,i)=>{
  const base=original.words[i];
  if(w.id!==base.id||w.start!==base.start||w.end!==base.end)
   throw new Error(`revise 时间锚点不匹配：${base.id}`);
 });
 return {kind:'existing',script:existingRefined};
}
