using System;
using System.IO;
using System.Text.Json;
using ScriptToVideo;

internal static class Program
{
    private const string Old = "{\"title\":\"old\"}";
    private const string New = "{\"title\":\"new\"}";
    private const string OldProject = "{\"schemaVersion\":3,\"title\":\"old\"}";
    private const string NewProject = "{\"schemaVersion\":3,\"title\":\"new\"}";

    private static int Main()
    {
        var tests = new (string Name, Action<string> Run)[]
        {
            ("first creation and current three-file save", CurrentBundleSave),
            ("interrupted current three-file save rolls forward", RecoverCurrentBundle),
            ("external edit blocks recovery and retains journal", ConflictKeepsData),
            ("orphaned journal blocks new writes", PendingJournalBlocksSave),
            ("unexpected preexisting project is not overwritten", ExistingProjectBlocksCreate)
        };
        int passed = 0;
        foreach (var (name, test) in tests)
        {
            var root = Path.Combine(Path.GetTempPath(), "ScriptToVideo.RecoveryTests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            try { test(root); Console.WriteLine("PASS " + name); passed++; }
            catch (Exception error) { Console.Error.WriteLine("FAIL " + name + ": " + error); }
            finally { try { Directory.Delete(root, recursive: true); } catch { } }
        }
        Console.WriteLine($"{passed}/{tests.Length} current-format storage scenarios passed");
        return passed == tests.Length ? 0 : 1;
    }

    private static (RefinedStorage.Paths Paths, string Project) Setup(string root)
    {
        var paths = RefinedStorage.Resolve(Path.Combine(root, "lesson.script.json"));
        RefinedStorage.CreateInitial(paths, Old, "old-text");
        return (paths, Path.Combine(paths.Folder, "lesson.project.json"));
    }
    private static void Equal(string actual, string expected)
    {
        if (!string.Equals(actual, expected, StringComparison.Ordinal))
            throw new Exception($"Expected {expected}, got {actual}");
    }
    private static void Check(bool value, string message)
    {
        if (!value) throw new Exception(message);
    }
    private static void Throws(Action action)
    {
        try { action(); }
        catch (IOException) { return; }
        throw new Exception("Expected guarded IOException");
    }

    private static void CurrentBundleSave(string root)
    {
        var (paths, project) = Setup(root);
        RefinedStorage.ReplaceProjectBundle(paths, project, Old, New, "old-text", "new-text", null, NewProject);
        Equal(File.ReadAllText(paths.Refined), New);
        Equal(File.ReadAllText(paths.Text), "new-text");
        Equal(File.ReadAllText(project), NewProject);
        Check(!File.Exists(paths.Refined + ".project-save-journal"), "Journal was not removed");
    }

    private static void RecoverCurrentBundle(string root)
    {
        var (paths, project) = Setup(root);
        File.WriteAllText(project, OldProject);
        // The process crashed after updating revise, before updating TXT and project.
        File.WriteAllText(paths.Refined, New);
        File.WriteAllText(paths.Refined + ".project-save-journal", JsonSerializer.Serialize(new
        {
            ProjectPath=Path.GetFullPath(project), OldRefined=Old, NewRefined=New,
            OldText="old-text", NewText="new-text",
            OldProject, NewProject
        }));
        RefinedStorage.RecoverPendingProjectSave(paths, project);
        Equal(File.ReadAllText(paths.Refined), New);
        Equal(File.ReadAllText(paths.Text), "new-text");
        Equal(File.ReadAllText(project), NewProject);
        Check(!File.Exists(paths.Refined + ".project-save-journal"), "Pending journal retained after recovery");
    }

    private static void ConflictKeepsData(string root)
    {
        var (paths, project) = Setup(root);
        File.WriteAllText(project, OldProject);
        File.WriteAllText(paths.Text, "external-edit");
        var journal = paths.Refined + ".project-save-journal";
        File.WriteAllText(journal, JsonSerializer.Serialize(new
        {
            ProjectPath=Path.GetFullPath(project), OldRefined=Old, NewRefined=New,
            OldText="old-text", NewText="new-text",
            OldProject, NewProject
        }));
        Throws(() => RefinedStorage.RecoverPendingProjectSave(paths, project));
        Equal(File.ReadAllText(paths.Refined), Old);
        Equal(File.ReadAllText(paths.Text), "external-edit");
        Equal(File.ReadAllText(project), OldProject);
        Check(File.Exists(journal), "Conflicted journal was unexpectedly deleted");
    }

    private static void PendingJournalBlocksSave(string root)
    {
        var (paths, project) = Setup(root);
        File.WriteAllText(paths.Refined + ".project-save-journal", "pending");
        Throws(() => RefinedStorage.ReplaceProjectBundle(paths, project, Old, New,
            "old-text", "new-text", null, NewProject));
        Equal(File.ReadAllText(paths.Refined), Old);
        Equal(File.ReadAllText(paths.Text), "old-text");
    }

    private static void ExistingProjectBlocksCreate(string root)
    {
        var (paths, project) = Setup(root);
        File.WriteAllText(project, "obsolete-version");
        Throws(() => RefinedStorage.ReplaceProjectBundle(paths, project, Old, New,
            "old-text", "new-text", null, NewProject));
        Equal(File.ReadAllText(project), "obsolete-version");
        Equal(File.ReadAllText(paths.Refined), Old);
    }
}
