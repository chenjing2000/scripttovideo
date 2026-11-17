/** Standalone CLI admission gate; mirrors src/core/transcript.ts. */
export function assertScriptToVideo(input){
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const meta=input?.script_to_video;
 if(!object(input)||!object(meta)||meta.format!=='script-to-video'||meta.schemaVersion!==3)
  throw new Error('仅支持 ScriptToVideo v3 (*.script.json)');
 if(typeof input.title!=='string')throw new Error('ScriptToVideo v3 必须包含 title 字符串');
 if('displayOverrides' in meta)throw new Error('v3 不允许 displayOverrides');
 if(Object.keys(meta).some(k=>!['format','schemaVersion'].includes(k)))throw new Error('未知 script_to_video 字段');
 if('enscript' in input||'evr' in input||'paragraphs' in input||'paragraphBreaksAfter' in input)throw new Error('禁止旧格式字段');
 if(input.language!=='en'||!Array.isArray(input.segments)||!input.segments.length)throw new Error('必须包含英语 segments');
 let wordCount=0,last=-Infinity,paragraphs=1,terminal;
 for(let si=0;si<input.segments.length;si++){
  const seg=input.segments[si];if(!object(seg)||!Array.isArray(seg.words)||!seg.words.length)throw new Error(`segment ${si} 缺少 words`);
  if(['paragraph_start','paragraph_id','breakParagraph'].some(k=>k in seg))throw new Error(`segment ${si} 存在错误分段字段`);
  for(let wi=0;wi<seg.words.length;wi++){
   const w=seg.words[wi],id=`s${si}w${wi}`;
   if(!object(w)||typeof w.word!=='string'||!w.word.trim()||/\s/u.test(w.word.trim()))throw new Error(`单词无效：${id}`);
   if(typeof w.start!=='number'||!Number.isFinite(w.start)||typeof w.end!=='number'||!Number.isFinite(w.end)||w.start<0||w.end<=w.start||w.start<last)throw new Error(`时间戳无效：${id}`);
   if('paragraphAfter' in w||'paragraphBreaksAfter' in w||'paragraph_start' in w)throw new Error(`旧版分段字段：${id}`);
   if('hidden' in w&&w.hidden!==true)throw new Error(`hidden 必须为 true：${id}`);
   if('breakParagraph' in w&&w.breakParagraph!==true)throw new Error(`breakParagraph 必须为 true：${id}`);
   if(w.breakParagraph===true)paragraphs++;
   last=w.start;terminal=w;wordCount++;
  }
 }
 if(terminal.breakParagraph===true)throw new Error('末词不能标记 breakParagraph');
 if(input.word_segments!==undefined){
  if(!Array.isArray(input.word_segments)||input.word_segments.some(w=>!object(w)||'breakParagraph' in w))throw new Error('word_segments 禁止分段标记');
 }
 return {wordCount,paragraphCount:paragraphs};
}


/** Validate a revised v3 subtitle against its immutable v3 source.
 * The project identifies its original subtitle only by script.filename.
 */
export function assertRevisedForExport(revised,original){
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 if(!object(revised)||!object(revised.script_to_video)||
    revised.script_to_video.format!=='script-to-video'||
    revised.script_to_video.schemaVersion!==3||
    'displayOverrides' in revised.script_to_video||
    typeof revised.title!=='string'||revised.language!=='en'||
    !Array.isArray(revised.segments)||revised.segments.length!==original.segments.length)
  throw new Error('Invalid revised v3 subtitle');
 for(let si=0;si<original.segments.length;si++){
  const before=original.segments[si],after=revised.segments[si];
  if(!object(after)||!Array.isArray(after.words)||after.words.length!==before.words.length)
   throw new Error('Revised segment structure mismatch');
  for(let wi=0;wi<before.words.length;wi++){
   const oldWord=before.words[wi],word=after.words[wi];
   if(!object(word)||word.start!==oldWord.start||word.end!==oldWord.end||
      typeof word.word!=='string'||!word.word.trim()||/\s/u.test(word.word.trim())||
      (word.hidden!==undefined&&word.hidden!==true)||
      (word.breakParagraph!==undefined&&word.breakParagraph!==true))
    throw new Error(`Revised word or timing anchor mismatch: s${si}w${wi}`);
  }
 }
 if(revised.segments.at(-1).words.at(-1).breakParagraph===true)
  throw new Error('Revised final word cannot end a paragraph');
 return revised;
}

