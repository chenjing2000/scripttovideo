using System;
using System.IO;
using System.Text.Json;
using ScriptToVideo;

internal static class Program
{
    private const string Old = "{\"title\":\"old\"}";
    private const string New = "{\"title\":\"new\"}";

    private static int Main()
    {
        var tests = new (string Name, Action<string> Run)[]
        {
            ("plain old-name rename", PlainRename),
            ("interrupted two-file save is rolled forward", RecoverPair),
            ("interrupted three-file save is rolled forward", RecoverProject),
            ("unexpected external edit preserves legacy data", ConflictKeepsData),
            ("both filenames prevent overwrite", BothNamesConflict),
            ("orphan journal prevents silent import", OrphanJournal),
            ("ambiguous dual journals prevent migration", DualJournals)
        };
        var passed = 0;
        foreach (var (name, run) in tests)
        {
            var root = Path.Combine(Path.GetTempPath(), "ScriptToVideo.RecoveryTests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            try { run(root); Console.WriteLine("PASS " + name); passed++; }
            catch (Exception error) { Console.Error.WriteLine("FAIL " + name + ": " + error); }
            finally { try { Directory.Delete(root, recursive: true); } catch { /* test cleanup only */ } }
        }
        Console.WriteLine($"{passed}/{tests.Length} storage recovery scenarios passed");
        return passed == tests.Length ? 0 : 1;
    }

    private static (RefinedStorage.Paths Paths, string OldPath, string Project) Setup(string root)
    {
        var paths = RefinedStorage.Resolve(Path.Combine(root, "lesson.script.json"));
        Directory.CreateDirectory(paths.Folder);
        return (paths, Path.Combine(paths.Folder, "lesson.script.refined.json"),
            Path.Combine(paths.Folder, "lesson.project.json"));
    }
    private static void Equal(string actual, string expected)
    {
        if (!string.Equals(actual, expected, StringComparison.Ordinal))
            throw new Exception($"Expected {expected}, got {actual}");
    }
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }
    private static void Throws(Action action)
    {
        try { action(); }
        catch (IOException) { return; }
        throw new Exception("Expected guarded IOException");
    }
    private static void PlainRename(string root)
    {
        var (paths, oldPath, project) = Setup(root);
        File.WriteAllText(oldPath, Old);
        RefinedStorage.MigrateLegacyFilename(paths, project);
        Equal(File.ReadAllText(paths.Refined), Old);
        Check(!File.Exists(oldPath), "Old name remains");
    }
    private static void RecoverPair(string root)
    {
        var (paths, oldPath, project) = Setup(root);
        File.WriteAllText(oldPath, Old);
        File.WriteAllText(paths.Text, "new-text");
        File.WriteAllText(oldPath + ".save-journal", JsonSerializer.Serialize(new
        {
            OldRefined=Old, NewRefined=New, OldText="old-text", NewText="new-text"
        }));
        RefinedStorage.MigrateLegacyFilename(paths, project);
        Equal(File.ReadAllText(paths.Refined), New);
        Equal(File.ReadAllText(paths.Text), "new-text");
        Check(!File.Exists(oldPath + ".save-journal"), "Pair journal not retired");
    }
    private static void RecoverProject(string root)
    {
        var (paths, oldPath, project) = Setup(root);
        File.WriteAllText(oldPath, New); // subtitle replacement had completed before process loss
        File.WriteAllText(paths.Text, "old-text");
        File.WriteAllText(project, "old-project");
        File.WriteAllText(oldPath + ".project-save-journal", JsonSerializer.Serialize(new
        {
            ProjectPath=Path.GetFullPath(project), OldRefined=Old, NewRefined=New,
            OldText="old-text", NewText="new-text",
            OldProject="old-project", NewProject="new-project"
        }));
        RefinedStorage.MigrateLegacyFilename(paths, project);
        Equal(File.ReadAllText(paths.Refined), New);
        Equal(File.ReadAllText(paths.Text), "new-text");
        Equal(File.ReadAllText(project), "new-project");
        Check(!File.Exists(oldPath + ".project-save-journal"), "Project journal not retired");
    }
    private static void ConflictKeepsData(string root)
    {
        var (paths, oldPath, project) = Setup(root);
        File.WriteAllText(oldPath, Old);
        File.WriteAllText(paths.Text, "outside-edit");
        File.WriteAllText(oldPath + ".save-journal", JsonSerializer.Serialize(new
        {
            OldRefined=Old, NewRefined=New, OldText="old-text", NewText="new-text"
        }));
        Throws(() => RefinedStorage.MigrateLegacyFilename(paths, project));
        Equal(File.ReadAllText(oldPath), Old);
        Equal(File.ReadAllText(paths.Text), "outside-edit");
        Check(!File.Exists(paths.Refined), "Conflicted file was migrated");
        Check(File.Exists(oldPath + ".save-journal"), "Conflict journal was deleted");
    }
    private static void BothNamesConflict(string root)
    {
        var (paths, oldPath, project) = Setup(root);
        File.WriteAllText(oldPath, Old);
        File.WriteAllText(paths.Refined, New);
        Throws(() => RefinedStorage.MigrateLegacyFilename(paths, project));
        Equal(File.ReadAllText(oldPath), Old);
        Equal(File.ReadAllText(paths.Refined), New);
    }
    private static void OrphanJournal(string root)
    {
        var (paths, oldPath, project) = Setup(root);
        File.WriteAllText(oldPath + ".save-journal", "pending");
        Throws(() => RefinedStorage.MigrateLegacyFilename(paths, project));
        Check(File.Exists(oldPath + ".save-journal"), "Orphan journal was deleted");
    }
    private static void DualJournals(string root)
    {
        var (paths, oldPath, project) = Setup(root);
        File.WriteAllText(oldPath, Old);
        File.WriteAllText(oldPath + ".save-journal", "pending");
        File.WriteAllText(oldPath + ".project-save-journal", "pending");
        Throws(() => RefinedStorage.MigrateLegacyFilename(paths, project));
        Equal(File.ReadAllText(oldPath), Old);
        Check(File.Exists(oldPath + ".save-journal"), "Pair journal was deleted");
        Check(File.Exists(oldPath + ".project-save-journal"), "Project journal was deleted");
    }
}
