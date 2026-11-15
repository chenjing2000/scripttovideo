using System.Diagnostics;
using System.IO;
using Microsoft.Web.WebView2.Core;

namespace ScriptToVideo;

/// <summary>
/// Serves only the currently selected media file over a dedicated WebView2 request
/// endpoint. Unlike dynamic folder mappings, this endpoint supports HTTP byte ranges
/// and cannot expose other files from the user's media directory.
/// </summary>
internal sealed class LocalMediaServer : IDisposable
{
    private const string MediaHost = "media.script-to-video.test";
    private const string Prefix = "https://" + MediaHost + "/media/";
    private const string AllowedOrigin = "https://reader.script-to-video.local";
    private readonly CoreWebView2 browser;
    private string? selectedPath;
    private string? selectedToken;
    private readonly Dictionary<string, string> tokenPaths = new(StringComparer.Ordinal);
    internal string? ActiveUrl => selectedToken is null || selectedPath is null ? null :
        Prefix + selectedToken + "/" + Uri.EscapeDataString(Path.GetFileName(selectedPath));

    internal LocalMediaServer(CoreWebView2 browser)
    {
        this.browser = browser;
        browser.AddWebResourceRequestedFilter(Prefix + "*", CoreWebView2WebResourceContext.All);
        browser.WebResourceRequested += Respond;
    }

    // Candidate tokens coexist with the active player token. A failed probe must
    // never revoke the previous media stream or expose the containing directory.
    internal string PrepareCandidate(string absoluteFilePath)
    {
        var path = Path.GetFullPath(absoluteFilePath);
        if (!File.Exists(path)) throw new FileNotFoundException("媒体文件不存在。", path);
        var token = Guid.NewGuid().ToString("N");
        tokenPaths.Add(token, path);
        return Prefix + token + "/" + Uri.EscapeDataString(Path.GetFileName(path));
    }

    internal void CommitCandidate(string url)
    {
        var token = TokenFromUrl(url);
        if (!tokenPaths.TryGetValue(token, out var path))
            throw new InvalidOperationException("媒体候选令牌已失效。");
        selectedToken = token;
        selectedPath = path;
    }

    internal void ReleaseCandidate(string url)
    {
        var token = TokenFromUrl(url);
        if (token == selectedToken) return; // The active stream is never revoked by cleanup.
        tokenPaths.Remove(token);
    }

    internal void ReleasePrevious(string? url)
    {
        if (url is null) return;
        var token = TokenFromUrl(url);
        if (token != selectedToken) tokenPaths.Remove(token);
    }

    internal string Select(string absoluteFilePath)
    {
        var url = PrepareCandidate(absoluteFilePath);
        CommitCandidate(url);
        return url;
    }

