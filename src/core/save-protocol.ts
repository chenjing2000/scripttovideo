/**
 * One user-initiated save at a time. Both the Save button and pre-export
 * persistence will use this protocol; there is no background autosave.
 *
 * The operation is bound to a source and revision so delayed host messages
 * cannot acknowledge a different document or a newer edit.
 */
export type SaveReason = 'manual'|'export'|'close'|'switch';
export type SaveStage = 'refined'|'project';
export type SaveOperation = Readonly<{
 operationId:number;
 revision:number;
 fingerprint:string;
 subtitleName:string;
 reason:SaveReason;
 stage:SaveStage;
}>;

export type SaveReply = Readonly<{
 operationId:number;
 revision:number;
 kind:'refined-saved'|'refined-save-failed'|'project-v3-saved'|'project-v3-save-failed';
}>;

export function matchesSaveReply(operation:SaveOperation,reply:SaveReply):boolean{
 if(operation.operationId!==reply.operationId||operation.revision!==reply.revision)return false;
 return operation.stage==='refined'
  ?reply.kind==='refined-saved'||reply.kind==='refined-save-failed'
  :reply.kind==='project-v3-saved'||reply.kind==='project-v3-save-failed';
}

export function isSaveFailure(reply:SaveReply):boolean{
 return reply.kind==='refined-save-failed'||reply.kind==='project-v3-save-failed';
}

/** A successful refined write advances to the project write; only the
 * project acknowledgement can finish a two-stage save. */
export function advanceSave(operation:SaveOperation,reply:SaveReply):SaveOperation|null{
 if(!matchesSaveReply(operation,reply)||isSaveFailure(reply))return null;
 return operation.stage==='refined'?{...operation,stage:'project'}:null;
}
