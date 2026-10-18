import { OpenButtonPath } from '../services/actions';
import { isButtonEnabled, useButtonsSettings } from '../services/settings';
import type { TopButton } from '../types';
import { SilentBoundary } from './SilentBoundary';

const FALLBACK_ICON = 'https://raw.githubusercontent.com/diemonic1/CatPilot/refs/heads/main/CatPilot.png';

// Fixed style of the buttons. It can be changed with QuickCSS through these classes.
const TOP_BUTTONS_CSS = `
.millennium-custom-buttons {
	margin-right: 9px;
	padding: 0px 3px;
	border-radius: 2px;
	height: 24px;
	font-size: 12px;
	background-color: rgba(103, 112, 123, 0.2);
	color: #8b929a;
	transition: all 0.4s;
}

.millennium-custom-buttons:hover {
	background-color: rgba(103, 112, 123, 0.5);
}

.millennium-custom-buttons-inner-div {
	height: 100%;
	pointer-events: auto;
	-webkit-app-region: no-drag;
	user-select: none;
	display: flex;
	align-items: center;
	padding: 0px 5px;
	cursor: pointer;
}

.millennium-custom-buttons-img {
	width: 18px;
	height: 18px;
}

.millennium-custom-buttons-text-with-margin {
	margin-left: 5px;
}
`;

function TopButtonView({ button }: { button: TopButton }) {
	const name = button.name.trim() !== '' ? button.name : 'Empty name';
	const icon = button.icon.includes('http') ? button.icon : FALLBACK_ICON;

	const show_name = button.show_name === 'true';
	// A button with neither the name nor the icon would be invisible, so it keeps the icon.
	const show_icon = button.show_icon === 'true' || !show_name;

	return (
		<div className="millennium-custom-buttons" title={name} onClick={() => OpenButtonPath(button.path_to_app)}>
			<div className="millennium-custom-buttons-inner-div">
				{show_icon && <img className="millennium-custom-buttons-img" src={icon} />}
				{show_name && <span className={show_icon ? 'millennium-custom-buttons-text-with-margin' : undefined}>{name}</span>}
			</div>
		</div>
	);
}

function TopButtonsList() {
	const buttons = useButtonsSettings().top_buttons.filter(isButtonEnabled);

	if (buttons.length === 0) return null;

	return (
		<>
			<style>{TOP_BUTTONS_CSS}</style>
			{buttons.map((button, index) => (
				<TopButtonView key={index} button={button} />
			))}
		</>
	);
}

// Rendered by Steam as the first child of the main window title bar controls.
export function TopButtons() {
	return (
		<SilentBoundary>
			<TopButtonsList />
		</SilentBoundary>
	);
}
