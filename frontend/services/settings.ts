import { useSyncExternalStore } from 'react';
import type { AppPageButton, ButtonsSettings, DropDownMenu, Flag, MenuButton, StoreButton, TopButton } from '../types';

const STORAGE_KEY = 'Custom-buttons-settings';

const ICONS_URL = 'https://raw.githubusercontent.com/diemonic1/Custom-buttons/refs/heads/main/PUBLIC_ICONS/';

export const createDefaultTopButton = (): TopButton => ({
	enabled: 'true',
	name: 'Steam',
	show_name: 'true',
	icon: ICONS_URL + 'steam.png',
	show_icon: 'true',
	path_to_app: 'https://store.steampowered.com/',
});

export const createDefaultMenuButton = (): MenuButton => ({
	enabled: 'true',
	name: 'SteamGridDB',
	format_game_name: 'true',
	add_arrow_icon: 'true',
	path_to_app: 'https://www.steamgriddb.com/search/grids?term=%GAME_NAME%',
});

export const createDefaultStoreButton = (): StoreButton => ({
	enabled: 'true',
	name: 'Steam Sales',
	add_arrow_icon: 'true',
	path_to_app: 'https://steamdb.info/sales/history/',
});

export const createDefaultAppPageButton = (): AppPageButton => ({
	enabled: 'true',
	name: 'Nexus Mods',
	icon: ICONS_URL + 'nexusMods.png',
	format_game_name: 'true',
	path_to_app: 'https://www.nexusmods.com/games?keyword=%GAME_NAME%&sort=downloads',
});

export function createDefaultSettings(): ButtonsSettings {
	return {
		top_buttons: [
			{ ...createDefaultTopButton(), name: 'SteamGridDB', icon: ICONS_URL + 'steamGridDB.png', path_to_app: 'https://www.steamgriddb.com/' },
			{ ...createDefaultTopButton(), name: 'SteamDB', icon: ICONS_URL + 'steamDB.png', path_to_app: 'https://steamdb.info/' },
			createDefaultTopButton(),
		],
		right_click_on_game_context_menu_buttons: [
			{ ...createDefaultMenuButton(), name: 'YouTube', path_to_app: 'https://www.youtube.com/results?search_query=%GAME_NAME%' },
			{ ...createDefaultMenuButton(), name: 'Twitch', path_to_app: 'https://www.twitch.tv/search?term=%GAME_NAME%' },
		],
		right_click_on_game_context_menu_buttons_drop_down: {
			name: 'Other',
			append_after_element_number: '7',
			items: [createDefaultMenuButton(), { ...createDefaultMenuButton(), name: 'How Long To Beat', path_to_app: 'https://howlongtobeat.com/?q=%GAME_NAME%' }],
		},
		game_properties_menu_buttons: [
			createDefaultMenuButton(),
			{ ...createDefaultMenuButton(), name: 'How Long To Beat', path_to_app: 'https://howlongtobeat.com/?q=%GAME_NAME%' },
		],
		store_supernav_buttons: [
			{ ...createDefaultStoreButton(), name: 'MLNM Plugins', path_to_app: 'https://steambrew.app/plugins' },
			{ ...createDefaultStoreButton(), name: 'MLNM Themes', path_to_app: 'https://steambrew.app/themes' },
			createDefaultStoreButton(),
		],
		app_page_buttons: [
			{
				...createDefaultAppPageButton(),
				name: 'SteamDB',
				icon: ICONS_URL + 'steamDB_alt.png',
				path_to_app: 'https://steamdb.info/app/%GAME_ID%/charts/',
			},
			createDefaultAppPageButton(),
		],
	};
}

//#region Normalization

type RawObject = Record<string, unknown>;

function isObject(value: unknown): value is RawObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFlag(value: unknown, fallback: Flag): Flag {
	if (value === true || value === 'true') return 'true';
	if (value === false || value === 'false') return 'false';
	return fallback;
}

