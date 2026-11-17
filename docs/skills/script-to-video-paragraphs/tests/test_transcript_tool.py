import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/'scripts'/'transcript_tool.py'
spec=importlib.util.spec_from_file_location('script_to_video_tool',SCRIPT)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
SOURCE=Path(__file__).resolve().parents[4]/'fixtures'/'6 Minute English 01-seg1.json'

class TestTranscriptTool(unittest.TestCase):
    def setUp(self): self.raw=json.loads(SOURCE.read_text(encoding='utf-8'))
    def test_validate_fixture_and_exact_source(self):
        fixture=SOURCE.with_name('6 Minute English 01-seg1.script.json')
        data=mod.load(fixture);self.assertEqual(len(mod.check(data,fixture)),200)
        stripped=json.loads(json.dumps(data));stripped.pop('script_to_video');stripped.pop('title')
        for seg in stripped['segments']:
            for w in seg['words']:w.pop('breakParagraph',None)
        self.assertEqual(stripped,self.raw)
    def test_build_then_validate_without_source_mutation(self):
        with tempfile.TemporaryDirectory() as folder:
            d=Path(folder);src=d/'input.json';src.write_text(json.dumps(self.raw),encoding='utf-8')
            decisions=d/'decisions.json';decisions.write_text(json.dumps({'breakAfterWordIds':['s3w2','s10w38']}),encoding='utf-8')
            out=d/'input.script.json';preview=d/'input.paragraphs.txt'
            args=type('Args',(),{'input':src,'boundaries':decisions,'output':out,'preview':preview,'force':False})
            mod.build(args);mod.validate(type('VArgs',(),{'input':out,'source':src,'preview':None}))
            self.assertEqual(len(mod.check(mod.load(out))),200)
            self.assertEqual(mod.load(out)['script_to_video']['schemaVersion'],3)
            self.assertEqual(mod.load(out)['title'],'')
            self.assertTrue(mod.load(out)['segments'][3]['words'][2]['breakParagraph'])
            self.assertNotIn('breakParagraph',mod.load(out)['segments'][-1]['words'][-1])
            self.assertIn('\n\n',preview.read_text(encoding='utf-8'))
    def test_preview_is_plain_text_with_exact_paragraph_spacing(self):
        fixture=SOURCE.with_name('6 Minute English 01-seg1.script.json')
        data=mod.load(fixture)
        content=mod.preview(data)
        self.assertTrue(content.endswith('\n'))
        self.assertFalse(content.endswith('\n\n'))
        self.assertNotIn('\r',content)
        paragraphs=content.rstrip('\n').split('\n\n')
        expected=1+sum(word.get('breakParagraph') is True for _,word in mod.words_of(data))
        self.assertEqual(len(paragraphs),expected)
        self.assertTrue(all(paragraph and '\n' not in paragraph for paragraph in paragraphs))

    def test_preview_suffix_must_be_txt_for_build_edit_validate(self):
        with tempfile.TemporaryDirectory() as folder:
            d=Path(folder)
            source=d/'raw.json';source.write_text(json.dumps(self.raw),encoding='utf-8')
            decision=d/'decisions.json';decision.write_text(json.dumps({'breakAfterWordIds':['s3w2']}),encoding='utf-8')
            original=SOURCE.with_name('6 Minute English 01-seg1.script.json')
            for command,inputs in [
                (mod.build, {'input':source,'boundaries':decision,'output':d/'new.script.json','force':False}),
                (mod.edit, {'input':original,'boundaries':decision,'output':d/'revised.script.json','force':False}),
                (mod.validate, {'input':original,'source':source})
            ]:
                args=type('Args',(),{**inputs,'preview':d/'invalid.paragraphs.md'})
                with self.assertRaises(mod.ValidationError):command(args)
            self.assertFalse((d/'new.script.json').exists())
            self.assertFalse((d/'revised.script.json').exists())
            self.assertFalse((d/'invalid.paragraphs.md').exists())
            mod.ensure_text_preview(d/'VALID.TXT')
            mod.ensure_text_preview(None)

    def test_edit_changes_only_word_break_markers(self):
        with tempfile.TemporaryDirectory() as folder:
            d=Path(folder)
            original=SOURCE.with_name('6 Minute English 01-seg1.script.json')
            decision=d/'revised.json';decision.write_text(json.dumps({'breakAfterWordIds':['s10w38']}),encoding='utf-8')
            out=d/'edited.script.json'
            mod.edit(type('Args',(),{'input':original,'boundaries':decision,'output':out,'preview':None,'force':False}))
            v=mod.load(out);self.assertEqual(sum(w.get('breakParagraph') is True for _,w in mod.words_of(v)),1)
            stripped=json.loads(json.dumps(v));stripped.pop('script_to_video');stripped.pop('title')
            for seg in stripped['segments']:
                for w in seg['words']: w.pop('breakParagraph',None)
            self.assertEqual(stripped,self.raw)
    def test_bad_markers_fail(self):
        fixture=SOURCE.with_name('6 Minute English 01-seg1.script.json')
        data=mod.load(fixture)
        data['segments'][0]['words'][0]['breakParagraph']=False
        with self.assertRaises(mod.ValidationError):mod.check(data)
        del data['segments'][0]['words'][0]['breakParagraph']
        data['segments'][-1]['words'][-1]['breakParagraph']=True
        with self.assertRaises(mod.ValidationError):mod.check(data)
    def test_v2_and_old_formats_rejected(self):
        with self.assertRaises(mod.ValidationError):mod.check(self.raw)
        current=mod.load(SOURCE.with_name('6 Minute English 01-seg1.script.json'))
        legacy={**current, 'script_to_video':{**current['script_to_video'],'schemaVersion':2}}
        with self.assertRaises(mod.ValidationError):mod.check(legacy)
        no_title={key:value for key,value in current.items() if key!='title'}
        with self.assertRaises(mod.ValidationError):mod.check(no_title)
        with self.assertRaises(mod.ValidationError):mod.check({**self.raw,'enscript':{'format':'enscript-transcript','schemaVersion':1}})
    def test_bad_decision_ids(self):
        ids=[ident for ident,_ in mod.words_of(self.raw)]
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'decisions.json'
            for bad in [['s999w0'],['s1w0','s1w0'],[ids[-1]]]:
                path.write_text(json.dumps({'breakAfterWordIds':bad}),encoding='utf-8')
                with self.assertRaises(mod.ValidationError):mod.read_decisions(path,ids)


    def test_inspect_rejects_output_that_would_overwrite_input(self):
        with tempfile.TemporaryDirectory() as folder:
            src=Path(folder)/'source.json'
            src.write_text(json.dumps(self.raw),encoding='utf-8')
            before=src.read_bytes()
            with self.assertRaises(mod.ValidationError):
                mod.inspect(type('Args',(),{'input':src,'out':src}))
            self.assertEqual(src.read_bytes(),before)

    def test_build_rejects_output_or_preview_input_collisions(self):
        with tempfile.TemporaryDirectory() as folder:
            d=Path(folder);src=d/'input.json';src.write_text(json.dumps(self.raw),encoding='utf-8')
            decisions=d/'decisions.json';decisions.write_text(json.dumps({'breakAfterWordIds':['s3w2']}),encoding='utf-8')
            before_src=src.read_bytes();before_decisions=decisions.read_bytes()
            with self.assertRaises(mod.ValidationError):
                mod.build(type('Args',(),{'input':src,'boundaries':decisions,'output':decisions,'preview':None,'force':True}))
            with self.assertRaises(mod.ValidationError):
                mod.build(type('Args',(),{'input':src,'boundaries':decisions,'output':d/'out.script.json','preview':src,'force':True}))
            self.assertEqual(src.read_bytes(),before_src)
            self.assertEqual(decisions.read_bytes(),before_decisions)

    def test_edit_rejects_output_or_preview_collisions(self):
        with tempfile.TemporaryDirectory() as folder:
            d=Path(folder);src=d/'input.script.json'
            fixture=SOURCE.with_name('6 Minute English 01-seg1.script.json')
            src.write_bytes(fixture.read_bytes())
            decisions=d/'decisions.json';decisions.write_text(json.dumps({'breakAfterWordIds':['s10w38']}),encoding='utf-8')
            before_src=src.read_bytes();before_decisions=decisions.read_bytes()
            with self.assertRaises(mod.ValidationError):
                mod.edit(type('Args',(),{'input':src,'boundaries':decisions,'output':decisions,'preview':None,'force':True}))
            with self.assertRaises(mod.ValidationError):
                mod.edit(type('Args',(),{'input':src,'boundaries':decisions,'output':d/'out.script.json','preview':src,'force':True}))
            self.assertEqual(src.read_bytes(),before_src)
            self.assertEqual(decisions.read_bytes(),before_decisions)

    def test_validate_rejects_preview_that_would_overwrite_input_or_source(self):
        with tempfile.TemporaryDirectory() as folder:
            d=Path(folder)
            fixture=SOURCE.with_name('6 Minute English 01-seg1.script.json')
            subtitle=d/'input.script.json';subtitle.write_bytes(fixture.read_bytes())
            raw=d/'raw.json';raw.write_text(json.dumps(self.raw),encoding='utf-8')
            before_subtitle=subtitle.read_bytes();before_raw=raw.read_bytes()
            with self.assertRaises(mod.ValidationError):
                mod.validate(type('Args',(),{'input':subtitle,'source':raw,'preview':subtitle}))
            with self.assertRaises(mod.ValidationError):
                mod.validate(type('Args',(),{'input':subtitle,'source':raw,'preview':raw}))
            self.assertEqual(subtitle.read_bytes(),before_subtitle)
            self.assertEqual(raw.read_bytes(),before_raw)

if __name__=='__main__':unittest.main()
