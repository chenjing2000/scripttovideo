using System.IO;

namespace ScriptToVideo.Export;

/// <summary>
/// Commits a validated MP4 without replacing an existing output.
/// Uses the lowest free suffix, then relies on File.Move's no-overwrite behavior
/// to protect against another process creating the name after the check.
/// </summary>
internal static class UniqueOutputCommit
{
    internal static string Commit(string temporaryPath, string defaultOutputPath)
    {
        var directory = Path.GetDirectoryName(defaultOutputPath)
            ?? throw new ArgumentException("输出路径缺少目录。", nameof(defaultOutputPath));
        var filename = Path.GetFileNameWithoutExtension(defaultOutputPath);
        var extension = Path.GetExtension(defaultOutputPath);
        if (string.IsNullOrEmpty(filename) || !extension.Equals(".mp4", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("输出文件必须是 .mp4 格式。", nameof(defaultOutputPath));

        for (var number = 0; ; number = checked(number + 1))
        {
            var name = number == 0 ? filename + extension : $"{filename} ({number}){extension}";
            var candidate = Path.Combine(directory, name);

            // This is a hint only; the move itself must still refuse replacement.
            if (File.Exists(candidate))
                continue;

            try
            {
                File.Move(temporaryPath, candidate);
                return candidate;
            }
            catch (IOException error) when (IsExistingFileCollision(error, candidate))
            {
                // Another process took this filename after File.Exists.
            }
        }
    }

    private static bool IsExistingFileCollision(IOException error, string candidate)
    {
        // Windows: ERROR_FILE_EXISTS (80) or ERROR_ALREADY_EXISTS (183).
        // Only retry confirmed destination-name collisions, never general I/O errors.
        var code = error.HResult & 0xFFFF;
        return (code is 80 or 183) && File.Exists(candidate);
    }
}
