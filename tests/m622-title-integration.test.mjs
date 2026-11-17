import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {DEFAULT_TITLE_STYLE,DEFAULT_STYLE,createProject,
 validateProject,layoutTitle,tryLayoutTitle,paginate,parseScriptToVideo,
 buildRevisedScript,buildRevisedText,planManualSave}=require('../.tmp-core/index.js');
const measure=text=>text.length*10;

test('M6.22 title: defaults are persisted in presentation v3, never word overrides',()=>{
 const project=createProject('example.mp4','example.script.json',[]);
 const presentation=project;
 assert.deepEqual(presentation.titleStyle,DEFAULT_TITLE_STYLE);
 assert.equal(presentation.titleStyle.bold,true);
 assert.equal(validateProject({...presentation,titleStyle:{...presentation.titleStyle,bold:false}}),true);
 assert.equal(validateProject({...presentation,titleStyle:{...presentation.titleStyle,bold:'yes'}}),false);
 assert.equal(validateProject(presentation),true);
 assert.equal('overrides' in presentation,false);
 assert.equal(validateProject({...presentation,titleStyle:{...presentation.titleStyle,lineHeight:1}}),false);
 assert.equal(validateProject({...presentation,titleStyle:{...presentation.titleStyle,color:'red'}}),false);
});

test('M6.22 title: empty title takes no page height and multiline title reserves rows plus gap',()=>{
 assert.deepEqual(layoutTitle('',DEFAULT_TITLE_STYLE,300,measure),{lines:[],height:0});
 const layout=layoutTitle('First line\nSecond line',DEFAULT_TITLE_STYLE,300,measure);
 assert.deepEqual(layout.lines,['First line','Second line']);
 assert.equal(layout.height,2*70+20);
 const wrapped=layoutTitle('verylongtitleword',DEFAULT_TITLE_STYLE,70,measure);
 assert.ok(wrapped.lines.length>1);
 assert.ok(wrapped.lines.every(line=>measure(line)<=70));
});

test('M6.22 title: first page contains title and a body row; later pages do not reserve title',()=>{
 const words=Array.from({length:30},(_,i)=>({
  id:'s0w'+i,segmentId:'s0',original:'Word',display:'Word',start:i,end:i+0.5,
  hidden:false,breakParagraph:false
 }));
 const style={...DEFAULT_STYLE,fontSize:20,lineHeight:1.5,firstLineIndentEm:0,paddingX:10,paddingY:10};
 const plan=paginate(words,style,200,180,measure,90);
 assert.ok(plan.pages.length>1);
 assert.equal(plan.pages[0].rows[0].top,100);
 assert.equal(plan.pages[1].rows[0].top,10);
 assert.throws(()=>paginate(words,style,200,100,measure,90),/标题与正文|阅读区域不足/);
});

test('M6.22 title: v3 original snapshot saves edited title in revised and derived TXT',()=>{
 const original=JSON.parse(readFileSync('fixtures/6 Minute English 01-seg1.script.json','utf8'));
 const words=parseScriptToVideo(original).words;
 const previous=buildRevisedScript(original,'',words);
 const project=createProject('6 Minute English 01-seg1.mp4','6 Minute English 01-seg1.script.json',words);
 const next=planManualSave(original,project,words,'A new title');
 assert.equal(next.revised.title,'A new title');
 assert.ok(next.text.startsWith('A new title\r\n\r\n'));
 assert.equal(next.project.titleStyle.color,'#C25160');
});

test('M6.22 title: editor, save and export share the current title and title-aware page plan',()=>{
 const app=readFileSync('src/main.tsx','utf8');
 const canvas=readFileSync('src/ui/ReaderCanvas.tsx','utf8');
 const remotion=readFileSync('src/remotion/Composition.tsx','utf8');
 const settings=readFileSync('src/ui/StyleSettings.tsx','utf8');
 assert.ok(settings.indexOf("['标题设置'")<settings.indexOf("['左栏字体'"));
 assert.match(app,/className="title-editor"/);
 assert.match(app,/ref={titleEditorRef}/);
 assert.match(app,/textarea\.style\.height=textarea\.scrollHeight/);
 assert.match(app,/placeholder="title"/);
 assert.match(app,/iconButton\('settings','设置',openSettings,exporting\)/);
 assert.match(app,/fontFamily:appSettings\.rightFont\.family,fontSize:editorFontSize,fontWeight:700,lineHeight:1\.5,color:appSettings\.rightFont\.color/);
 const css=readFileSync('src/style.css','utf8');
 assert.match(css,/\.m65-toggle-holder\{grid-column:3 \/ 5;/);
 assert.match(css,/\.m65-bold-toggle\{width:70px;/);
 assert.match(settings,/aria-pressed=\{value==='true'\}/);
 assert.match(settings,/粗体<\/button>/);
 assert.match(canvas,/titleStyle\.bold\?700:400/);
 assert.match(app,/setTitle\(next\);markDirty\(\)/);
 assert.equal((app.match(/planManualSave\([^;]*titleRef\.current\)/g)||[]).length,2);
 assert.match(app,/titleLayout\.height/);
 assert.match(canvas,/index===0&&titleLayout\.lines\.length>0/);
 assert.match(remotion,/title=\{transcript\.title\?\?''\}/);
});

test('M6.22 title: invalid glyph or available width returns a visible error instead of throwing',()=>{
 const hugeMeasure=text=>text.length*500;
 const oversized=tryLayoutTitle('A',DEFAULT_TITLE_STYLE,100,hugeMeasure);
 assert.match(oversized.error,/超出/);
 assert.deepEqual(oversized.lines,[]);
 assert.equal(oversized.height,0);
 const narrow=tryLayoutTitle('A',DEFAULT_TITLE_STYLE,0,measure);
 assert.match(narrow.error,/宽度无效/);
 const valid=tryLayoutTitle('A',DEFAULT_TITLE_STYLE,100,measure);
 assert.equal(valid.error,null);
 assert.deepEqual(valid.lines,['A']);
});

test('M6.22 title: editor guards invalid title and Remotion remains strict',()=>{
 const app=readFileSync('src/main.tsx','utf8');
 const canvas=readFileSync('src/ui/ReaderCanvas.tsx','utf8');
 const render=readFileSync('src/remotion/Composition.tsx','utf8');
 assert.match(app,/useMemo\(\(\)=>tryLayoutTitle\(/);
 assert.match(app,/if\(titleLayout\.error\)return notify\(/);
 assert.match(app,/canvasHeight-mediaHeight<=0\|\|titleLayout\.error/);
 assert.match(canvas,/tryLayoutTitle\(/);
 assert.match(canvas,/标题排版失败/);
 assert.match(canvas,/if\(failOnLayoutError\)throw new Error/);
 assert.match(render,/failOnLayoutError/);
});
