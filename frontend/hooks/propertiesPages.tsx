import { OpenButtonPath } from '../services/actions';
import { getButtonsSettings, isButtonEnabled } from '../services/settings';
import type { AppOverview } from '../types';
import { MenuButtonLabel } from './contextMenu';
import { SilentBoundary } from './SilentBoundary';

// An entry of the page list in Steam's paged settings dialog. An entry with a
// 'click' function is not a page: Steam calls the function instead of opening it.
type PropertiesPage = {
	title: unknown;
	click?: () => void;
};

// Called by Steam with the pages of the game properties dialog; the buttons are
// appended after the last page.
export function propertiesPages(overview: AppOverview | undefined, pages: PropertiesPage[]): PropertiesPage[] {
	try {
		if (!overview) return pages;

		const buttons = getButtonsSettings().game_properties_menu_buttons.filter(isButtonEnabled);

		if (buttons.length === 0) return pages;

		return [
			...pages,
			...buttons.map((button) => ({
				title: (
					<SilentBoundary>
						<MenuButtonLabel button={button} overview={overview} />
					</SilentBoundary>
				),
				click: () => OpenButtonPath(button.path_to_app, overview, button.format_game_name),
			})),
		];
	} catch (error) {
		console.error('[Custom-buttons] failed to add game properties buttons', error);
		return pages;
	}
}
