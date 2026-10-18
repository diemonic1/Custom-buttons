import { ConfirmModal, DialogButton, Field, PanelSection, TextField, showModal } from 'millennium';
import { useRef, type ReactElement } from 'react';
import { ExportSettingsToFile, ImportSettingsFromFile } from '../services/backup';
import { ClearGameIdCache } from '../services/gameId';
import { Localize, useLanguage, type LocalizationKey } from '../services/localization';
import {
	createDefaultAppPageButton,
	createDefaultMenuButton,
	createDefaultSettings,
	createDefaultStoreButton,
	createDefaultTopButton,
	getButtonsSettings,
	setButtonsSettings,
	useButtonsSettings,
} from '../services/settings';
import type { AnyButton, AppPageButton, ButtonsSettings, MenuButton, StoreButton, TopButton } from '../types';
import { ButtonSection, type SectionConfig } from './ButtonSection';
import { EditButtonModal, type ButtonField } from './EditButtonModal';
import { InfoPopover } from './InfoPopover';
import { SteamTooltip } from './SteamTooltip';

// The theme's line height assumes a single line, which leaves a large gap when the labels wrap.
const ACTION_BUTTON_STYLE = { width: '100%', lineHeight: '1.2' };

// Size of the button editor window, in pixels. The height grows with the number of
// fields of the button: the base covers the title, the "Enable" toggle and the
// Save / Cancel buttons.
const EDITOR_WINDOW_WIDTH = 760;
const EDITOR_WINDOW_BASE_HEIGHT = 300;
const EDITOR_WINDOW_FIELD_HEIGHT = 135;

//#region Section configs

const NAME_FIELD: ButtonField = { kind: 'text', key: 'name', labelKey: 'Name', descriptionKey: 'ButtonNameTip' };
const PATH_FIELD: ButtonField = { kind: 'text', key: 'path_to_app', labelKey: 'URL or App Path', descriptionKey: 'ButtonPathToAppTip' };
const ICON_FIELD: ButtonField = { kind: 'text', key: 'icon', labelKey: 'Icon', descriptionKey: 'ButtonIconTip' };
const SHOW_NAME_FIELD: ButtonField = { kind: 'toggle', key: 'show_name', labelKey: 'Show name', descriptionKey: 'ButtonShowNameTip' };
const SHOW_ICON_FIELD: ButtonField = { kind: 'toggle', key: 'show_icon', labelKey: 'Show icon', descriptionKey: 'ButtonShowIconTip' };
const FORMAT_GAME_NAME_FIELD: ButtonField = { kind: 'toggle', key: 'format_game_name', labelKey: 'FormatGameName', descriptionKey: 'ButtonFormatGameNameTip' };
const ARROW_FIELD: ButtonField = { kind: 'toggle', key: 'add_arrow_icon', labelKey: 'AddArrowIcon', descriptionKey: 'ButtonAddArrowIconTip' };

const MENU_FIELDS = [NAME_FIELD, PATH_FIELD, FORMAT_GAME_NAME_FIELD, ARROW_FIELD];

const RIGHT_CLICK_SECTION: SectionConfig<MenuButton> = {
	titleKey: 'Right click on game context menu buttons',
	addTooltipKey: 'Add right click on game context menu button',
	supportsParameters: true,
	fields: MENU_FIELDS,
	createDefault: createDefaultMenuButton,
};

const DROP_DOWN_SECTION: SectionConfig<MenuButton> = {
	titleKey: 'Right click on game context menu buttons in drop down',
	addTooltipKey: 'Add right click on game context menu button in drop down',
	supportsParameters: true,
	fields: MENU_FIELDS,
	createDefault: createDefaultMenuButton,
};

const GAME_PROPERTIES_SECTION: SectionConfig<MenuButton> = {
	titleKey: 'Game properties menu buttons',
	addTooltipKey: 'Add game properties menu buttons',
	supportsParameters: true,
	fields: MENU_FIELDS,
	createDefault: createDefaultMenuButton,
};

const TOP_SECTION: SectionConfig<TopButton> = {
	titleKey: 'Top Buttons',
	addTooltipKey: 'Add top button',
	supportsParameters: false,
	fields: [NAME_FIELD, PATH_FIELD, ICON_FIELD, SHOW_NAME_FIELD, SHOW_ICON_FIELD],
	createDefault: createDefaultTopButton,
};

