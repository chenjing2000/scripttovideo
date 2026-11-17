import type {Project,ScriptToVideoInput,Word} from './types';
import {buildRevisedScript,buildRevisedText} from './revise';
export type SaveSnapshot=Readonly<{revised:ScriptToVideoInput;text:string;project:Project}>;
/** Generate the full write set from one editor revision. Never compare old disk contents. */
export function planManualSave(original:ScriptToVideoInput,project:Project,words:readonly Word[],title:string):SaveSnapshot{
 return {revised:buildRevisedScript(original,title,words),text:buildRevisedText(title,words),project};
}