    private static string TokenFromUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            !url.StartsWith(Prefix, StringComparison.Ordinal) ||
            uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries) is not { Length: 3 } segments ||
            segments[0] != "media")
            throw new InvalidOperationException("非法媒体访问令牌。");
        return segments[1];
    }

    private void Respond(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
    {
        var request = e.Request;
        if (!Uri.TryCreate(request.Uri, UriKind.Absolute, out var uri) ||
            uri.Host != MediaHost || !uri.AbsolutePath.StartsWith("/media/", StringComparison.Ordinal)) return;

        FileStream? file = null;
        Stream? responseBody = null;
        try
        {
            var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length != 3 || segments[0] != "media" ||
                !tokenPaths.TryGetValue(segments[1], out var requestedPath) ||
                !string.Equals(Uri.UnescapeDataString(segments[2]), Path.GetFileName(requestedPath), StringComparison.Ordinal))
            {
                Reply(e, Stream.Null, 404, "Not Found", "Content-Length: 0");
                return;
            }
            if (request.Method == "OPTIONS")
            {
                Reply(e, Stream.Null, 204, "No Content", "Content-Length: 0\r\nAccess-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Allow-Headers: Range");
                return;
            }
            if (request.Method is not ("GET" or "HEAD"))
            {
                Reply(e, Stream.Null, 405, "Method Not Allowed", "Content-Length: 0\r\nAllow: GET, HEAD, OPTIONS");
                return;
            }

            file = new FileStream(requestedPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            var size = file.Length;
            var rangeHeader = request.Headers.Contains("Range") ? request.Headers.GetHeader("Range") : null;
            if (!MediaByteRanges.TryResolve(rangeHeader, size, out var start, out var end))
            {
                file.Dispose();
                file = null;
                Reply(e, Stream.Null, 416, "Range Not Satisfiable", $"Content-Range: bytes */{size}\r\nContent-Length: 0");
                return;
            }
            var partial = rangeHeader != null;
            var length = size == 0 ? 0 : end - start + 1;
            var mime = Path.GetExtension(requestedPath).ToLowerInvariant() switch
            {
                ".mp4" => "video/mp4", ".mkv" => "video/x-matroska",
                ".m4a" => "audio/mp4", ".mp3" => "audio/mpeg", ".wav" => "audio/wav", _ => "application/octet-stream"
            };
            var headers = $"Content-Type: {mime}\r\nAccept-Ranges: bytes\r\nContent-Length: {length}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff";
            if (partial) headers += $"\r\nContent-Range: bytes {start}-{end}/{size}";
            if (request.Method == "HEAD" || length == 0)
            {
                file.Dispose();
                file = null;
                responseBody = Stream.Null;
            }
            else
            {
                file.Position = start;
                responseBody = new LimitedReadStream(file, start, length);
                file = null; // LimitedReadStream now owns the file handle.
            }
            Reply(e, responseBody ?? Stream.Null, partial ? 206 : 200, partial ? "Partial Content" : "OK", headers);
            responseBody = null; // Ownership transferred to WebView2.
            Trace.WriteLine($"ScriptToVideo media: {request.Method} {(partial ? "206" : "200")} {Path.GetFileName(requestedPath)} range={rangeHeader ?? "all"}");
        }
        catch (Exception error)
        {
            responseBody?.Dispose();
            file?.Dispose();
            Trace.WriteLine("ScriptToVideo media read failed: " + error);
            Reply(e, Stream.Null, 500, "Media Read Error", "Content-Length: 0");
        }
    }

    private void Reply(CoreWebView2WebResourceRequestedEventArgs request, Stream body, int status, string reason, string headers)
    {
        headers += "\r\nAccess-Control-Allow-Origin: " + AllowedOrigin + "\r\nCross-Origin-Resource-Policy: cross-origin";
        request.Response = browser.Environment.CreateWebResourceResponse(body, status, reason, headers);
    }

    private sealed class LimitedReadStream : Stream
    {
        private readonly FileStream file;
        private readonly long start;
        private readonly long count;
        private long position;

        internal LimitedReadStream(FileStream file, long start, long count)
        { this.file = file; this.start = start; this.count = count; }
        public override bool CanRead => true;
        public override bool CanSeek => true;
        public override bool CanWrite => false;
        public override long Length => count;
        public override long Position
        {
            get => position;
            set => Seek(value, SeekOrigin.Begin);
        }
        public override int Read(byte[] buffer, int offset, int length)
        {
            var n = file.Read(buffer, offset, (int)Math.Min(length, count - position));
            position += n;
            return n;
        }
        public override int Read(Span<byte> buffer)
        {
            var n = file.Read(buffer[..(int)Math.Min(buffer.Length, count - position)]);
            position += n;
            return n;
        }
        public override long Seek(long offset, SeekOrigin origin)
        {
            var candidate = origin switch
            {
                SeekOrigin.Begin => offset,
                SeekOrigin.Current => checked(position + offset),
                SeekOrigin.End => checked(count + offset),
                _ => throw new ArgumentOutOfRangeException(nameof(origin))
            };
            if (candidate < 0 || candidate > count) throw new IOException("Seek outside media response range.");
            file.Seek(checked(start + candidate), SeekOrigin.Begin);
            position = candidate;
            return position;
        }
        public override void Flush() { }
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        protected override void Dispose(bool disposing)
        { if (disposing) file.Dispose(); base.Dispose(disposing); }
    }
    public void Dispose()
    {
        browser.WebResourceRequested -= Respond;
        selectedPath = null;
        selectedToken = null;
        tokenPaths.Clear();
    }

}
