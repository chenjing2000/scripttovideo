// Shared text measurement for deterministic pagination and title layout.
export type Measure = (text: string) => number;
export function measureWithCanvas(fontFamily:string,fontSize:number,fontWeight=400):Measure{
 const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D 不可用');
 ctx.font=`${fontWeight} ${fontSize}px ${fontFamily}`;return (s)=>ctx.measureText(s).width;
}
