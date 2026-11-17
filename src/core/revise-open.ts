import type {ScriptToVideoInput} from './types';
import {parseScriptToVideo,validateScriptToVideo} from './transcript';
/** A revised subtitle is optional. The original is always needed to validate timing anchors. */
export function planReviseOpen(source:unknown,existingRevised:unknown|null):
 {kind:'existing'|'source';script:ScriptToVideoInput}{
 validateScriptToVideo(source);
 if(existingRevised===null)return {kind:'source',script:source};
 validateScriptToVideo(existingRevised);
 const original=parseScriptToVideo(source),revised=parseScriptToVideo(existingRevised);
 if(revised.words.length!==original.words.length)throw new Error('revise 单词数量与原始字幕不一致');
 revised.words.forEach((w,i)=>{
  const base=original.words[i];
  if(w.id!==base.id||w.start!==base.start||w.end!==base.end)
   throw new Error(`revise 时间锚点不匹配：${base.id}`);
 });
 return {kind:'existing',script:existingRevised};
}
