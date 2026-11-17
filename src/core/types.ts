export interface Word { id: string; segmentId: string; original: string; display: string; start: number; end: number; score?: number; hidden: boolean; breakParagraph: boolean }
export interface Transcript { language?: string; title: string; words: Word[]; warnings: string[] }
export interface ScriptToVideoInput {title:string;language:'en';segments:Array<{start?:number;end?:number;text?:string;words:Array<{word:string;start:number;end:number;score?:number;breakParagraph?:true;hidden?:true}>}>;word_segments?:unknown[];script_to_video:{format:'script-to-video';schemaVersion:3}}

export interface TitleStyle {bold:boolean;fontFamily:string;fontSize:number;lineHeight:number;paragraphGap:number;color:string}
export const DEFAULT_TITLE_STYLE:TitleStyle={bold:true,fontFamily:'Arial',fontSize:50,lineHeight:70,paragraphGap:20,color:'#C25160'};
export interface ReadingStyle {textAlign:'justify'|'left';fontFamily:string;fontSize:number;fontWeight:number;firstLineIndentEm?:number;lineHeight:number;paragraphGap:number;paddingX:number;paddingY:number;textColor:string;highlightColor:string;backgroundColor:string;minScrollDuration:number}
export interface Project {canvas:{width:number;height:number};format:'script-to-video-project';schemaVersion:3;script:{filename:string};style:ReadingStyle;titleStyle?:TitleStyle;export:{fps:30|60;quality:'standard'|'high'}}
export const DEFAULT_STYLE:ReadingStyle={textAlign:'justify',fontFamily:'Arial',fontSize:40,fontWeight:400,firstLineIndentEm:2,lineHeight:1.4,paragraphGap:20,paddingX:36,paddingY:30,textColor:'#293847',highlightColor:'#b81a35',backgroundColor:'#f7f4ec',minScrollDuration:.15};
export const WIDTH=1200; export const HEIGHT=1600;
