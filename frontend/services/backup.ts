import type { ButtonsSettings } from '../types';
import { normalizeSettings } from './settings';

function GetSettingsBackupFileName() {
	const now = new Date();
	const pad = (value: number) => value.toString().padStart(2, '0');

	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

	return `Custom Buttons settings backup ${date} ${time}.json`;
}

// The file is saved through the settings window, where Steam shows its save dialog.
export function ExportSettingsToFile(settings: ButtonsSettings, settings_document: Document) {
	try {
		const settings_window = (settings_document.defaultView ?? window) as typeof window;

		const file_content = JSON.stringify({ plugin: 'Custom Buttons', exported_at: new Date().toISOString(), settings }, null, 4);
		const blob = new settings_window.Blob([file_content], { type: 'application/json' });
		const url = settings_window.URL.createObjectURL(blob);

		const link = settings_document.createElement('a');
		link.href = url;
		link.download = GetSettingsBackupFileName();
		link.style.display = 'none';

		settings_document.body.appendChild(link);
		link.click();
		link.remove();

		setTimeout(() => settings_window.URL.revokeObjectURL(url), 10000);
	} catch (error) {
		console.error('[Custom-buttons] failed to export settings', error);
	}
}

// Resolves with undefined when no file was picked or the file is not a settings file.
export function ImportSettingsFromFile(settings_document: Document): Promise<ButtonsSettings | undefined> {
	return new Promise((resolve) => {
		const input = settings_document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json,.json';
		input.style.display = 'none';

		input.addEventListener('change', async () => {
			try {
				const file = input.files?.[0];
				resolve(file ? normalizeSettings(JSON.parse(await file.text())) : undefined);
			} catch (error) {
				console.error('[Custom-buttons] failed to import settings', error);
				resolve(undefined);
			} finally {
				input.remove();
			}
		});

		settings_document.body.appendChild(input);
		input.click();
	});
}
