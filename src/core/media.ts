/** Single ordered list for desktop and browser media discovery. */
export const TRANSCRIPT_SUFFIX = '.script.json';
export const MEDIA_PRIORITY = ['.mp4', '.mkv', '.m4a', '.mp3', '.wav'] as const;
export type MediaKind = 'video'|'audio';
export type MediaCandidate = {name:string;kind:MediaKind;extension:typeof MEDIA_PRIORITY[number]};
const kindFor = (ext:string):MediaKind => ext==='.mp4'||ext==='.mkv'?'video':'audio';
export function transcriptStem(filename:string):string {
 if (!filename.toLowerCase().endsWith(TRANSCRIPT_SUFFIX)) throw new Error(`请选择 *${TRANSCRIPT_SUFFIX} 文件`);
 return filename.slice(0,-TRANSCRIPT_SUFFIX.length);
}
/** Resolve files by extension priority, independent of directory enumeration order. */
export function findMediaCandidates(filename:string,names:readonly string[]):MediaCandidate[] {
 const stem=transcriptStem(filename).toLowerCase();
 return MEDIA_PRIORITY.flatMap(extension=>{
  const name=names.find(n=>n.toLowerCase()===stem+extension);
  return name?[{name,kind:kindFor(extension),extension}]:[];
 });
}
/** Compatibility helper for callers requiring the first existing match only. */
export function selectCompanion(filename:string,names:readonly string[]):{name:string;kind:MediaKind}|null {
 const candidate=findMediaCandidates(filename,names)[0];
 return candidate?{name:candidate.name,kind:candidate.kind}:null;
}
export function validCanvas(width:number,height:number):boolean {
 return Number.isInteger(width)&&Number.isInteger(height)&&width>=320&&height>=320&&width<=3840&&height<=3840&&width%2===0&&height%2===0;
}
