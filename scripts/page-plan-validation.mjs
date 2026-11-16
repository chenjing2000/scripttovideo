/** Preflight an explicit export snapshot before bundling or touching the final MP4. */
export function assertExportPagePlan(plan, transcript, width, height) {
 const fail=()=>{throw new Error('Invalid export page-plan snapshot: viewport, structure or word coverage does not match');};
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const positive=v=>finite(v)&&v>0;
 if(!obj(plan)||!Array.isArray(plan.pages)||!Array.isArray(plan.switches)||
    !Array.isArray(plan.warnings)||plan.warnings.some(w=>typeof w!=='string')||
    plan.pages.length!==plan.switches.length||
    plan.viewportWidth!==width||plan.viewportHeight!==height||
    !positive(plan.availableWidth)||!positive(plan.availableHeight)||
    plan.availableWidth>width||plan.availableHeight>height)fail();
 const visible=[];
 transcript.segments.forEach((segment,si)=>segment.words.forEach((word,wi)=>{
  const id=`s${si}w${wi}`;
  if(word.hidden!==true)
   visible.push({id,start:word.start,end:word.end});
 }));
 if((visible.length===0)!==(plan.pages.length===0))fail();
 if(plan.pages.length&&plan.switches[0]!==0)fail();
 let cursor=0,lastSwitch=-Infinity;
 for(let i=0;i<plan.pages.length;i++){
  const page=plan.pages[i],sw=plan.switches[i];
  if(!finite(sw)||sw<0||sw<lastSwitch||!obj(page)||page.index!==i||
     !Array.isArray(page.rows)||!page.rows.length||
     !finite(page.usedHeight)||page.usedHeight<0||page.usedHeight>plan.availableHeight+1e-6)fail();
  lastSwitch=sw;
  const first=visible[cursor];let last,previousBottom=-Infinity;
  for(const row of page.rows){
   if(!obj(row)||!Array.isArray(row.words)||!row.words.length||
      !Number.isInteger(row.startWord)||row.startWord!==cursor||
      !Number.isInteger(row.endWord)||row.endWord!==cursor+row.words.length-1||
      !finite(row.top)||row.top<0||!positive(row.height)||
      row.top<previousBottom-1e-6||row.top+row.height>height+1e-6||
      typeof row.paragraphStart!=='boolean'||typeof row.paragraphEnd!=='boolean'||
      typeof row.endsSentence!=='boolean')fail();
   previousBottom=row.top+row.height;
   for(const item of row.words){
    const word=visible[cursor];
    if(!obj(item)||!word||item.index!==cursor||item.id!==word.id||
       !finite(item.x)||!finite(item.width)||item.width<0)fail();
    last=word;cursor++;
   }
  }
  if(!first||!last||page.firstWordId!==first.id||page.lastWordId!==last.id||
     page.firstStart!==first.start||page.lastEnd!==last.end)fail();
 }
 if(cursor!==visible.length)fail();
}
