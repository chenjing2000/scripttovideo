/** Match one asynchronous save result to the intended editor revision and script. */
export type BundleSaveOperation=Readonly<{operationId:number;revision:number;subtitleName:string}>;
export type BundleSaveReply=Readonly<BundleSaveOperation&{
 kind:'project-bundle-saved'|'project-bundle-save-failed';message:string;
}>;
export function isMatchingBundleSaveReply(
 pending:BundleSaveOperation|null,reply:BundleSaveReply,
 activeSource:Pick<BundleSaveOperation,'subtitleName'>|null
):boolean{
 return pending!==null&&activeSource!==null&&
 pending.operationId===reply.operationId&&pending.revision===reply.revision&&
 pending.subtitleName.toLowerCase()===reply.subtitleName.toLowerCase()&&
 activeSource.subtitleName.toLowerCase()===pending.subtitleName.toLowerCase();
}
export function bundleSaveSucceeded(reply:BundleSaveReply):boolean{
 return reply.kind==='project-bundle-saved';
}
