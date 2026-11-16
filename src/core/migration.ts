import type {Project,ScriptToVideoInput} from './types';
import {applyOverrides,parseScriptToVideo,validateScriptToVideo} from './transcript';
import {validateProject} from './project';
import {toPresentationProject} from './project-v3';
import {buildRefinedScript,buildRefinedText} from './refined';

/** Prepare a legacy migration in memory; the caller must persist refined and TXT
 * successfully before replacing the legacy project. Never silently merge with
 * an existing refined file: that is a conflict requiring an explicit decision.
 */
export function prepareLegacyMigration(source:ScriptToVideoInput,legacy:Project,refinedExists:boolean){
 validateScriptToVideo(source);
 if(refinedExists)throw new Error('已存在 refined 字幕：不能自动叠加旧项目覆盖值');
 const original=parseScriptToVideo(source);
 if(!validateProject(legacy,original.words))throw new Error('旧项目格式或覆盖值无效');
 const migrated=applyOverrides(original,legacy);
 const refined=buildRefinedScript(source,migrated.title,migrated.words);
 const txt=buildRefinedText(migrated.title,migrated.words);
 return {refined,txt};
}

/** Only call after both content files have been durably written and verified. */
export function finalizeLegacyProject(legacy:Project):Project{
 if(!validateProject(legacy))throw new Error('旧项目格式无效');
 return toPresentationProject(legacy);
}
