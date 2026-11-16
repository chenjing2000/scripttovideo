import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const host=readFileSync('desktop/ReaderWindow.cs','utf8');

test('M6.22: minimize retains native WPF taskbar entry without hiding the window',()=>{
 const start=host.indexOf('StateChanged += (_, _) =>');
 const end=host.indexOf('Closing += OnClosing;',start);
 assert.ok(start>0&&end>start);
 const handler=host.slice(start,end);
 assert.match(handler,/WindowState == WindowState.Minimized/);
 assert.doesNotMatch(handler,/Hide\(\)/);
 assert.doesNotMatch(handler,/ShowInTaskbar\s*=\s*false/);
 assert.doesNotMatch(handler,/WindowState\s*=\s*WindowState.Normal/);
});

test('M6.22: tray restore and closing protection remain available',()=>{
 assert.match(host,/trayIcon = new TrayIconManager\(this, ActivateFromTray, Close\)/);
 assert.match(host,/internal void ActivateFromTray\(\)/);
 assert.match(host,/ShowInTaskbar = true/);
 assert.match(host,/Closing \+= OnClosing;/);
 assert.match(host,/private async void OnClosing\(/);
});
