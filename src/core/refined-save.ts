import type {ScriptToVideoInput,Word} from './types';
import {parseScriptToVideo,validateScriptToVideo} from './transcript';
import {buildRefinedScript,buildRefinedText} from './refined';

/** Construct a content-only save. Never write back to the original script.json. */
export function prepareRefinedSave(
 source:ScriptToVideoInput,
 previous:ScriptToVideoInput,
 title:string,
 words:readonly Word[],
){
 validateScriptToVideo(source);
 validateScriptToVideo(previous);
 if(previous.script_to_video.schemaVersion!==3)
  throw new Error('只能保存到已有的 refined v3 字幕');
 const baseline=parseScriptToVideo(previous);
 if(baseline.words.length!==words.length)
  throw new Error('单词数量与当前 refined 不一致');
 const refined=buildRefinedScript(source,title,words);
 const text=buildRefinedText(title,words);
 const previousText=buildRefinedText(baseline.title,baseline.words);
 return {previousRefined:previous,previousText,refined,text};
}
