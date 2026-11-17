import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const host = readFileSync('desktop/ReaderWindow.cs', 'utf8');
const single = readFileSync('desktop/AppLifecycle/SingleInstanceManager.cs', 'utf8');
const tray = readFileSync('desktop/AppLifecycle/TrayIconManager.cs', 'utf8');
const project = readFileSync('desktop/ScriptToVideo.csproj', 'utf8');

test('M6.14: application acquires single-instance ownership before creating the WPF window', () => {
  assert.match(host, /new SingleInstanceManager\(\)/);
  assert.match(host, /TryBecomePrimaryOrActivate\(\)/);
  assert.ok(host.indexOf('TryBecomePrimaryOrActivate()') < host.indexOf('new ReaderWindow()'));
  assert.match(single, /Mutex\(/);
  assert.match(single, /NamedPipeClientStream/);
  assert.match(single, /NamedPipeServerStream/);
});

test('M6.14: secondary launch forwards activation and does not create another window', () => {
  assert.match(single, /WriteLine\("ACTIVATE"\)/);
  assert.match(host, /StartListening\(/);
  assert.match(host, /ActivateFromTray/);
});

test('M6.22: minimizing keeps a taskbar entry and retains WebView2 until closing', () => {
  const state = host.slice(host.indexOf('StateChanged += '), host.indexOf('Closing += OnClosing'));
  assert.match(state, /WindowState == WindowState\.Minimized/);
  assert.doesNotMatch(state, /ShowInTaskbar\s*=\s*false|Hide\(\)|WindowState\s*=\s*WindowState\.Normal/);
  assert.match(host, /DisposeSafely\("WebView2", view\.Dispose\)/);
  assert.match(host, /Closed \+=/);
});

test('M6.14 current tray retains the WPF menu while NotifyIcon owns the tray icon', () => {
  assert.match(tray, /Forms\.NotifyIcon/);
  assert.match(tray, /CreateItem\("打开"/);
  assert.match(tray, /CreateItem\("退出"/);
  assert.match(tray, /#FFFBC7/);
  assert.match(project, /<UseWindowsForms>true<\/UseWindowsForms>/);
});
