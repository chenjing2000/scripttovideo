import React,{useMemo} from 'react';
import {AbsoluteFill,useCurrentFrame,useVideoConfig,staticFile,OffthreadVideo} from 'remotion';
import {Audio} from '@remotion/media';
import {ReaderCanvas} from '../ui/ReaderCanvas';
import {parseScriptToVideo,DEFAULT_STYLE,WIDTH,HEIGHT,DEFAULT_TITLE_STYLE} from '../core';
import type {ScriptToVideoInput,Project,PagePlan} from '../core';
export type RenderProps={transcript:ScriptToVideoInput;project?:Project;mediaKind:'video'|'audio';videoHeight:number;mediaFile:string;durationSec?:number;pagePlan?:PagePlan};
export const ReadingComposition:React.FC<RenderProps>=({transcript,project,mediaKind,videoHeight,mediaFile,pagePlan})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig();
 const words=useMemo(()=>parseScriptToVideo(transcript).words,[transcript]);
 const style=useMemo(()=>({...DEFAULT_STYLE,...project?.style}),[project?.style]);
 const titleStyle=useMemo(()=>({...DEFAULT_TITLE_STYLE,...project?.titleStyle}),[project?.titleStyle]);
 const canvasWidth=project?.canvas.width??WIDTH,canvasHeight=project?.canvas.height??HEIGHT;
 const src=staticFile(mediaFile);
 return <AbsoluteFill><ReaderCanvas words={words} title={transcript.title??''} titleStyle={titleStyle} failOnLayoutError style={style} time={frame/fps} canvasWidth={canvasWidth} canvasHeight={canvasHeight} videoHeight={mediaKind==='video'?videoHeight:0} pagePlan={pagePlan} video={mediaKind==='video'?<OffthreadVideo src={src} style={{width:canvasWidth,height:videoHeight,objectFit:'fill'}}/>:null}/>{mediaKind==='audio'&&<Audio src={src}/>}</AbsoluteFill>;
};
