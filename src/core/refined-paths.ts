/** Canonical file names for a source <stem>.script.json.
 * The desktop host owns directory creation and collision-safe atomic writes.
 */
export interface RefinedFileNames {
 workFolder:string;
 project:string;
 refined:string;
 text:string;
}
export function refinedFileNames(subtitleName:string):RefinedFileNames{
 if(!subtitleName.toLowerCase().endsWith('.script.json'))throw new Error('必须使用 .script.json 原始字幕');
 const stem=subtitleName.slice(0,-'.script.json'.length);
 if(!stem||stem==='.'||stem==='..'||/[\\/\\\\]/u.test(stem))throw new Error('原始字幕名称无效');
 return {workFolder:stem,project:stem+'.project.json',
  refined:stem+'.script.revise.json',text:stem+'.txt'};
}
