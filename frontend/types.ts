// The part of Steam's app overview object that the plugin reads.
export interface AppOverview {
	appid: number;
	display_name: string;
	BIsModOrShortcut?(): boolean;
}

// Settings keep 'true' / 'false' strings, as in the files users have already exported.
export type Flag = 'true' | 'false';

export interface TopButton {
	enabled: Flag;
	name: string;
	show_name: Flag;
	icon: string;
	show_icon: Flag;
	path_to_app: string;
}

export interface MenuButton {
	enabled: Flag;
	name: string;
	format_game_name: Flag;
	add_arrow_icon: Flag;
	path_to_app: string;
}

export interface StoreButton {
	enabled: Flag;
	name: string;
	add_arrow_icon: Flag;
	path_to_app: string;
}

export interface AppPageButton {
	enabled: Flag;
	name: string;
	icon: string;
	format_game_name: Flag;
	path_to_app: string;
}

export interface DropDownMenu {
	name: string;
	append_after_element_number: string;
	items: MenuButton[];
}

export interface ButtonsSettings {
	top_buttons: TopButton[];
	right_click_on_game_context_menu_buttons: MenuButton[];
	right_click_on_game_context_menu_buttons_drop_down: DropDownMenu;
	game_properties_menu_buttons: MenuButton[];
	store_supernav_buttons: StoreButton[];
	app_page_buttons: AppPageButton[];
}

export type AnyButton = TopButton | MenuButton | StoreButton | AppPageButton;
