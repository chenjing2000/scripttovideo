/** Correlates one native three-file transaction with the frozen editor revision.
 * No autosave or implicit retry: only the caller starts an operation.
 */
export type BundleSaveOperation=Readonly<{
 operationId:number;
 revision:number;
 fingerprint:string;
 subtitleName:string;
}>;
export type BundleSaveReply=Readonly<BundleSaveOperation&{
 kind:'project-bundle-saved'|'project-bundle-save-failed';
 message:string;
}>;

export function isMatchingBundleSaveReply(
 pending:BundleSaveOperation|null,
 reply:BundleSaveReply,
 activeSource:Pick<BundleSaveOperation,'fingerprint'|'subtitleName'>|null
):boolean{
 return pending!==null&&activeSource!==null&&
  pending.operationId===reply.operationId&&
  pending.revision===reply.revision&&
  pending.fingerprint===reply.fingerprint&&
  pending.subtitleName.toLowerCase()===reply.subtitleName.toLowerCase()&&
  activeSource.fingerprint===pending.fingerprint&&
  activeSource.subtitleName.toLowerCase()===pending.subtitleName.toLowerCase();
}

export function bundleSaveSucceeded(reply:BundleSaveReply):boolean{
 return reply.kind==='project-bundle-saved';
}
