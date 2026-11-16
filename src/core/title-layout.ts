import type {TitleStyle} from './types';
import type {Measure} from './layout';

/** Shared title wrapping for preview, first-page pagination and MP4. */
export function layoutTitle(title:string,style:TitleStyle,width:number,measure:Measure){
 if(!title)return {lines:[] as string[],height:0};
 if(!Number.isFinite(width)||width<=0)throw new Error('标题区域宽度无效');
 const lines:string[]=[];
 for(const paragraph of title.replace(/\r\n?/g,'\n').split('\n')){
  if(!paragraph.trim()){lines.push('');continue}
  let line='';
  const pushToken=(token:string)=>{
   if(!token)return;
   // Never let a single long word (or unspaced CJK title) overflow the canvas.
   if(measure(token)>width){
    for(const character of Array.from(token)){
     if(line&&measure(line+character)>width){lines.push(line.trimEnd());line=''}
     if(measure(character)>width)throw new Error('标题字号过大，单个字符已超出可用宽度');
     line+=character;
    }
    return;
   }
   const candidate=line?line+' '+token:token;
   if(line&&measure(candidate)>width){lines.push(line.trimEnd());line=token}
   else line=candidate;
  };
  for(const word of paragraph.trim().split(/\s+/u))pushToken(word);
  lines.push(line.trimEnd());
 }
 return {lines,height:lines.length*style.lineHeight+style.paragraphGap};
}
