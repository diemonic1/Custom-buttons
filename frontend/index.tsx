import { definePlugin, IconsModule, type Plugin } from 'millennium';
import { AppPageButtons } from './hooks/AppPageButtons';
import { contextMenu, rememberSubmenu } from './hooks/contextMenu';
import { propertiesPages } from './hooks/propertiesPages';
import { storeItems } from './hooks/storeItems';
import { TopButtons } from './hooks/TopButtons';
import { LoadSteamLanguage } from './services/localization';
import { SettingsContent } from './settings/SettingsContent';

// Everything Steam calls from the patched UI code, see the patches in backend/main.lua.
/** @ffi */
export const hooks = {
	TopButtons,
	contextMenu,
	rememberSubmenu,
	propertiesPages,
	storeItems,
	AppPageButtons,
};

export default definePlugin(() => {
	LoadSteamLanguage();

	const SettingsIcon = IconsModule?.Settings;

	// The plugin loader shows the settings page only when the title, the icon and
	// the content are all set, although the Plugin type has no title
	const plugin: Plugin & { title: string } = {
		title: 'Custom Buttons',
		icon: SettingsIcon ? <SettingsIcon /> : <></>,
		content: <SettingsContent />,
	};

	return plugin;
});
