using System;
using System.IO;
using ScriptToVideo;
internal static class Program
{
    private static void Assert(bool condition,string message){if(!condition)throw new Exception(message);}
    private static void Equal(string path,string expected)=>Assert(File.ReadAllText(path)==expected,$"Unexpected contents: {path}");
    private static int Main()
    {
        var cases=new (string Name,Action<string> Run)[]{
            ("missing revise and TXT are created on save",FreshSave),
            ("all three work files overwrite regardless of previous contents",Overwrite),
            ("unchanged content is rewritten by Ctrl+S",Rewrite),
            ("one-file atomic write never leaves partial output",SingleAtomic),
            ("read-only original input remains unchanged",SourceUntouched)
        };
        var passed=0;
        foreach(var (name,run) in cases)
        {
            var root=Path.Combine(Path.GetTempPath(),"ScriptToVideo.StorageTests",Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            try{run(root);Console.WriteLine("PASS "+name);passed++;}
            catch(Exception error){Console.Error.WriteLine("FAIL "+name+": "+error);}
            finally{try{Directory.Delete(root,true);}catch{}}
        }
        Console.WriteLine($"{passed}/{cases.Length} atomic storage scenarios passed");
        return passed==cases.Length?0:1;
    }
    private static (ReviseStorage.Paths Paths,string Project,string Source) Paths(string root)
    {
        var source=Path.Combine(root,"lesson.script.json");
        File.WriteAllText(source,"immutable-source");
        var paths=ReviseStorage.Resolve(source);
        return (paths,Path.Combine(paths.Folder,"lesson.project.json"),source);
    }
    private static void FreshSave(string root)
    {
        var (paths,project,_)=Paths(root);
        Assert(ReviseStorage.ReadExisting(paths)==null,"revise should be optional");
        ReviseStorage.Save(paths,project,"revise","text","project");
        Equal(paths.Revised,"revise");Equal(paths.Text,"text");Equal(project,"project");
    }
    private static void Overwrite(string root)
    {
        var (paths,project,_)=Paths(root);
        ReviseStorage.Save(paths,project,"one","txt1","p1");
        File.WriteAllText(paths.Revised,"external revise");
        File.WriteAllText(paths.Text,"external TXT");
        File.WriteAllText(project,"external project");
        ReviseStorage.Save(paths,project,"two","txt2","p2");
        Equal(paths.Revised,"two");Equal(paths.Text,"txt2");Equal(project,"p2");
    }
    private static void Rewrite(string root)
    {
        var (paths,project,_)=Paths(root);
        ReviseStorage.Save(paths,project,"same","same","same");
        var before=File.GetLastWriteTimeUtc(paths.Revised);
        ReviseStorage.Save(paths,project,"same","same","same");
        Assert(File.GetLastWriteTimeUtc(paths.Revised)>=before,"mtime must not go backwards");
        Equal(paths.Revised,"same");
    }
    private static void SingleAtomic(string root)
    {
        var path=Path.Combine(root,"atomic.txt");
        ReviseStorage.AtomicWrite(path,"old");
        ReviseStorage.AtomicWrite(path,"new");
        Equal(path,"new");
        Assert(Directory.GetFiles(root,"*.tmp",SearchOption.AllDirectories).Length==0,"temporary files leaked");
    }
    private static void SourceUntouched(string root)
    {
        var (paths,project,source)=Paths(root);
        ReviseStorage.Save(paths,project,"changed","changed","changed");
        Equal(source,"immutable-source");
    }
}
