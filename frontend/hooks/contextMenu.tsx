import { IconsModule } from 'millennium';
import type { ComponentType, ReactNode } from 'react';
import { OpenButtonPath, useButtonLabel } from '../services/actions';
import { getButtonsSettings, isButtonEnabled } from '../services/settings';
import type { AppOverview, MenuButton } from '../types';
import { SilentBoundary } from './SilentBoundary';

// Steam's own menu components, handed over by the patches in backend/main.lua.
// The MenuItem / MenuGroup exports of the Millennium API are found by guessing
// and are undefined in some Steam builds, which crashes the whole menu.
type MenuItemComponent = ComponentType<{ onSelected?: () => void; children?: ReactNode }>;
type SubmenuComponent = ComponentType<{ label: ReactNode; children?: ReactNode }>;

let steam_submenu: SubmenuComponent | undefined;

// Called by Steam every time it builds the "Manage" submenu of the game context menu.
export function rememberSubmenu(component: unknown) {
	if (typeof component === 'function' || (typeof component === 'object' && component !== null)) {
		steam_submenu = component as SubmenuComponent;
	}
}

export function ArrowIcon() {
	const Popout = IconsModule?.Popout;
	return Popout ? <Popout style={{ width: '0.9em', height: '0.9em', marginLeft: '0.4em', verticalAlign: 'middle' }} /> : null;
}

// Also used by the game properties dialog, which shows the same kind of buttons.
export function MenuButtonLabel({ button, overview }: { button: MenuButton; overview: AppOverview }) {
	const label = useButtonLabel(button.name, overview, button.format_game_name);

	return (
		<>
			{label}
			{button.add_arrow_icon === 'true' && <ArrowIcon />}
		</>
	);
}

function RenderButtons(MenuItem: MenuItemComponent, buttons: MenuButton[], overview: AppOverview, key_prefix: string) {
	return buttons.map((button, index) => (
		<MenuItem key={key_prefix + index} onSelected={() => OpenButtonPath(button.path_to_app, overview, button.format_game_name)}>
			<SilentBoundary>
				<MenuButtonLabel button={button} overview={overview} />
			</SilentBoundary>
		</MenuItem>
	));
}

// Called by Steam with the children of the game context menu, which is used both
// for the right click on a game and for the gear button on the game page.
// The buttons are added at the end, the drop down submenu after the configured item.
export function contextMenu(apps: AppOverview[] | undefined, children: ReactNode[], MenuItem?: MenuItemComponent): ReactNode[] {
	try {
		if (!apps || apps.length !== 1 || !MenuItem) return children;

		const overview = apps[0];
		const settings = getButtonsSettings();
		const buttons = settings.right_click_on_game_context_menu_buttons.filter(isButtonEnabled);
		const drop_down = settings.right_click_on_game_context_menu_buttons_drop_down;
		const drop_down_items = drop_down.items.filter(isButtonEnabled);

		if (buttons.length === 0 && drop_down_items.length === 0) return children;

		// Steam leaves 'false' in place of the items it does not show, so only real
		// items are counted when looking for the position of the submenu.
		const result = children.filter((child) => child !== false && child !== null && child !== undefined);

		if (drop_down_items.length > 0) {
			const position = Math.min(Math.max(Number(drop_down.append_after_element_number) || 0, 0), result.length);
			const Submenu = steam_submenu;

			// Without Steam's submenu component (not built yet) the items go right into the menu.
			const drop_down_node = Submenu ? (
				<Submenu key="custom-buttons-drop-down" label={drop_down.name}>
					{RenderButtons(MenuItem, drop_down_items, overview, 'custom-buttons-drop-down-')}
				</Submenu>
			) : (
				RenderButtons(MenuItem, drop_down_items, overview, 'custom-buttons-drop-down-')
			);

			result.splice(position, 0, drop_down_node);
		}

		result.push(...RenderButtons(MenuItem, buttons, overview, 'custom-buttons-'));

		return result;
	} catch (error) {
		console.error('[Custom-buttons] failed to add context menu buttons', error);
		return children;
	}
}
