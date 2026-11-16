import type {Project,ScriptToVideoInput,Word} from './types';
import {buildRefinedScript,buildRefinedText} from './refined';
import {toPresentationProject,type PresentationProject} from './project-v3';
import {validateScriptToVideo} from './transcript';
import {sameCanonicalJson} from './canonical-json';

export type SaveSnapshot = Readonly<{
 refined:ScriptToVideoInput;
 text:string;
 project:PresentationProject;
 contentChanged:boolean;
 projectChanged:boolean;
}>;

/** Build one immutable-in-intent snapshot for a user-initiated save or export.
 * Callers must not recalculate from live React state after native save begins.
 * This function does not write files or acknowledge a revision.
 */
export function planManualSave(
 original:ScriptToVideoInput,
 previousRefined:ScriptToVideoInput,
 previousText:string,
 previousProject:PresentationProject|null,
 currentProject:Project,
 words:readonly Word[],
 title:string
):SaveSnapshot{
 validateScriptToVideo(original);
 validateScriptToVideo(previousRefined);
 if(previousRefined.script_to_video.schemaVersion!==3)
  throw new Error('保存前必须存在已确认的 refined v3 文件');
 if(typeof previousText!=='string')throw new Error('缺少 TXT 磁盘快照');
 const refined=buildRefinedScript(original,title,words);
 const text=buildRefinedText(title,words);
 const candidate=toPresentationProject(currentProject);
 // savedAt is metadata, not a presentation edit. Do not rewrite a project
 // merely because a caller generated a fresh save timestamp.
 const {savedAt:_previousSavedAt,...previousPresentation}=previousProject??{};
 const {savedAt:_candidateSavedAt,...candidatePresentation}=candidate;
 void _previousSavedAt;void _candidateSavedAt;
 // Compare parsed JSON structure, not object identity or formatting.
 const projectChanged=previousProject===null||!sameCanonicalJson(previousPresentation,candidatePresentation);
 return {
  refined,text,project:projectChanged?candidate:previousProject!,
  contentChanged:!sameCanonicalJson(previousRefined,refined)||previousText!==text,
  projectChanged
 };
}
