import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as settings from '../.tmp-core/app-settings.js';

const read = path => readFileSync(path, 'utf8');
const host = read('desktop/ReaderWindow.cs');
const appSettings = read('src/core/app-settings.ts');

const closing = host.slice(
  host.indexOf('private async void OnClosing'),
  host.indexOf('private bool ConfirmDiscardUnsavedChanges')
);

const activation = host.slice(
  host.indexOf('private void RestoreAfterCancelledClose'),
  host.indexOf('private bool ConfirmDiscardUnsavedChanges')
);

test('M6.15.8: every user-cancelled close path schedules restoration of a previously visible main window', () => {
  assert.equal((closing.match(/RestoreAfterCancelledClose\(wasVisible\)/g) ?? []).length, 3);
  assert.match(closing, /var wasVisible = IsVisible;/);
  assert.match(closing, /Close cancelled; export continues\.[\s\S]*?RestoreAfterCancelledClose\(wasVisible\);/);
  assert.match(closing, /Close cancelled; unsaved project changes are retained and export continues\.[\s\S]*?RestoreAfterCancelledClose\(wasVisible\);/);
  assert.match(closing, /Close cancelled; unsaved project changes are retained\.[\s\S]*?RestoreAfterCancelledClose\(wasVisible\);/);
});

test('M6.15.8: delayed restoration never shows a window that was hidden in the tray', () => {
  assert.match(activation, /if \(!wasVisible\s*\|\| Dispatcher\.HasShutdownStarted\s*\|\| Dispatcher\.HasShutdownFinished\)\s*return;/);
  assert.match(activation, /Dispatcher\.BeginInvoke\(DispatcherPriority\.Normal/);
  assert.match(activation, /if \(isShuttingDown\s*\|\|\s*!IsVisible\)\s*return;/);
  assert.match(activation, /ActivateFromTray\(\)/);
  assert.match(activation, /AppLog\.WriteException\("Window\.RestoreAfterCancelledClose"/);
});

test('M6.15.8: global settings use the ScriptToVideo filename and format marker', () => {
  assert.equal(settings.SETTINGS_FILENAME, 'scripttovideo.settings.json');
  assert.equal(settings.DEFAULT_SETTINGS.format, 'scripttovideo-settings');
  assert.equal(settings.validateSettings(settings.DEFAULT_SETTINGS), true);
  assert.equal(settings.validateSettings({ ...settings.DEFAULT_SETTINGS, format: 'voicetranscript-settings' }), false);
  assert.match(appSettings, /format:SETTINGS_FORMAT/);
  assert.match(appSettings, /SETTINGS_FILENAME = 'scripttovideo\.settings\.json'/);
});

test('M6.16: settings use only ScriptToVideo filename and marker', () => {
  assert.ok(host.includes('SettingsFileName = "scripttovideo.settings.json"'));
  assert.match(host, /SettingsFormat = "scripttovideo-settings"/);
  assert.match(host, /format = SettingsFormat, schemaVersion = 1/);
  assert.doesNotMatch(host, /LegacySettingsFileName|LegacySettingsFormat|TryMigrateLegacySettings/);
  assert.ok(host.includes('return CreateDefaultSettings();'));
});
