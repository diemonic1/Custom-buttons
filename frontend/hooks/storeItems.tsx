import type { ReactElement } from 'react';
import { OpenButtonPath } from '../services/actions';
import { getButtonsSettings, isButtonEnabled } from '../services/settings';
import { ArrowIcon } from './contextMenu';

// An item of Steam's header menus. 'name' is also the React key of the item;
// when 'children' is set, it is shown instead of the name.
type StoreMenuItem = {
	name: string;
	children: ReactElement;
	onClick: () => void;
};

// Called by Steam when it builds the "Store" menu in the main window header;
// the buttons are appended after its own items.
export function storeItems(): StoreMenuItem[] {
	try {
		return getButtonsSettings()
			.store_supernav_buttons.filter(isButtonEnabled)
			.map((button, index) => ({
				name: 'custom-buttons-store-' + index,
				children: (
					<>
						{button.name}
						{button.add_arrow_icon === 'true' && <ArrowIcon />}
					</>
				),
				onClick: () => OpenButtonPath(button.path_to_app),
			}));
	} catch (error) {
		console.error('[Custom-buttons] failed to add store menu buttons', error);
		return [];
	}
}
