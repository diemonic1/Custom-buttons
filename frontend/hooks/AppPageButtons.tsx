import { findClassModule } from 'millennium';
import { OpenButtonPath, useButtonLabel } from '../services/actions';
import { isButtonEnabled, useButtonsSettings } from '../services/settings';
import type { AppOverview, AppPageButton } from '../types';
import { SilentBoundary } from './SilentBoundary';

// The class module of the game page header, so the buttons look like the gear,
// info and favourite buttons next to them. Looked up on first render, when
// Steam has certainly loaded it.
let header_classes: ReturnType<typeof findClassModule> | undefined;

function GetMenuButtonClass(): string | undefined {
	header_classes ??= findClassModule((module) => module.AppButtonsContainer && module.MenuButton);
	return header_classes ? header_classes.MenuButton : undefined;
}

function AppPageButtonView({ button, overview }: { button: AppPageButton; overview: AppOverview }) {
	const label = useButtonLabel(button.name, overview, button.format_game_name);

	return (
		<div className={GetMenuButtonClass()} title={label} onClick={() => OpenButtonPath(button.path_to_app, overview, button.format_game_name)}>
			<img src={button.icon} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
		</div>
	);
}

function AppPageButtonsList({ overview }: { overview: AppOverview }) {
	const buttons = useButtonsSettings().app_page_buttons.filter(isButtonEnabled);

	return (
		<>
			{buttons.map((button, index) => (
				<AppPageButtonView key={index} button={button} overview={overview} />
			))}
		</>
	);
}

// Rendered by Steam first in the row of round buttons on the game page.
export function AppPageButtons({ overview }: { overview?: AppOverview }) {
	if (!overview) return null;

	return (
		<SilentBoundary>
			<AppPageButtonsList overview={overview} />
		</SilentBoundary>
	);
}
