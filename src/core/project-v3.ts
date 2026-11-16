import type {Project,ReadingStyle} from './types';
import {validateProject} from './project';

/** Project v3 contains presentation settings only; subtitle edits live in refined JSON. */
export interface PresentationProject {
 format:'script-to-video-project';
 schemaVersion:3;
 source:Project['source'];
 mediaKind?:Project['mediaKind'];
 canvas:Project['canvas'];
 style:ReadingStyle;
 export:Project['export'];
 savedAt?:string;
}

export function toPresentationProject(legacy:Project):PresentationProject{
 if(!validateProject(legacy))throw new Error('旧项目格式无效，不能转换');
 const {format,source,mediaKind,canvas,style,savedAt}=legacy;
 return {format,schemaVersion:3,source:{...source},...(mediaKind?{mediaKind}:{}),
  canvas:{...canvas},style:{...style},export:{...legacy.export},
  ...(savedAt?{savedAt}:{})};
}

export function validatePresentationProject(value:unknown):value is PresentationProject{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as Record<string,unknown>;
 if(p.schemaVersion!==3||'overrides' in p)return false;
 // Reuse the existing strict validation for shared layout/style/export fields.
 return validateProject({...p,schemaVersion:2,overrides:{}});
}
