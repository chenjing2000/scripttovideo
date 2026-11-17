import {DEFAULT_STYLE,DEFAULT_TITLE_STYLE,WIDTH,HEIGHT} from './types';
import type {Project} from './types';

export function createProject(subtitleName:string):Project{
 return {format:'script-to-video-project',schemaVersion:3,script:{filename:subtitleName},
 canvas:{width:WIDTH,height:HEIGHT},style:{...DEFAULT_STYLE},
 titleStyle:{...DEFAULT_TITLE_STYLE},export:{fps:30,quality:'standard'}};
}
export function normalizeProjectStyle(project:Project):Project{
 // Ignore obsolete per-project media kind; the selected media determines audio/video mode.
 const {mediaKind:_obsoleteMediaKind,...settings}=project as Project&{mediaKind?:unknown};
 return {...settings,canvas:project.canvas??{width:WIDTH,height:HEIGHT},
 titleStyle:{...DEFAULT_TITLE_STYLE,...project.titleStyle},
 style:{...DEFAULT_STYLE,...project.style}};
}
export function validateProject(value:unknown):value is Project{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as Project;
 if(p.format!=='script-to-video-project'||p.schemaVersion!==3||'source' in p||'overrides' in p||'savedAt' in p)return false;
 if(!p.script||typeof p.script.filename!=='string'||!p.script.filename.toLowerCase().endsWith('.script.json')||
    p.script.filename.includes('/')||p.script.filename.includes('\\'))return false;
 if(!p.canvas||!Number.isInteger(p.canvas.width)||!Number.isInteger(p.canvas.height)||
    p.canvas.width%2!==0||p.canvas.height%2!==0||
    p.canvas.width<320||p.canvas.height<320||p.canvas.width>3840||p.canvas.height>3840)return false;
 if(!p.export||(p.export.fps!==30&&p.export.fps!==60)||
    (p.export.quality!=='standard'&&p.export.quality!=='high'))return false;
 if(!p.style||typeof p.style!=='object')return false;
 const s=p.style;
 if('firstLineIndentCh' in s)return false;
 if(s.textAlign!=='left'&&s.textAlign!=='justify')return false;
 if(typeof s.fontFamily!=='string'||!s.fontFamily.trim())return false;
 for(const key of ['fontSize','fontWeight','lineHeight','paragraphGap','paddingX','paddingY'] as const){
  if(typeof s[key]!=='number'||!Number.isFinite(s[key]))return false;
 }
 if(s.fontSize<=0||s.fontWeight<=0||s.lineHeight<=0||s.paragraphGap<0||
    (s.firstLineIndentEm??0)<0||s.paddingX<0||s.paddingY<0)return false;
 for(const key of ['textColor','highlightColor','backgroundColor'] as const){
  if(typeof s[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(s[key]))return false;
 }
 if(s.firstLineIndentEm!==undefined&&(!Number.isInteger(s.firstLineIndentEm)||s.firstLineIndentEm<0||s.firstLineIndentEm>9))return false;
 if(s.minScrollDuration!==undefined&&(!Number.isFinite(s.minScrollDuration)||s.minScrollDuration<0))return false;
 if(p.titleStyle!==undefined){const t=p.titleStyle;
  if(!t||typeof t!=='object'||Array.isArray(t))return false;
  if(t.bold!==undefined&&typeof t.bold!=='boolean'||typeof t.fontFamily!=='string'||!t.fontFamily.trim()||!Number.isInteger(t.fontSize)||t.fontSize<1||t.fontSize>200||!Number.isInteger(t.lineHeight)||t.lineHeight<t.fontSize||t.lineHeight>300||!Number.isInteger(t.paragraphGap)||t.paragraphGap<0||t.paragraphGap>200||typeof t.color!=='string'||!/^#[0-9a-f]{6}$/i.test(t.color))return false;
 }
 return true;
}
