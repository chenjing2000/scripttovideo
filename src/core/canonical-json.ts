/** Compare JSON data by value, ignoring object key insertion order.
 * Array order stays significant; no change to the serialized on-disk format.
 */
export function canonicalJson(value:unknown):string{
 return JSON.stringify(value,(_,item)=>
  item&&typeof item==='object'&&!Array.isArray(item)
   ?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b)))
   :item)??'undefined';
}
export function sameCanonicalJson(a:unknown,b:unknown):boolean{
 return canonicalJson(a)===canonicalJson(b);
}
