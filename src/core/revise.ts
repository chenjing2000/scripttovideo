import type {ScriptToVideoInput, Word} from './types';
import {validateScriptToVideo} from './transcript';
import {exportPlainText} from './plain-text';

/** Build a self-contained v3 subtitle without changing the source or its timing anchors. */
export function buildRevisedScript(source:ScriptToVideoInput,title:string,words:readonly Word[]):ScriptToVideoInput{
 validateScriptToVideo(source);
 if(source.script_to_video.schemaVersion!==3)throw new Error('原始字幕必须使用 ScriptToVideo v3');
 if(typeof title!=='string')throw new Error('标题必须是字符串');
 const expected=source.segments.reduce((sum,segment)=>sum+segment.words.length,0);
 if(words.length!==expected)throw new Error('revised 单词数量与原始时间锚点不一致');
 let cursor=0;
 const segments=source.segments.map((segment,si)=>({
  ...segment,
  words:segment.words.map((entry,wi)=>{
   const word=words[cursor++];
   if(word.id!==`s${si}w${wi}`||word.segmentId!==`s${si}`||
      word.start!==entry.start||word.end!==entry.end)
    throw new Error(`revised 单词锚点不匹配：s${si}w${wi}`);
   if(!word.display.trim()||/\s/u.test(word.display.trim()))
    throw new Error(`revised 单词文字无效：${word.id}`);
   const {breakParagraph:oldBreak,hidden:oldHidden,...rest}=entry;
   void oldBreak;void oldHidden;
   return {...rest,word:word.display.trim(),
    ...(word.breakParagraph?{breakParagraph:true as const}:{}),
    ...(word.hidden?{hidden:true as const}:{})};
  }),
 }));
 // Derive segment text from the same effective visible words as the TXT export.
 let offset=0;
 const completed=segments.map((segment)=>{
  const slice=words.slice(offset,offset+segment.words.length);
  offset+=segment.words.length;
  return {...segment,text:slice.filter(w=>!w.hidden).map(w=>w.display.trim()).join(' ')};
 });
 const metadata=source.script_to_video;
 // Do not copy source.word_segments: it may contain stale duplicate word text.
 const revised:ScriptToVideoInput={
  script_to_video:{...metadata,format:'script-to-video',schemaVersion:3},
  title,language:'en',segments:completed
 };
 validateScriptToVideo(revised);
 return revised;
}

/** TXT is derived from the same effective content as revised JSON. */
export function buildRevisedText(title:string,words:readonly Word[]):string{
 const body=exportPlainText(words);
 return title ? title+(body?'\r\n\r\n'+body:'') : body;
}
