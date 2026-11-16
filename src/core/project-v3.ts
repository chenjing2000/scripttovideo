import {DEFAULT_TITLE_STYLE} from './types';
import type {Project,ReadingStyle,TitleStyle} from './types';
import {validateProject,validateProjectSharedFields} from './project';

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

export function toPresentationProject(view:Project):PresentationProject{
 if(!validateProject(view))throw new Error('工程视图格式无效，不能生成 project v3');
 const {format,source,mediaKind,canvas,style,savedAt}=view;
 return {format,schemaVersion:3,source:{...source},...(mediaKind?{mediaKind}:{}),
  canvas:{...canvas},style:{...style},titleStyle:{...DEFAULT_TITLE_STYLE,...view.titleStyle},export:{...view.export},
  ...(savedAt?{savedAt}:{})};
}

export function validatePresentationProject(value:unknown):value is PresentationProject{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as Record<string,unknown>;
 if(p.schemaVersion!==3||'overrides' in p)return false;
 // Reuse the existing strict validation for shared layout/style/export fields.
 return validateProjectSharedFields(value);
}
