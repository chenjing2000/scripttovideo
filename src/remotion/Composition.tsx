import React,{useMemo} from 'react';
import {AbsoluteFill,useCurrentFrame,useVideoConfig,staticFile,OffthreadVideo} from 'remotion';
import {Audio} from '@remotion/media';
import {ReaderCanvas} from '../ui/ReaderCanvas';
import {parseScriptToVideo,applyOverrides,DEFAULT_STYLE,normalizeProjectStyle,WIDTH,HEIGHT} from '../core';
import type {ScriptToVideoInput,Project,PresentationProject,PagePlan} from '../core';
export type RenderProps={transcript:ScriptToVideoInput;project?:Project|PresentationProject;mediaKind:'video'|'audio';videoHeight:number;mediaFile:string;durationSec?:number;pagePlan?:PagePlan};
export const ReadingComposition:React.FC<RenderProps>=({transcript,project,mediaKind,videoHeight,mediaFile,pagePlan})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig();
 const words=useMemo(()=>{
  const parsed=parseScriptToVideo(transcript);
  return project?.schemaVersion===2?applyOverrides(parsed,project).words:parsed.words;
 },[transcript,project]);
 const normalizedProject=useMemo(()=>project?normalizeProjectStyle(project):null,[project]);
 const style=normalizedProject?.style??DEFAULT_STYLE;
 const canvasWidth=normalizedProject?.canvas.width??WIDTH,canvasHeight=normalizedProject?.canvas.height??HEIGHT;
 const src=staticFile(mediaFile);
 return <AbsoluteFill><ReaderCanvas words={words} style={style} time={frame/fps} canvasWidth={canvasWidth} canvasHeight={canvasHeight} videoHeight={mediaKind==='video'?videoHeight:0} pagePlan={pagePlan} video={mediaKind==='video'?<OffthreadVideo src={src} style={{width:canvasWidth,height:videoHeight,objectFit:'fill'}}/>:null}/>{mediaKind==='audio'&&<Audio src={src}/>}</AbsoluteFill>;
};
