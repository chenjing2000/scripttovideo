using ScriptToVideo.Export;
using System.Text;

// Self-contained filesystem regression tests: no NuGet test packages required.
// Run: dotnet run --project tests/UniqueOutputCommit.Tests/UniqueOutputCommit.Tests.csproj -c Release
var passed = 0;

Run("first output uses the unnumbered filename", dir =>
{
    var output = Path.Combine(dir, "lesson.exported.mp4");
    var temp = Temp(dir, "first");
    var actual = UniqueOutputCommit.Commit(temp, output);
    Equal(output, actual);
    Equal("first", File.ReadAllText(output));
    NotExists(temp);
});

Run("existing base yields (1), then (2)", dir =>
{
    var output = Path.Combine(dir, "lesson.exported.mp4");
    File.WriteAllText(output, "original");
    var first = UniqueOutputCommit.Commit(Temp(dir, "first"), output);
    var second = UniqueOutputCommit.Commit(Temp(dir, "second"), output);
    Equal(Path.Combine(dir, "lesson.exported (1).mp4"), first);
    Equal(Path.Combine(dir, "lesson.exported (2).mp4"), second);
    Equal("original", File.ReadAllText(output));
    Equal("first", File.ReadAllText(first));
    Equal("second", File.ReadAllText(second));
});

Run("missing suffix is reused before larger numbers", dir =>
{
    var output = Path.Combine(dir, "lesson.exported.mp4");
    File.WriteAllText(output, "base");
    File.WriteAllText(Path.Combine(dir, "lesson.exported (1).mp4"), "one");
    File.WriteAllText(Path.Combine(dir, "lesson.exported (3).mp4"), "three");
    var actual = UniqueOutputCommit.Commit(Temp(dir, "two"), output);
    Equal(Path.Combine(dir, "lesson.exported (2).mp4"), actual);
    Equal("one", File.ReadAllText(Path.Combine(dir, "lesson.exported (1).mp4")));
    Equal("three", File.ReadAllText(Path.Combine(dir, "lesson.exported (3).mp4")));
});

Run("a removed base takes priority over numbered copies", dir =>
{
    var output = Path.Combine(dir, "lesson.exported.mp4");
    File.WriteAllText(Path.Combine(dir, "lesson.exported (1).mp4"), "old");
    Equal(output, UniqueOutputCommit.Commit(Temp(dir, "new"), output));
    Equal("old", File.ReadAllText(Path.Combine(dir, "lesson.exported (1).mp4")));
});

Run("a removed (1) is reused", dir =>
{
    var output = Path.Combine(dir, "lesson.exported.mp4");
    File.WriteAllText(output, "base");
    File.WriteAllText(Path.Combine(dir, "lesson.exported (2).mp4"), "two");
    Equal(Path.Combine(dir, "lesson.exported (1).mp4"),
        UniqueOutputCommit.Commit(Temp(dir, "one"), output));
});

Run("two simultaneous commits cannot overwrite each other", dir =>
{
    var output = Path.Combine(dir, "lesson.exported.mp4");
    File.WriteAllText(output, "base");
    var a = Temp(dir, "alpha");
    var b = Temp(dir, "beta");
    using var gate = new ManualResetEventSlim(false);
    var first = Task.Run(() => { gate.Wait(); return UniqueOutputCommit.Commit(a, output); });
    var second = Task.Run(() => { gate.Wait(); return UniqueOutputCommit.Commit(b, output); });
    gate.Set();
    Task.WaitAll(first, second);
    Check(first.Result != second.Result, "Concurrent commits chose the same destination");
    var saved = new[] { File.ReadAllText(first.Result), File.ReadAllText(second.Result) };
    Check(saved.Contains("alpha") && saved.Contains("beta"), "Concurrent output data was lost");
    Equal("base", File.ReadAllText(output));
});

Run("a destination directory is not treated as a filename conflict", dir =>
{
    var output = Path.Combine(dir, "lesson.exported.mp4");
    Directory.CreateDirectory(output);
    var temp = Temp(dir, "recoverable");
    ThrowsFileSystemFailure(() => UniqueOutputCommit.Commit(temp, output));
    Equal("recoverable", File.ReadAllText(temp));
    Check(Directory.Exists(output), "Existing directory was altered");
});

Run("a missing temporary output is an error, not an index retry", dir =>
{
    var output = Path.Combine(dir, "lesson.exported.mp4");
    File.WriteAllText(output, "base");
    Throws<IOException>(() => UniqueOutputCommit.Commit(Path.Combine(dir, "missing.tmp"), output));
    Equal("base", File.ReadAllText(output));
    NotExists(Path.Combine(dir, "lesson.exported (1).mp4"));
});

Run("all media extensions share the same non-overwrite numbering rule", dir =>
{
    foreach (var ext in new[] { ".mp4", ".mkv", ".mp3", ".wav", ".m4a" })
    {
        var output = Path.Combine(dir, "lesson.exported" + ext);
        File.WriteAllText(output, "original");
        var next = UniqueOutputCommit.Commit(Temp(dir, "new"), output);
        Equal(Path.Combine(dir, "lesson.exported (1)" + ext), next);
        Equal("original", File.ReadAllText(output));
        Equal("new", File.ReadAllText(next));
    }
});
Run("missing output extension is rejected without losing temporary data", dir =>
{
    var temp = Temp(dir, "recoverable");
    Throws<ArgumentException>(() => UniqueOutputCommit.Commit(temp, Path.Combine(dir, "article")));
    Equal("recoverable", File.ReadAllText(temp));
});

Console.WriteLine($"PASS: {passed} filesystem tests");

void Run(string name, Action<string> action)
{
    var dir = Path.Combine(Path.GetTempPath(), "scripttovideo-m621-" + Guid.NewGuid().ToString("N"));
    Directory.CreateDirectory(dir);
    try
    {
        action(dir);
        passed++;
        Console.WriteLine("PASS: " + name);
    }
    finally
    {
        Directory.Delete(dir, recursive: true);
    }
}

static string Temp(string dir, string value)
{
    var path = Path.Combine(dir, Guid.NewGuid().ToString("N") + ".mp4.tmp");
    File.WriteAllText(path, value, Encoding.UTF8);
    return path;
}

static void Equal(string expected, string actual)
{
    if (!string.Equals(expected, actual, StringComparison.Ordinal))
        throw new Exception($"Expected '{expected}', got '{actual}'");
}

static void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
}

static void NotExists(string path) => Check(!File.Exists(path), $"Unexpected file: {path}");

static void Throws<T>(Action action) where T : Exception
{
    try { action(); }
    catch (T) { return; }
    throw new Exception($"Expected {typeof(T).Name}");
}

static void ThrowsFileSystemFailure(Action action)
{
    try { action(); }
    catch (IOException) { return; }
    catch (UnauthorizedAccessException) { return; }
    throw new Exception("Expected an I/O or permission failure");
}