const STORE_SECTION: SectionConfig<StoreButton> = {
	titleKey: 'Store supernav buttons',
	addTooltipKey: 'Add store supernav buttons',
	supportsParameters: false,
	fields: [NAME_FIELD, PATH_FIELD, ARROW_FIELD],
	createDefault: createDefaultStoreButton,
};

const APP_PAGE_SECTION: SectionConfig<AppPageButton> = {
	titleKey: 'App page Buttons',
	addTooltipKey: 'Add app page button',
	supportsParameters: true,
	fields: [NAME_FIELD, PATH_FIELD, ICON_FIELD, FORMAT_GAME_NAME_FIELD],
	createDefault: createDefaultAppPageButton,
};

//#endregion

// Every change is saved right away; the buttons in Steam pick it up through the shared settings.
function updateSettings(change: Partial<ButtonsSettings>) {
	setButtonsSettings({ ...getButtonsSettings(), ...change });
}

export function SettingsContent() {
	const language = useLanguage();
	const settings = useButtonsSettings();
	const root_ref = useRef<HTMLDivElement>(null);

	const drop_down = settings.right_click_on_game_context_menu_buttons_drop_down;

	const parameters_tip = Localize(language, 'GameNameParameterTip') + '\n\n' + Localize(language, 'GameIdParameterTip');

	// The settings live in their own window, so dialogs and files are opened there.
	// Without the parent window showModal falls back to findSP(), which throws in this context.
	const getSettingsDocument = () => root_ref.current?.ownerDocument ?? document;

	// Confirmations stay inside the settings window. The button editor needs more room
	// than an in-window dialog gets, so it opens as a separate Steam window of its own size.
	const openModal = (modal: ReactElement, title: string, popout?: { width: number; height: number }) => {
		const settings_window = getSettingsDocument().defaultView ?? window;

		try {
			const window_options = popout ? { bForcePopOut: true, popupWidth: popout.width, popupHeight: popout.height } : { bNeverPopOut: true };
			showModal(modal, settings_window, { strTitle: title, ...window_options });
		} catch (error) {
			// Nothing is done without confirmation, so a broken dialog must not change anything.
			console.error('[Custom-buttons] failed to show a dialog', error);
		}
	};

	const confirmAction = (titleKey: LocalizationKey, description: string, onConfirm: () => void) => {
		const title = Localize(language, titleKey);

		openModal(
			<ConfirmModal
				strTitle={title}
				strDescription={description}
				strOKButtonText={Localize(language, 'Confirm')}
				strCancelButtonText={Localize(language, 'Cancel')}
				bDestructiveWarning={true}
				onOK={onConfirm}
			/>,
			title,
		);
	};

	const editButton = <T extends AnyButton>(title: string, button: T, fields: ButtonField[], onSave: (button: T) => void) => {
		openModal(<EditButtonModal title={title} button={button} fields={fields} onSave={onSave} />, title, {
			width: EDITOR_WINDOW_WIDTH,
			height: EDITOR_WINDOW_BASE_HEIGHT + fields.length * EDITOR_WINDOW_FIELD_HEIGHT,
		});
	};

	const deleteButton = (index: number, name: string, onConfirm: () => void) => {
		const description = Localize(language, 'ConfirmDeleteButtonDescription')
			.split('%BUTTON_NUMBER%')
			.join(String(index + 1))
			.split('%BUTTON_NAME%')
			.join(name);

		confirmAction('ConfirmDeleteButtonTitle', description, onConfirm);
	};

	const onImportSettings = async () => {
		const imported = await ImportSettingsFromFile(getSettingsDocument());

		if (!imported) {
			const title = Localize(language, 'ImportSettings');
			openModal(<ConfirmModal strTitle={title} strDescription={Localize(language, 'ImportSettingsError')} bAlertDialog={true} />, title);
			return;
		}

		confirmAction('ConfirmImportSettingsTitle', Localize(language, 'ConfirmImportSettingsDescription'), () => setButtonsSettings(imported));
	};

	const onResetSettings = () => {
		confirmAction('ConfirmResetSettingsTitle', Localize(language, 'ConfirmResetSettingsDescription'), () => setButtonsSettings(createDefaultSettings()));
	};

	const sectionProps = { onEdit: editButton, onDelete: deleteButton, parametersTip: parameters_tip };

	return (
		<div ref={root_ref}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
				<SteamTooltip text={Localize(language, 'ImportSettingsTip')} style={{ flex: 1 }}>
					<DialogButton style={ACTION_BUTTON_STYLE} onClick={onImportSettings}>
						{Localize(language, 'ImportSettings')}
					</DialogButton>
				</SteamTooltip>
				<SteamTooltip text={Localize(language, 'ExportSettingsTip')} style={{ flex: 1 }}>
					<DialogButton style={ACTION_BUTTON_STYLE} onClick={() => ExportSettingsToFile(getButtonsSettings(), getSettingsDocument())}>
						{Localize(language, 'ExportSettings')}
					</DialogButton>
				</SteamTooltip>
				<SteamTooltip text={Localize(language, 'ResetSettingsTip')} style={{ flex: 1 }}>
					<DialogButton style={ACTION_BUTTON_STYLE} onClick={onResetSettings}>
						{Localize(language, 'ResetSettings')}
					</DialogButton>
				</SteamTooltip>
				<InfoPopover>
					{Localize(language, 'SettingsAreSavedAutomatically')}
					{'\n\n'}
					{parameters_tip}
				</InfoPopover>
			</div>

			<ButtonSection<MenuButton>
				config={RIGHT_CLICK_SECTION}
				buttons={settings.right_click_on_game_context_menu_buttons}
				onChange={(buttons) => updateSettings({ right_click_on_game_context_menu_buttons: buttons })}
				{...sectionProps}
			/>

			<ButtonSection<MenuButton>
				config={DROP_DOWN_SECTION}
				buttons={drop_down.items}
				onChange={(items) => updateSettings({ right_click_on_game_context_menu_buttons_drop_down: { ...getButtonsSettings().right_click_on_game_context_menu_buttons_drop_down, items } })}
				{...sectionProps}
			>
				<PanelSection title={Localize(language, 'DropdownMenuSettings')}>
					<TextField
						label={Localize(language, 'Name')}
						description={Localize(language, 'Name for the drop-down menu section')}
						value={drop_down.name}
						onChange={(event) => updateSettings({ right_click_on_game_context_menu_buttons_drop_down: { ...drop_down, name: event.target.value } })}
					/>
					<TextField
						label={Localize(language, 'Append after')}
						description={Localize(language, 'After which element should the menu be inserted')}
						mustBeNumeric={true}
						rangeMin={0}
						value={drop_down.append_after_element_number}
						onChange={(event) => updateSettings({ right_click_on_game_context_menu_buttons_drop_down: { ...drop_down, append_after_element_number: event.target.value } })}
					/>
				</PanelSection>
			</ButtonSection>

			<ButtonSection<MenuButton>
				config={GAME_PROPERTIES_SECTION}
				buttons={settings.game_properties_menu_buttons}
				onChange={(buttons) => updateSettings({ game_properties_menu_buttons: buttons })}
				{...sectionProps}
			/>

			<ButtonSection<TopButton> config={TOP_SECTION} buttons={settings.top_buttons} onChange={(buttons) => updateSettings({ top_buttons: buttons })} {...sectionProps} />

			<ButtonSection<StoreButton> config={STORE_SECTION} buttons={settings.store_supernav_buttons} onChange={(buttons) => updateSettings({ store_supernav_buttons: buttons })} {...sectionProps} />

			<ButtonSection<AppPageButton> config={APP_PAGE_SECTION} buttons={settings.app_page_buttons} onChange={(buttons) => updateSettings({ app_page_buttons: buttons })} {...sectionProps} />

			<Field label={Localize(language, 'GameIdCache')} description={Localize(language, 'ClearGameIdCacheTip')} childrenLayout="below" bottomSeparator="none">
				<DialogButton style={ACTION_BUTTON_STYLE} onClick={() => ClearGameIdCache()}>
					{Localize(language, 'ClearGameIdCache')}
				</DialogButton>
			</Field>
		</div>
	);
}
