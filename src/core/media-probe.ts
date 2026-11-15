import type {MediaKind} from './media';
import {describeMediaError} from './media-diagnostics';

export type MediaProbeResult={duration:number;videoRatio:number|null};
export type ProbeFailure={name:string;reason:string};
export type ProbedCandidate<T>={item:T;index:number;result:MediaProbeResult};

/**
 * Probe with a detached muted media element. A successful video probe requires decoded
 * frame data (HAVE_CURRENT_DATA); audio requires actual silent playback progress.
 * Metadata/canplay alone is never treated as proof of decoding.
 */
export function probePlayableMedia(url:string,kind:MediaKind,signal:AbortSignal,timeoutMs=8000):Promise<MediaProbeResult>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new Error('探测已取消'));return}
  const element=document.createElement(kind==='video'?'video':'audio') as HTMLMediaElement;
  element.preload='auto';element.muted=true;element.volume=0;
  if(kind==='video')(element as HTMLVideoElement).playsInline=true;
  let settled=false;
  const timeout=window.setTimeout(()=>finish(new Error('初始解码超时')),timeoutMs);
  const cleanup=()=>{
   window.clearTimeout(timeout);signal.removeEventListener('abort',onAbort);
   element.onloadedmetadata=null;element.onloadeddata=null;element.ontimeupdate=null;
   element.onended=null;element.onerror=null;
   element.pause();element.removeAttribute('src');element.load();
  };
  const finish=(err?:Error,result?:MediaProbeResult)=>{
   if(settled)return;settled=true;cleanup();
   if(err)reject(err);else resolve(result!);
  };
  const onAbort=()=>finish(new Error('探测已取消'));
  const validDuration=()=>Number.isFinite(element.duration)&&element.duration>0;
  element.onerror=()=>finish(new Error(describeMediaError(element.error?.code)));
  element.onloadedmetadata=()=>{
   if(!validDuration()){finish(new Error('无法读取有效媒体时长'));return}
   if(kind==='video'){
    const v=element as HTMLVideoElement;
    if(v.videoWidth<=0||v.videoHeight<=0)finish(new Error('视频尺寸无效'));
   }else{
    // Explicit muted playback provides a stronger signal than metadata/canplay.
    void element.play().catch(error=>finish(new Error(`音频初始播放失败：${String(error)}`)));
   }
  };
  if(kind==='video'){
   element.onloadeddata=()=>{
    const v=element as HTMLVideoElement;
    if(!validDuration()||v.videoWidth<=0||v.videoHeight<=0||v.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;
    finish(undefined,{duration:v.duration,videoRatio:v.videoHeight/v.videoWidth});
   };
  }else{
   element.ontimeupdate=()=>{
    if(validDuration()&&element.currentTime>0.02)finish(undefined,{duration:element.duration,videoRatio:null});
   };
   element.onended=()=>{
    if(validDuration()&&element.currentTime>0)finish(undefined,{duration:element.duration,videoRatio:null});
   };
  }
  signal.addEventListener('abort',onAbort,{once:true});
  element.src=url;element.load();
 });
}

/** Sequentially probe all candidates; a failure never changes the active project. */
export async function probeInPriority<T extends {name:string;kind:MediaKind}>(
 candidates:readonly T[],getUrl:(candidate:T)=>Promise<string>,signal:AbortSignal,
 probe:(url:string,kind:MediaKind,signal:AbortSignal)=>Promise<MediaProbeResult>=probePlayableMedia
):Promise<{selected:ProbedCandidate<T>|null;failures:ProbeFailure[]}>{
 const failures:ProbeFailure[]=[];
 for(let index=0;index<candidates.length;index++){
  if(signal.aborted)throw new Error('探测已取消');
  const item=candidates[index];
  try{
   const url=await getUrl(item);
   if(signal.aborted)throw new Error('探测已取消');
   const result=await probe(url,item.kind,signal);
   if(signal.aborted)throw new Error('探测已取消');
   return {selected:{item,index,result},failures};
  }catch(error){
   if(signal.aborted)throw error;
   failures.push({name:item.name,reason:String(error)});
  }
 }
 return {selected:null,failures};
}