function toText(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

// Fills every field of a button from the template, so a hand-edited or old file
// can never leave a button without one of its fields.
function normalizeButton<T extends object>(raw: unknown, template: T): T {
	const source = isObject(raw) ? raw : {};
	const result = { ...template } as Record<string, unknown>;

	for (const [key, fallback] of Object.entries(template)) {
		result[key] = fallback === 'true' || fallback === 'false' ? toFlag(source[key], fallback as Flag) : toText(source[key], fallback as string);
	}

	return result as T;
}

function normalizeList<T extends object>(raw: unknown, template: () => T): T[] {
	return Array.isArray(raw) ? raw.map((item) => normalizeButton(item, template())) : [];
}

// Accepts both the stored settings and an exported file, where they are wrapped
// in { settings: ... }. Returns undefined when the object has none of the sections.
export function normalizeSettings(raw: unknown): ButtonsSettings | undefined {
	if (!isObject(raw)) return undefined;

	const settings = isObject(raw.settings) ? raw.settings : raw;

	const has_any_section =
		Array.isArray(settings.top_buttons) ||
		Array.isArray(settings.right_click_on_game_context_menu_buttons) ||
		Array.isArray(settings.game_properties_menu_buttons) ||
		Array.isArray(settings.store_supernav_buttons) ||
		Array.isArray(settings.app_page_buttons) ||
		isObject(settings.right_click_on_game_context_menu_buttons_drop_down);

	if (!has_any_section) return undefined;

	const drop_down = isObject(settings.right_click_on_game_context_menu_buttons_drop_down) ? settings.right_click_on_game_context_menu_buttons_drop_down : {};

	const normalized_drop_down: DropDownMenu = {
		name: toText(drop_down.name, 'Other'),
		append_after_element_number: toText(drop_down.append_after_element_number, '1'),
		items: normalizeList(drop_down.items, createDefaultMenuButton),
	};

	return {
		top_buttons: normalizeList(settings.top_buttons, createDefaultTopButton),
		right_click_on_game_context_menu_buttons: normalizeList(settings.right_click_on_game_context_menu_buttons, createDefaultMenuButton),
		right_click_on_game_context_menu_buttons_drop_down: normalized_drop_down,
		game_properties_menu_buttons: normalizeList(settings.game_properties_menu_buttons, createDefaultMenuButton),
		store_supernav_buttons: normalizeList(settings.store_supernav_buttons, createDefaultStoreButton),
		app_page_buttons: normalizeList(settings.app_page_buttons, createDefaultAppPageButton),
	};
}

//#endregion

//#region Storage

// The stored object is { settings_json: string, ...older fields }. Fields that are
// no longer used, such as 'language' or 'top_buttons_style', are left as they are.
function readStoredObject(): RawObject {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		const parsed: unknown = stored ? JSON.parse(stored) : undefined;
		return isObject(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function readStoredSettingsJson(stored: RawObject): RawObject {
	try {
		const parsed: unknown = typeof stored.settings_json === 'string' ? JSON.parse(stored.settings_json) : undefined;
		return isObject(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function loadSettings(): ButtonsSettings {
	return normalizeSettings(readStoredSettingsJson(readStoredObject())) ?? createDefaultSettings();
}

function persistSettings(settings: ButtonsSettings) {
	try {
		const stored = readStoredObject();
		const settings_json = { ...readStoredSettingsJson(stored), ...settings };

		localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, settings_json: JSON.stringify(settings_json) }));
	} catch (error) {
		console.error('[Custom-buttons] failed to save settings', error);
	}
}

//#endregion

//#region Store

// One shared copy of the settings: the settings page writes it, and the buttons
// Steam renders through the patches subscribe to it, so they update right away.
let current_settings: ButtonsSettings = loadSettings();
const listeners = new Set<() => void>();

export function getButtonsSettings(): ButtonsSettings {
	return current_settings;
}

export function setButtonsSettings(next: ButtonsSettings) {
	current_settings = next;
	persistSettings(next);
	listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useButtonsSettings(): ButtonsSettings {
	return useSyncExternalStore(subscribe, getButtonsSettings);
}

export function isButtonEnabled(button: { enabled: Flag }): boolean {
	return button.enabled !== 'false';
}

//#endregion
