import {DEFAULT_TITLE_STYLE} from './types';
import type {Project,ReadingStyle,TitleStyle} from './types';
import {validateProject} from './project';

/** Project v3 contains presentation settings only; subtitle edits live in refined JSON. */
export interface PresentationProject {
 format:'script-to-video-project';
 schemaVersion:3;
 source:Project['source'];
 mediaKind?:Project['mediaKind'];
 canvas:Project['canvas'];
 style:ReadingStyle;
 titleStyle?:TitleStyle;
 export:Project['export'];
 savedAt?:string;
}

export function toPresentationProject(legacy:Project):PresentationProject{
 if(!validateProject(legacy))throw new Error('旧项目格式无效，不能转换');
 const {format,source,mediaKind,canvas,style,savedAt}=legacy;
 return {format,schemaVersion:3,source:{...source},...(mediaKind?{mediaKind}:{}),
  canvas:{...canvas},style:{...style},titleStyle:{...DEFAULT_TITLE_STYLE,...legacy.titleStyle},export:{...legacy.export},
  ...(savedAt?{savedAt}:{})};
}

export function validatePresentationProject(value:unknown):value is PresentationProject{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as Record<string,unknown>;
 if(p.schemaVersion!==3||'overrides' in p)return false;
 // Reuse the existing strict validation for shared layout/style/export fields.
 if(p.titleStyle!==undefined){
  const t=p.titleStyle as TitleStyle;
  if(!t||typeof t!=='object'||typeof t.bold!=='boolean'||typeof t.fontFamily!=='string'||!t.fontFamily.trim()||
     !Number.isInteger(t.fontSize)||t.fontSize<1||t.fontSize>200||
     !Number.isInteger(t.lineHeight)||t.lineHeight<t.fontSize||t.lineHeight>300||
     !Number.isInteger(t.paragraphGap)||t.paragraphGap<0||t.paragraphGap>200||
     typeof t.color!=='string'||!/^#[0-9a-f]{6}$/i.test(t.color))return false;
 }
 return validateProject({...p,schemaVersion:2,overrides:{}});
}
