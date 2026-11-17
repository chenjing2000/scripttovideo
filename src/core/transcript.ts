import type {Transcript,ScriptToVideoInput,Word} from './types';
const valid = (n:unknown):n is number => typeof n==='number' && Number.isFinite(n);
const record = (v:unknown):v is Record<string,unknown> => v!==null && typeof v==='object' && !Array.isArray(v);
/** Only the title-bearing ScriptToVideo v3 format is supported. */
export function validateScriptToVideo(input:unknown):asserts input is ScriptToVideoInput {
 if(!record(input))throw new Error('字幕必须是 ScriptToVideo JSON 对象');
 const meta=input.script_to_video;
 if(!record(meta)||meta.format!=='script-to-video'||meta.schemaVersion!==3)
  throw new Error('仅支持 ScriptToVideo v3 字幕');
 if(typeof input.title!=='string')throw new Error('ScriptToVideo v3 必须包含字符串 title（允许为空）');
 if(meta.displayOverrides!==undefined)throw new Error('v3 不允许 displayOverrides：请直接保存完整的有效文字');
 for(const key of Object.keys(meta))if(!['format','schemaVersion'].includes(key))throw new Error(`不支持的 script_to_video 字段：${key}`);
 if('enscript' in input||'evr' in input||'paragraphs' in input||'paragraphBreaksAfter' in input)throw new Error('禁止旧版自然段字段');
 if(input.language!=='en')throw new Error('仅支持 language: "en" 的英语字幕');
 if(!Array.isArray(input.segments)||!input.segments.length)throw new Error('必须包含非空 segments 数组');
 let lastStart=-Infinity;
 input.segments.forEach((segment,si)=>{
  if(!record(segment)||!Array.isArray(segment.words)||!segment.words.length)throw new Error(`segment ${si} 缺少 words`);
  if('paragraph_start' in segment||'paragraph_id' in segment||'breakParagraph' in segment)throw new Error(`segment ${si} 包含错误的分段字段`);
  segment.words.forEach((w,wi)=>{
   const id=`s${si}w${wi}`;
   if(!record(w)||typeof w.word!=='string'||!w.word.trim()||/\s/u.test(w.word.trim()))throw new Error(`${id} 不是合法的单词锚点`);
   if(!valid(w.start)||!valid(w.end)||w.start<0||w.end<=w.start||w.start<lastStart)throw new Error(`${id} 时间戳无效或倒序`);
   if('paragraphAfter' in w||'paragraph_start' in w||'paragraphBreaksAfter' in w)throw new Error(`${id} 存在旧版分段字段`);
   if('hidden' in w&&w.hidden!==true)throw new Error(`${id} 的 hidden 仅在 v3 中允许 true 或省略`);
   if('breakParagraph' in w&&w.breakParagraph!==true)throw new Error(`${id} 的 breakParagraph 只能是 true 或省略`);
   lastStart=w.start;
  });
 });
 const segments=input.segments;
 const last=segments[segments.length-1].words;
 if(last[last.length-1].breakParagraph===true)throw new Error('最后一个单词禁止设置 breakParagraph');
 if(input.word_segments!==undefined){
  if(!Array.isArray(input.word_segments))throw new Error('word_segments 必须为数组');
  input.word_segments.forEach((w,i)=>{if(!record(w)||'breakParagraph' in w)throw new Error(`word_segments[${i}] 不能包含 breakParagraph`);});
 }
}
export function parseScriptToVideo(input:unknown):Transcript {
 validateScriptToVideo(input);
 const words:Word[]=[];
 input.segments.forEach((segment,si)=>segment.words.forEach((entry,wi)=>{
  const id=`s${si}w${wi}`,original=entry.word.trim(),breakParagraph=entry.breakParagraph===true;
  words.push({id,segmentId:`s${si}`,original,display:original,sourceDisplay:original,start:entry.start,end:entry.end,score:entry.score,hidden:entry.hidden===true,breakParagraph,sourceBreakParagraph:breakParagraph});
 }));
 return {language:'en',title:input.title??'',words,warnings:[]};
}
export function updateWord(words:Word[],id:string,display:string):Word[]{
 const v=display.trim();if(!v||/\s/u.test(v))throw new Error('每个时间锚点只能编辑一个词，不能输入空格或空词');
 if(words.some(w=>w.id===id&&w.display===v))return words;
 return words.map(w=>w.id===id?{...w,display:v}:w);
}
export function visibleWords(words:Word[]):Word[]{return words.filter(w=>!w.hidden)}