/** Strict admission check for a saved project supplied directly to the export CLI. */
function assertSharedProjectForExport(project,{subtitleName}){
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const color=s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s);
 if(!object(project)||project.format!=='script-to-video-project'||project.schemaVersion!==3||'source' in project||'overrides' in project)
  throw new Error('Expected presentation-only project v3');
 const script=project.script;
 if(!object(script)||typeof script.filename!=='string'||script.filename.toLowerCase()!==subtitleName.toLowerCase()||
    script.filename.includes('/')||script.filename.includes('\\'))
  throw new Error('Project script.filename mismatch');
 const canvas=project.canvas;
 if(!object(canvas)||!Number.isInteger(canvas.width)||!Number.isInteger(canvas.height)||
    canvas.width<320||canvas.width>3840||canvas.height<320||canvas.height>3840||canvas.width%2||canvas.height%2)
  throw new Error('Invalid even canvas dimensions');
 const output=project.export;
 if(!object(output)||(output.fps!==30&&output.fps!==60)||!['standard','high'].includes(output.quality))
  throw new Error('Invalid project export settings');
 const style=project.style;
 if(!object(style)||!['left','justify'].includes(style.textAlign)||typeof style.fontFamily!=='string'||!style.fontFamily.trim())
  throw new Error('Invalid project reading style');
 for(const key of ['fontSize','fontWeight','lineHeight','paragraphGap','paddingX','paddingY'])
  if(!finite(style[key]))throw new Error(`Invalid project style value: ${key}`);
 if(style.fontSize<=0||style.fontWeight<=0||style.lineHeight<=0||style.paragraphGap<0||style.paddingX<0||style.paddingY<0)
  throw new Error('Project reading style contains out-of-range values');
 const indent=style.firstLineIndentEm??style.firstLineIndentCh??0;
 if(!finite(indent)||indent<0)throw new Error('Invalid project first-line indentation');
 if(style.firstLineIndentEm!==undefined&&(!Number.isInteger(style.firstLineIndentEm)||style.firstLineIndentEm>9))
  throw new Error('Invalid project firstLineIndentEm');
 if(style.minScrollDuration!==undefined&&(!finite(style.minScrollDuration)||style.minScrollDuration<0))
  throw new Error('Invalid project minScrollDuration');
 for(const key of ['textColor','highlightColor','backgroundColor'])
  if(!color(style[key]))throw new Error(`Invalid project color: ${key}`);
 return project;
}

/** Only v3 presentation projects are valid persisted/exportable projects. */
export function assertPresentationProjectForExport(project,context){
 if(!project||typeof project!=='object'||Array.isArray(project)||
    project.schemaVersion!==3||'overrides' in project)
  throw new Error('Expected presentation-only project v3');
 if(project.titleStyle!==undefined){
  const t=project.titleStyle;
  if(!t||typeof t!=='object'||(t.bold!==undefined&&typeof t.bold!=='boolean')||typeof t.fontFamily!=='string'||!t.fontFamily.trim()||
     !Number.isInteger(t.fontSize)||t.fontSize<1||t.fontSize>200||
     !Number.isInteger(t.lineHeight)||t.lineHeight<t.fontSize||t.lineHeight>300||
     !Number.isInteger(t.paragraphGap)||t.paragraphGap<0||t.paragraphGap>200||
     typeof t.color!=='string'||!/^#[0-9a-f]{6}$/i.test(t.color))throw Error('Invalid project title style');
 }
 assertSharedProjectForExport(project,context);
 return project;
}
