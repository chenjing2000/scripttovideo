import type {Project,ScriptToVideoInput,Word} from './types';
import {buildRefinedScript,buildRefinedText} from './refined';
export type SaveSnapshot=Readonly<{refined:ScriptToVideoInput;text:string;project:Project}>;
/** Generate the full write set from one editor revision. Never compare old disk contents. */
export function planManualSave(original:ScriptToVideoInput,project:Project,words:readonly Word[],title:string):SaveSnapshot{
 return {refined:buildRefinedScript(original,title,words),text:buildRefinedText(title,words),project};
}
