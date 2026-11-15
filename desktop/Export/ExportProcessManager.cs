using System.Diagnostics;
using System.IO;
using System.Text;

namespace ScriptToVideo.Export;

internal sealed class ExportProcessManager
{
    public async Task<(int ExitCode, string Stdout, string Stderr)> RunAsync(
        ProcessStartInfo start, CancellationToken cancellationToken,
        Action<string>? onOutput = null)
    {
        using var process = Process.Start(start) ?? throw new InvalidOperationException("无法启动导出进程。");
        var stdout = new StringBuilder();

        async Task ReadOutputAsync()
        {
            while (await process.StandardOutput.ReadLineAsync() is { } line)
            {
                stdout.AppendLine(line);
                onOutput?.Invoke(line);
            }
        }

        var outputTask = ReadOutputAsync();
        var errorTask = process.StandardError.ReadToEndAsync();

        try
        {
            await process.WaitForExitAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            try { if (!process.HasExited) process.Kill(entireProcessTree: true); }
            catch (InvalidOperationException) { }
            catch (System.ComponentModel.Win32Exception error)
            {
                Trace.WriteLine($"Failed to terminate export process tree: {error}");
            }

            // Descendants may keep redirected pipes open after the parent exits.
            // Cancellation must not wait forever for process or stream cleanup.
            try
            {
                await Task.WhenAll(process.WaitForExitAsync(), outputTask, errorTask)
                    .WaitAsync(TimeSpan.FromSeconds(10));
            }
            catch (TimeoutException error)
            {
                Trace.WriteLine($"Export process cleanup timed out: {error}");
            }
            catch (IOException error)
            {
                Trace.WriteLine($"Export process output cleanup failed: {error}");
            }
            throw;
        }

        await Task.WhenAll(outputTask, errorTask);
        return (process.ExitCode, stdout.ToString(), await errorTask);
    }
}
