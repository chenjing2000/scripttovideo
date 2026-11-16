import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {exportPlainText}=require('../.tmp-core/plain-text.js');
const word=(display,options={})=>({id:'s0w0',segmentId:'s0',original:display,display,start:1,end:2,hidden:false,breakParagraph:false,...options});

test('M6.11: exports visible word content verbatim, including odd punctuation and original case',()=>{
 assert.equal(exportPlainText([word('Hello'),word(','),word('WORLD'),word('!')]),'Hello , WORLD !');
});

test('M6.11: paragraphs are separated by exactly one empty CRLF line, no final newline',()=>{
 const result=exportPlainText([word('One'),word('two.',{breakParagraph:true}),word('Third'),word('line!',{breakParagraph:true})]);
 assert.equal(result,'One two.\r\n\r\nThird line!');
 assert.equal(result.includes('\n')&&result.replaceAll('\r\n','').includes('\n'),false);
});

test('M6.11: hidden words are excluded but their paragraph boundary remains visible',()=>{
 assert.equal(exportPlainText([word('Keep'),word('hidden',{hidden:true,breakParagraph:true}),word('this')]),'Keep\r\n\r\nthis');
 assert.equal(exportPlainText([word('invisible',{hidden:true})]),'');
 assert.equal(exportPlainText([word('hidden',{hidden:true,breakParagraph:true}),word('visible')]),'visible');
});

test('M6.11: handles Unicode as plaintext without markup or timestamps',()=>{
 assert.equal(exportPlainText([word('café'),word('中文'),word('00:01',{hidden:true})]),'café 中文');
});

test('M6.22: toolbar keeps save and MP4 while TXT is derived from the bundle',()=>{
 const source=readFileSync('src/main.tsx','utf8');
 assert.match(source,/iconButton\('settings','设置',openSettings\).*iconButton\('reload',.*iconButton\('import',.*iconButton\('save','保存工程 Ctrl\+S'.*iconButton\('export','导出 MP4'/s);
 assert.doesNotMatch(source,/iconButton\('text-export'/);
 assert.match(source,/kind:'project-bundle-save'/);
 assert.match(source,/currentWords=updateWord\(words,active\.id,active\.text\)/);
});

test('M6.22: native bundle saves derived TXT rather than using the removed export-text command',()=>{
 const source=readFileSync('desktop/ReaderWindow.cs','utf8');
 assert.match(source,/case "project-bundle-save":\s*try \{ SaveProjectBundle\(request\)/);
 assert.doesNotMatch(source,/case "export-text":/);
 assert.match(source,/new UTF8Encoding\(false\)/);
 assert.doesNotMatch(source,/new SaveFileDialog/);
});
