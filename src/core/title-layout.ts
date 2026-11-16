import type {TitleStyle} from './types';
import type {Measure} from './layout';

/** Shared deterministic title wrapping for preview, pagination and MP4. */
export function layoutTitle(title:string,style:TitleStyle,width:number,measure:Measure){
 if(!title)return {lines:[] as string[],height:0};
 if(!Number.isFinite(width)||width<=0)throw new Error('标题区域宽度无效');
 const lines:string[]=[];
 for(const paragraph of title.replace(/\r\n?/g,'\n').split('\n')){
  if(!paragraph){lines.push('');continue}
  let line='';
  for(const token of paragraph.split(/(\s+)/u).filter(Boolean)){
   if(!line){line=token.trimStart();continue}
   const candidate=line+token;
   if(measure(candidate)<=width){line=candidate;continue}
   if(line.trim())lines.push(line.trimEnd());
   line=token.trimStart();
  }
  if(line.trim()||!lines.length)lines.push(line.trimEnd());
 }
 return {lines,height:lines.length*style.lineHeight+style.paragraphGap};
}
