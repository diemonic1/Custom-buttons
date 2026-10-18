import { DialogButton, Field, Toggle } from 'millennium';
import { useState, type ReactNode } from 'react';
import { Localize, useLanguage, type LocalizationKey } from '../services/localization';
import type { AnyButton } from '../types';
import type { ButtonField } from './EditButtonModal';
import { SettingsIcon } from './SettingsIcon';
import { SteamTooltip } from './SteamTooltip';

const EMPTY_NAME_PLACEHOLDER = 'Empty name';
const EMPTY_PATH_PLACEHOLDER = 'Empty URL or app path';

const ICON_BUTTON_STYLE = { minWidth: '0px', width: '36px', height: '32px', padding: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

// Long URLs have no spaces to wrap at, so they are broken anywhere and cut after two lines.
const PATH_STYLE = {
	wordBreak: 'break-all',
	overflow: 'hidden',
	display: '-webkit-box',
	WebkitLineClamp: 2,
	WebkitBoxOrient: 'vertical',
} as const;

export type SectionConfig<T extends AnyButton> = {
	titleKey: LocalizationKey;
	addTooltipKey: LocalizationKey;
	// Sections whose buttons are called for a game support the %GAME_NAME% and %GAME_ID% parameters.
	supportsParameters: boolean;
	fields: ButtonField[];
	createDefault: () => T;
};

type Props<T extends AnyButton> = {
	config: SectionConfig<T>;
	buttons: T[];
	onChange: (buttons: T[]) => void;
	// Opens the button editor; the section passes what to do with the result.
	onEdit: (title: string, button: T, fields: ButtonField[], onSave: (button: T) => void) => void;
	onDelete: (index: number, name: string, onConfirm: () => void) => void;
	parametersTip: string;
	children?: ReactNode;
};

function IconButton({ icon, tooltip, onClick }: { icon: string; tooltip: string; onClick: () => void }) {
	return (
		<SteamTooltip text={tooltip}>
			<DialogButton
				style={ICON_BUTTON_STYLE}
				onClick={(event) => {
					event.stopPropagation();
					onClick();
				}}
			>
				<SettingsIcon name={icon} />
			</DialogButton>
		</SteamTooltip>
	);
}

// A button is never dropped when it is saved: empty fields get a readable placeholder instead.
function WithPlaceholders<T extends AnyButton>(button: T): T {
	return {
		...button,
		name: button.name.trim() === '' ? EMPTY_NAME_PLACEHOLDER : button.name,
		path_to_app: button.path_to_app.trim() === '' ? EMPTY_PATH_PLACEHOLDER : button.path_to_app,
	};
}

export function ButtonSection<T extends AnyButton>({ config, buttons, onChange, onEdit, onDelete, parametersTip, children }: Props<T>) {
	const language = useLanguage();
	const [open, setOpen] = useState(false);

	const title = Localize(language, config.titleKey);

	const replaceAt = (index: number, button: T) => onChange(buttons.map((current, i) => (i === index ? button : current)));

	const addButton = () => {
		onEdit(Localize(language, 'NewButtonTitle') + ' — ' + title, config.createDefault(), config.fields, (button) => {
			onChange([...buttons, WithPlaceholders(button)]);
			setOpen(true);
		});
	};

	return (
		<div style={{ marginBottom: '8px' }}>
			<Field
				label={
					<span style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
						<SettingsIcon name="Chevron" size={18} direction={open ? 'down' : 'right'} />
						<span>
							{title}
							{config.supportsParameters && (
								<SteamTooltip text={parametersTip} style={{ display: 'inline-block', marginLeft: '6px', color: '#ffcc32', cursor: 'help' }}>
									*
								</SteamTooltip>
							)}
						</span>
					</span>
				}
				childrenLayout="inline"
				onClick={() => setOpen(!open)}
				bottomSeparator="standard"
			>
				<IconButton icon="Add" tooltip={Localize(language, config.addTooltipKey)} onClick={addButton} />
			</Field>

			{open && (
				<div style={{ paddingLeft: '26px', paddingTop: '8px' }}>
					{children}

					{buttons.length === 0 && <Field label={Localize(language, 'NoButtons')} bottomSeparator="standard" />}

					{buttons.map((button, index) => (
						<Field
							key={index}
							label={<span style={{ wordBreak: 'break-word' }}>{button.name}</span>}
							description={<span style={PATH_STYLE}>{button.path_to_app}</span>}
							childrenLayout="inline"
							bottomSeparator="standard"
						>
							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<SteamTooltip text={Localize(language, 'EnableButtonTip')}>
									<Toggle value={button.enabled !== 'false'} onChange={(checked) => replaceAt(index, { ...button, enabled: checked ? 'true' : 'false' })} />
								</SteamTooltip>
								<IconButton
									icon="Edit"
									tooltip={Localize(language, 'Edit')}
									onClick={() =>
										onEdit(Localize(language, 'EditButtonTitle') + ' — ' + title, button, config.fields, (edited) => replaceAt(index, WithPlaceholders(edited)))
									}
								/>
								<IconButton
									icon="Trash"
									tooltip={Localize(language, 'Delete')}
									onClick={() => onDelete(index, button.name, () => onChange(buttons.filter((_, i) => i !== index)))}
								/>
							</div>
						</Field>
					))}
				</div>
			)}
		</div>
	);
}
