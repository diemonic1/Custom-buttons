import { Millennium, IconsModule, definePlugin, callable, PanelSection, TextField, Toggle, Field } from '@steambrew/client';
import { getSettings, saveSettings } from './services/settings';
import { useState, useEffect } from 'react';

const WaitForElement = async (sel: string, parent = document) => [...(await Millennium.findElement(parent, sel))][0];

const print_log = callable<[{ text: string }], string>('print_log');
const print_error = callable<[{ text: string }], string>('print_error');
const run_command = callable<[{ text: string }], string>('run_command');

const GAME_NAME_PARAMETER = "%GAME_NAME%";
const YELLOW_HIGHLIGHT_COLOR = "#ffcc32";

const GAME_NAME_PARAMETER_TIP = 'For button sections marked with * sign, the ' + GAME_NAME_PARAMETER + ' parameter can be used in the button name and URL. It will be replaced to the name of the game for which the button was called. For example: https://www.google.com/search?q=' + GAME_NAME_PARAMETER + ' → https://www.google.com/search?q=Subnautica';
const BUTTON_NAME_TIP = "The name that will be displayed on the button";
const BUTTON_SHOW_NAME_TIP = "Should the button's name be shown on it?";
const BUTTON_ICON_TIP = "URL of the icon that will be displayed on the button";
const BUTTON_SHOW_ICON_TIP = "Should the button's icon be shown on it?";
const BUTTON_PATH_TO_APP_TIP = "The URL or App Path (e.g., https://www.example.com or C:\\Program Files\\App\\app.exe) to open when the button is clicked";
const BUTTON_FORMAT_GAME_NAME_TIP = "Does the game name need to be formatted when it is inserted into a parameter " + GAME_NAME_PARAMETER + ". Formatting replaces spaces and slashes with + signs, which is convenient for opening URLs in a browser.";
const BUTTON_ADD_ARROW_ICON_TIP = "Whether to add an arrow icon to the button";

const DROPDOWN_MENU_SETTINGS = "Dropdown Menu Settings";

let __idCounter = 0;

window.mouseX = 0;
window.mouseY = 0;

let global_object_settings = '';
let popup_desktop = undefined;
let popup_store_supernav = undefined;

let spawned_top_buttons_to_delete_on_respawn = [];
let spawned_store_supernav_buttons_to_delete_on_respawn = [];

async function call_back(app_path: string){
	if (app_path.includes("https://") || app_path.includes("http://")){
		SyncLog('open web page: ' + app_path);
    	return SteamClient.System.OpenInSystemBrowser(app_path);
	}
	else{
		SyncLog('run command in console: ' + app_path);
		return await run_command({ text: app_path });
	}
}

function generateId() {
    const timestamp = Date.now().toString(36);
    const perf = Math.floor(performance.now() * 1000).toString(36);
    const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const counter = (__idCounter++).toString(36);

    return `${timestamp}-${perf}-${random}-${counter}`;
}

async function SyncLog(textS: string) {
	await print_log({ text: textS });
}

function FormatGameName(str: string) {
	str = str.replace(/([^A-Z])([A-Z]{2,})(?![A-Z])/g, '$1+$2');
	str = str.replace(/([^A-Z]|^)([A-Z])(?![A-Z])/g, '$1+$2');
	str = str.replace(/[\/\\]/g, '+');
	str = str.replace(/\s+/g, '+');
	str = str.replace(/^\+/, '').replace(/\+$/, '');
	str = str.replace(/\++/g, '+');
	return str.trim();
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function RespawnTopButtons(){
	SyncLog('Start Respawn top Buttons');
	
	spawned_top_buttons_to_delete_on_respawn.forEach((element: any) => {
		if (element) {
			element.remove();
		}
	})

	SpawnTopButtons(popup_desktop);
}

function RespawnStoreSupernavButtons(){
	SyncLog('Start Respawn Store Supernav Buttons');
	
	spawned_store_supernav_buttons_to_delete_on_respawn.forEach((element: any) => {
		if (element) {
			element.remove();
		}
	})

	SpawnStoreSupernavButtons(popup_store_supernav, global_object_settings);
}

//#region Top Buttons

const TOP_BUTTON_ID_PREFIX = 'millennium-custom-buttons-top-button-';

let TopButtonsWasSpawned = false;
let TopButtonsSpawnInProgress = false;

async function SpawnTopButtons(popup: any) {
	if (!popup) return;

	if (TopButtonsSpawnInProgress) return;
	TopButtonsSpawnInProgress = true;

	if (!global_object_settings.top_buttons || global_object_settings.top_buttons.length === 0) {
		TopButtonsSpawnInProgress = false;
		return;
	}

	while (true) {
		SyncLog('Start spawn Top Buttons Once');
		await spawnTopButtonsOnce(popup);

		await sleep(500);

		if (areTopButtonsAlive(popup)) {
			SyncLog('Top buttons successfully in DOM');
			break;
		}

		SyncLog('Top buttons not found, retry...');
		TopButtonsWasSpawned = false;
	}

	TopButtonsSpawnInProgress = false;
}

async function spawnTopButtonsOnce(popup: any) {
	if (!popup) return;

	if (TopButtonsWasSpawned) return;
	TopButtonsWasSpawned = true;

	let styleObj = popup.m_popup.document.getElementById('millennium-custom-buttons-top-buttons-style');

	if (styleObj) {
		styleObj.remove();
	}

	const style = popup.m_popup.document.createElement('style');
	style.id = 'millennium-custom-buttons-top-buttons-style';
	style.textContent = global_object_settings.top_buttons_style.toString();
	popup.m_popup.document.head.appendChild(style);

	const anyItem = await WaitForElement(
		'div.tool-tip-source',
		popup.m_popup.document
	);

	global_object_settings.top_buttons.forEach((app: any, index: number) => {
		const id = TOP_BUTTON_ID_PREFIX + index;

		if (popup.m_popup.document.getElementById(id)) return;

		const newElement = popup.m_popup.document.createElement('div');
		newElement.id = id;
		newElement.classList.add('millennium-custom-buttons');

		const name = app.name && app.name !== '' ? app.name : 'Empty name';
		newElement.title = name;

		const icon =
			app.icon?.includes('http')
				? app.icon
				: 'https://raw.githubusercontent.com/diemonic1/CatPilot/refs/heads/main/CatPilot.png';

		if (app.show_name === 'true' && app.show_icon === 'true') {
			newElement.innerHTML = `
				<div class="millennium-custom-buttons-inner-div">
					<img class="millennium-custom-buttons-img" src="${icon}">
					<span class="millennium-custom-buttons-text-with-margin">${name}</span>
				</div>
			`;
		} else if (app.show_name === 'true') {
			newElement.innerHTML = `
				<div class="millennium-custom-buttons-inner-div">
					<span>${name}</span>
				</div>
			`;
		} else {
			newElement.innerHTML = `
				<div class="millennium-custom-buttons-inner-div">
					<img class="millennium-custom-buttons-img-with-margin" src="${icon}">
				</div>
			`;
		}

		newElement.addEventListener('click', async () => {
			const result = await call_back(app.path_to_app);
			SyncLog('result: ' + result);
		});

		anyItem.parentNode.insertBefore(newElement, anyItem);
		spawned_top_buttons_to_delete_on_respawn.push(newElement);
	});
}

function areTopButtonsAlive(popup: any): boolean {
	return global_object_settings.top_buttons.every((_: any, index: number) => {
		return popup.m_popup.document.getElementById(
			TOP_BUTTON_ID_PREFIX + index
		);
	});
}

//#endregion

//#region SpawnContextMenuButtons

function SpawnContextMenuButtons(popup: any, node: any, lastClickedElement: string) {
	if (global_object_settings.right_click_on_game_context_menu_buttons.length <= 0 
		&& global_object_settings.right_click_on_game_context_menu_buttons_drop_down.items.length <= 0) 
	{
		return;
	}

	SyncLog('try to spawn ConextMenu Buttons');

	if (global_object_settings.right_click_on_game_context_menu_buttons.length > 0) {
		let element = node.children[0].lastElementChild;

		if (element == null || element == undefined) return;

		global_object_settings.right_click_on_game_context_menu_buttons.forEach((app: string) => {
			const button_name = app.name.replace(
				GAME_NAME_PARAMETER,
				app.format_game_name == 'true' ? FormatGameName(lastClickedElement) : lastClickedElement,
			);

			const app_path_s = app.path_to_app.replace(
				GAME_NAME_PARAMETER,
				app.format_game_name == 'true' ? FormatGameName(lastClickedElement) : lastClickedElement,
			);

			let myButton = element.cloneNode(true);

			myButton.textContent = button_name + (app.add_arrow_icon == 'true' ? ' ↗' : '');

			myButton.addEventListener('click', async () => {
				let result = await call_back(app_path_s);
			});

			node.children[0].appendChild(myButton);
			SyncLog('added node in ConextMenu: ' + button_name);
		});
	}

	if (global_object_settings.right_click_on_game_context_menu_buttons_drop_down.items.length > 0) {
		let element = node.children[0].children[3];

		if (element == null || element == undefined) return;

		let myListButton = element.cloneNode(true);

		let myList = popup.m_popup.document.getElementById('apps_buttons_additional_drop_down_menu');

		if (myList == null || myList == undefined) {
			myList = node.cloneNode(true);
			node.parentNode.appendChild(myList);
		}

		while (myList.children[0].firstChild) {
			myList.children[0].removeChild(myList.children[0].firstChild);
		}

		myListButton.children[0].textContent = global_object_settings.right_click_on_game_context_menu_buttons_drop_down.name;

		const n = Number(global_object_settings.right_click_on_game_context_menu_buttons_drop_down.append_after_element_number);

		const children = node.children[0].children;
		if (n >= children.length) {
			node.children[0].appendChild(myListButton);
		} else {
			node.children[0].insertBefore(myListButton, children[n]);
		}

		const rect = myListButton.getBoundingClientRect();

		myListButton.addEventListener('mouseenter', async () => {
			myList.style = 'visibility: visible; top: ' + rect.top + 'px; left: ' + rect.right + 'px;';
		});

		myList.addEventListener('mouseenter', async () => {
			myList.style = 'visibility: visible; top: ' + rect.top + 'px; left: ' + rect.right + 'px;';
		});

		myListButton.addEventListener('mouseleave', async () => {
			myList.style = 'visibility: hidden; display: none; top: 0px; left: 0px;';
		});

		myList.addEventListener('mouseleave', async () => {
			myList.style = 'visibility: hidden; display: none; top: 0px; left: 0px;';
		});

		myList.id = 'apps_buttons_additional_drop_down_menu';
		myList.style = 'visibility: hidden; display: none; top: 0px; left: 0px;';

		global_object_settings.right_click_on_game_context_menu_buttons_drop_down.items.forEach((app: string) => {
			const button_name = app.name.replace(
				GAME_NAME_PARAMETER,
				app.format_game_name == 'true' ? FormatGameName(lastClickedElement) : lastClickedElement,
			);

			const app_path_s = app.path_to_app.replace(
				GAME_NAME_PARAMETER,
				app.format_game_name == 'true' ? FormatGameName(lastClickedElement) : lastClickedElement,
			);

			let myButton = element.cloneNode(true);

			myButton.textContent = button_name + (app.add_arrow_icon == 'true' ? ' ↗' : '');

			myButton.addEventListener('click', async () => {
				let result = await call_back(app_path_s);
			});

			myList.children[0].appendChild(myButton);
			SyncLog('added node in ConextMenu DropDown: ' + button_name);
		});
	}
}

//#endregion

//#region SpawnAppPageButtons

let spawnedAppPageButtonsCount = 0;

function SpawnAppPageButtons(elementsToSpawnAppPageButtons: any, lastClickedElement: string) {
	if (!global_object_settings.app_page_buttons
		|| global_object_settings.app_page_buttons.length <= 0
	)
	{
		return;
	}

	if (spawnedAppPageButtonsCount >= global_object_settings.app_page_buttons.length * 2) {
		return;
	}

	SyncLog('try to spawn AppPage Buttons');

	try{
		elementsToSpawnAppPageButtons.forEach(elementToClone => {
			global_object_settings.app_page_buttons.forEach((app: string) => {

				const format_game_name = app.format_game_name ? (app.format_game_name == 'true') : ('true');

				const button_name = app.name.replace(
					GAME_NAME_PARAMETER,
					format_game_name ? FormatGameName(lastClickedElement) : lastClickedElement,
				);

				const app_path_s = app.path_to_app.replace(
					GAME_NAME_PARAMETER,
					format_game_name ? FormatGameName(lastClickedElement) : lastClickedElement,
				);

				const parent2 = elementToClone.parentElement.parentElement;

				const clone = parent2.cloneNode(true);

				const target = clone.firstElementChild?.firstElementChild;
				if (target) {
					target.remove();

					const img = document.createElement('img');
					img.src = app.icon;
					img.style.cssText = 'width:100%; height:100%; object-fit:contain;';
					clone.firstElementChild.appendChild(img);
				}

				clone.title = button_name + " 21";
				clone.id = button_name + '_app_page_button';

				parent2.parentElement.prepend(clone);

				clone.addEventListener('click', async () => {
					let result = await call_back(app_path_s);
				});

				spawnedAppPageButtonsCount = spawnedAppPageButtonsCount + 1;
				SyncLog('added node in app page ' + lastClickedElement + ': ' + button_name + ', number: ' + spawnedAppPageButtonsCount);
			});
		});
	}
	catch (error){
		SyncLog(error);
	}
}

//#endregion

//#region SpawnPropertiesMenuButtons

async function SpawnPropertiesMenuButtons(popup: any) {
	if (!popup) return;

	if (global_object_settings.game_properties_menu_buttons.length <= 0) return;

	let mainPanel = await WaitForElement('div.PageListColumn', popup.m_popup.document);

	if (mainPanel == null || mainPanel == undefined) return;

	SyncLog('start clone node in Properties Menu');

	let element = mainPanel.children[1].children[1];

	if (
		!element.id.includes('general') &&
		!element.id.includes('updates') &&
		!element.id.includes('localfiles') &&
		!element.id.includes('shortcut') &&
		!element.id.includes('controller') &&
		!element.id.includes('gamerecording') &&
		!element.id.includes('customization')
	) {
		return;
	}

	global_object_settings.game_properties_menu_buttons.forEach((app: string) => {
		const button_name = app.name.replace(
			GAME_NAME_PARAMETER,
			app.format_game_name == 'true' ? FormatGameName(popup.m_strTitle) : popup.m_strTitle,
		);

		const app_path_s = app.path_to_app.replace(GAME_NAME_PARAMETER, 
			app.format_game_name == 'true' ? FormatGameName(popup.m_strTitle) : popup.m_strTitle);

		let myButton = element.cloneNode(true);

		myButton.textContent = button_name + (app.add_arrow_icon == 'true' ? ' ↗' : '');

		myButton.addEventListener('click', async () => {
			let result = await call_back(app_path_s);
		});

		mainPanel.children[1].appendChild(myButton);
		SyncLog('added node in Properties Menu');
	});
}

//#endregion

//#region SpawnStoreSupernavButtons

const STORE_SUPERNAV_BUTTON_ID_PREFIX = 'millennium-custom-buttons-store-supernav-button-';

async function SpawnStoreSupernavButtons(popup: any, object_settings: any) {
	if (!popup) return;

	if (object_settings.store_supernav_buttons.length <= 0) return;

	if (areStoreSupernavButtonsAlive(popup)) return;

	SyncLog('start clone node in Store Supernav Menu');

	const anyItem = await WaitForElement('div.contextMenuItem', popup.m_popup.document);

	object_settings.store_supernav_buttons.forEach((app: string, index: number) => {
		const id = STORE_SUPERNAV_BUTTON_ID_PREFIX + index;

		if (popup.m_popup.document.getElementById(id)) return;

		let myButton = anyItem.cloneNode(true);

		myButton.textContent = app.name + (app.add_arrow_icon == 'true' ? ' ↗' : '');
		(myButton as HTMLElement).id = id;

		myButton.addEventListener('click', async () => {
			let result = await call_back(app.path_to_app);
		});

		anyItem.parentNode.appendChild(myButton);
		spawned_store_supernav_buttons_to_delete_on_respawn.push(myButton);
		SyncLog('added node in Store Supernav Menu');
	});
}

function areStoreSupernavButtonsAlive(popup: any): boolean {
	return global_object_settings.store_supernav_buttons.every((_: any, index: number) => {
		return popup.m_popup.document.getElementById(
			STORE_SUPERNAV_BUTTON_ID_PREFIX + index
		);
	});
}

//#endregion

let lastPage = '';

async function SubscribeOnMutations(popup: any) {
	Millennium.AddWindowCreateHook?.((context: any) => {
		if (!context.m_strName?.startsWith('SP ')) 
			return;

		const doc = context.m_popup?.document;

		if (!doc?.body) 
			return;

		const popup_target = context.m_popup.document.getElementById('popup_target');

		if (context.m_strName === 'SP Desktop_uid0'
			&& popup_target != null 
			&& popup_target != undefined)
		{
			popup_target.addEventListener('mousedown', (e) => {
				try {
					const x = e.clientX;
					const y = e.clientY;

					const draggables = popup_target.querySelectorAll('[draggable="true"]');

					for (const el of draggables) {
						const rect = el.getBoundingClientRect();
						if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
							window.lastClickedElement = el.children[1].innerText;
						}
					}
				} catch (error) {}
			});
		}
	});

	if (!popup) return;

	const container = popup.m_popup.document.getElementById('popup_target');

	popup.m_popup.document.addEventListener('mousemove', (e) => {
		window.mouseX = e.clientX;
		window.mouseY = e.clientY;
	});

	const observer = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach((node) => {
					try {
						let NeedToAddConextMenuButtons = false;
						let NeedToAddAppPageButtons = false;

						let elementPossiblePlayButton = node.children[0].children[0];

						let elementsToSpawnAppPageButtons = [];

						if (node
							&& window.MainWindowBrowserManager?.m_lastLocation?.pathname
							&& window.MainWindowBrowserManager?.m_lastLocation?.pathname.match(/\/app\/(\d+)/)
						) {
							const elements = node.querySelectorAll('.SVGIcon_Settings');

							if (elements.length > 0) {
								NeedToAddAppPageButtons = true;
								elementsToSpawnAppPageButtons = elements;
							}
						}

						if (lastPage != window.MainWindowBrowserManager?.m_lastLocation?.pathname)
						{
							spawnedAppPageButtonsCount = 0;
						}

						lastPage = window.MainWindowBrowserManager?.m_lastLocation?.pathname;

						if (
							elementPossiblePlayButton.className.includes('Play') ||
							elementPossiblePlayButton.className.includes('Install') ||
							elementPossiblePlayButton.className.includes('Launch') ||
							elementPossiblePlayButton.className.includes('Update') ||
							elementPossiblePlayButton.className.includes('Cancel') ||
							elementPossiblePlayButton.className.includes('Download') ||
							elementPossiblePlayButton.className.includes('Pause') ||
							elementPossiblePlayButton.className.includes('Resume')
						) {
							NeedToAddConextMenuButtons = true;
						}

						if (window.lastClickedElement == '') 
							return;

						if (NeedToAddAppPageButtons){
							SpawnAppPageButtons(elementsToSpawnAppPageButtons, window.lastClickedElement);
						}

						if (NeedToAddConextMenuButtons){
							SpawnContextMenuButtons(popup, node, window.lastClickedElement);
						}
					} catch (error) {}
				});
			}
		}
	});

	observer.observe(container, {
		childList: true,
		subtree: true,
	});
}

async function OnPopupCreation(popup: any) {
	if (popup.m_strName === 'SP Desktop_uid0') {
		SyncLog('OnPopupCreation SP Desktop_uid0');
		popup_desktop = popup;
		SubscribeOnMutations(popup_desktop);
		RespawnTopButtons();
	}
	if (popup.m_strTitle === 'Store Supernav') {
		SyncLog('OnPopupCreation Store Supernav');
		popup_store_supernav = popup;
		RespawnStoreSupernavButtons();
	}

	SpawnPropertiesMenuButtons(popup);
}

//#region Settings

	type TopButtonSetting = {
		name: string;
		show_name: string;
		icon: string;
		show_icon: string;
		path_to_app: string;
	};

	type GenericButtonSetting = {
		name: string;
		format_game_name: string;
		add_arrow_icon: string;
		path_to_app: string;
	};

	type StoreSupernavButtonSetting = {
		name: string;
		add_arrow_icon: string;
		path_to_app: string;
	};

	type AppPageButtonSetting = {
		name: string;
		icon: string;
		format_game_name: string;
		path_to_app: string;
	};

	type SaveSnapshot = {
		topButtons: TopButtonSetting[];
		rightClickButtons: GenericButtonSetting[];
		dropDownItems: GenericButtonSetting[];
		gamePropertiesButtons: GenericButtonSetting[];
		storeSupernavButtons: StoreSupernavButtonSetting[];
		appPageButtons: AppPageButtonSetting[];
		dropDownName: string;
		dropDownAppendAfter: string;
		topButtonsStyle: string;
	};

	const buttonBackgroundStyle = {
		backgroundColor: '#21282f',
		padding: '7px',
		borderRadius: '8px',
		marginBottom: '10px',
	};

	function getSettingsDocument() {
		return popup_desktop?.m_popup?.document ?? document;
	}

	function getInputFromContainer(containerId: string): HTMLInputElement | null {
		const element = getSettingsDocument().getElementById(containerId);
		if (!element) return null;
		return element.querySelector('input');
	}

	function setTextFieldValue(containerId: string, value: string) {
		const input = getInputFromContainer(containerId);
		if (input) {
			input.value = value ?? '';
		}
	}

	function setToggleValue(containerId: string, value: string) {
		const input = getInputFromContainer(containerId);
		if (input) {
			input.checked = value === 'true';
		}
	}

	function getTextFieldValue(containerId: string, fallback: string = '') {
		const input = getInputFromContainer(containerId);
		return input ? input.value : fallback;
	}

	function getToggleValue(containerId: string, fallback: string = 'false') {
		const input = getInputFromContainer(containerId);
		return input ? input.checked.toString() : fallback;
	}

	function getTextAreaValue(elementId: string, fallback: string = '') {
		const element = getSettingsDocument().getElementById(elementId) as HTMLTextAreaElement | null;
		return element ? element.value : fallback;
	}

	function TrySetupSettings(settingsSnapshot: any) {
		settingsSnapshot.top_buttons.forEach((app: TopButtonSetting, index: number) => {
			setTextFieldValue(`top_buttons_name_${index}`, app.name);
			setToggleValue(`top_buttons_show_name_${index}`, app.show_name);
			setTextFieldValue(`top_buttons_icon_${index}`, app.icon);
			setToggleValue(`top_buttons_show_icon_${index}`, app.show_icon);
			setTextFieldValue(`top_buttons_path_to_app_${index}`, app.path_to_app);
		});

		settingsSnapshot.right_click_on_game_context_menu_buttons.forEach((app: GenericButtonSetting, index: number) => {
			setTextFieldValue(`right_click_on_game_context_menu_buttons_name_${index}`, app.name);
			setToggleValue(`right_click_on_game_context_menu_buttons_format_game_name_${index}`, app.format_game_name);
			setToggleValue(`right_click_on_game_context_menu_buttons_add_arrow_icon_${index}`, app.add_arrow_icon);
			setTextFieldValue(`right_click_on_game_context_menu_buttons_path_to_app_${index}`, app.path_to_app);
		});

		setTextFieldValue('drop_down_name_field', settingsSnapshot.right_click_on_game_context_menu_buttons_drop_down.name);
		setTextFieldValue('drop_down_append_after_field', settingsSnapshot.right_click_on_game_context_menu_buttons_drop_down.append_after_element_number);

		settingsSnapshot.right_click_on_game_context_menu_buttons_drop_down.items.forEach((app: GenericButtonSetting, index: number) => {
			setTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_name_${index}`, app.name);
			setToggleValue(`right_click_on_game_context_menu_buttons_drop_down_format_game_name_${index}`, app.format_game_name);
			setToggleValue(`right_click_on_game_context_menu_buttons_drop_down_add_arrow_icon_${index}`, app.add_arrow_icon);
			setTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_path_to_app_${index}`, app.path_to_app);
		});

		settingsSnapshot.game_properties_menu_buttons.forEach((app: GenericButtonSetting, index: number) => {
			setTextFieldValue(`game_properties_menu_buttons_name_${index}`, app.name);
			setToggleValue(`game_properties_menu_buttons_format_game_name_${index}`, app.format_game_name);
			setToggleValue(`game_properties_menu_buttons_add_arrow_icon_${index}`, app.add_arrow_icon);
			setTextFieldValue(`game_properties_menu_buttons_path_to_app_${index}`, app.path_to_app);
		});

		settingsSnapshot.store_supernav_buttons.forEach((app: StoreSupernavButtonSetting, index: number) => {
			setTextFieldValue(`store_supernav_buttons_name_${index}`, app.name);
			setToggleValue(`store_supernav_buttons_add_arrow_icon_${index}`, app.add_arrow_icon);
			setTextFieldValue(`store_supernav_buttons_path_to_app_${index}`, app.path_to_app);
		});

		settingsSnapshot.app_page_buttons.forEach((app: AppPageButtonSetting, index: number) => {
			setTextFieldValue(`app_page_buttons_name_${index}`, app.name);
			setTextFieldValue(`app_page_buttons_icon_${index}`, app.icon);
			setToggleValue(`app_page_buttons_format_game_name_${index}`, app.format_game_name);
			setTextFieldValue(`app_page_buttons_path_to_app_${index}`, app.path_to_app);
		});

		const topButtonsStyleInput = getSettingsDocument().getElementById('TopButtonsStyleInput') as HTMLTextAreaElement | null;
		if (topButtonsStyleInput) {
			topButtonsStyleInput.value = settingsSnapshot.top_buttons_style;
		}
	}

	const createDefaultTopButton = (): TopButtonSetting => ({
		name: 'Steam',
		show_name: 'true',
		icon: 'https://raw.githubusercontent.com/diemonic1/Custom-buttons/refs/heads/main/PUBLIC_ICONS/steam.png',
		show_icon: 'true',
		path_to_app: 'https://store.steampowered.com/',
	});

	const createDefaultGenericButton = (): GenericButtonSetting => ({
		name: 'SteamGridDB',
		format_game_name: 'true',
		add_arrow_icon: 'true',
		path_to_app: 'https://www.steamgriddb.com/search/grids?term=%GAME_NAME%',
	});

	const createDefaultStoreSupernavButton = (): StoreSupernavButtonSetting => ({
		name: 'Steam Sales',
		add_arrow_icon: 'true',
		path_to_app: 'https://steamdb.info/sales/history/',
	});

	const createDefaultAppPageButton = (): AppPageButtonSetting => ({
		name: 'Nexus Mods',
		icon: 'https://raw.githubusercontent.com/diemonic1/Custom-buttons/refs/heads/main/PUBLIC_ICONS/nexusMods.png',
		format_game_name: 'true',
		path_to_app: 'https://www.nexusmods.com/games?keyword=%GAME_NAME%&sort=downloads',
	});

	const SettingsContent = () => {
		const initialSettings = global_object_settings as any;
		const [infoMessage, setInfoMessage] = useState('');
		const [topButtons, setTopButtons] = useState<TopButtonSetting[]>(() => [...(initialSettings.top_buttons ?? [])]);
		const [rightClickButtons, setRightClickButtons] = useState<GenericButtonSetting[]>(() => [...(initialSettings.right_click_on_game_context_menu_buttons ?? [])]);
		const [dropDownItems, setDropDownItems] = useState<GenericButtonSetting[]>(() => [...(initialSettings.right_click_on_game_context_menu_buttons_drop_down?.items ?? [])]);
		const [gamePropertiesButtons, setGamePropertiesButtons] = useState<GenericButtonSetting[]>(() => [...(initialSettings.game_properties_menu_buttons ?? [])]);
		const [storeSupernavButtons, setStoreSupernavButtons] = useState<StoreSupernavButtonSetting[]>(() => [...(initialSettings.store_supernav_buttons ?? [])]);
		const [appPageButtons, setAppPageButtons] = useState<AppPageButtonSetting[]>(() => [...(initialSettings.app_page_buttons ?? [])]);
		const [dropDownName, setDropDownName] = useState(initialSettings.right_click_on_game_context_menu_buttons_drop_down?.name ?? 'Additional');
		const [dropDownAppendAfter, setDropDownAppendAfter] = useState(initialSettings.right_click_on_game_context_menu_buttons_drop_down?.append_after_element_number ?? '1');
		const [topButtonsStyle, setTopButtonsStyle] = useState(initialSettings.top_buttons_style ?? '');

		const preserveStaticFields = () => {
			setDropDownName(getTextFieldValue('drop_down_name_field', dropDownName));
			setDropDownAppendAfter(getTextFieldValue('drop_down_append_after_field', dropDownAppendAfter));
			setTopButtonsStyle(getTextAreaValue('TopButtonsStyleInput', topButtonsStyle));
		};

		const readTopButtonsFromDom = (): TopButtonSetting[] => {
			return topButtons.map((item, index) => ({
				name: getTextFieldValue(`top_buttons_name_${index}`, item.name),
				show_name: getToggleValue(`top_buttons_show_name_${index}`, item.show_name),
				icon: getTextFieldValue(`top_buttons_icon_${index}`, item.icon),
				show_icon: getToggleValue(`top_buttons_show_icon_${index}`, item.show_icon),
				path_to_app: getTextFieldValue(`top_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readRightClickButtonsFromDom = (): GenericButtonSetting[] => {
			return rightClickButtons.map((item, index) => ({
				name: getTextFieldValue(`right_click_on_game_context_menu_buttons_name_${index}`, item.name),
				format_game_name: getToggleValue(`right_click_on_game_context_menu_buttons_format_game_name_${index}`, item.format_game_name),
				add_arrow_icon: getToggleValue(`right_click_on_game_context_menu_buttons_add_arrow_icon_${index}`, item.add_arrow_icon),
				path_to_app: getTextFieldValue(`right_click_on_game_context_menu_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readDropDownItemsFromDom = (): GenericButtonSetting[] => {
			return dropDownItems.map((item, index) => ({
				name: getTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_name_${index}`, item.name),
				format_game_name: getToggleValue(`right_click_on_game_context_menu_buttons_drop_down_format_game_name_${index}`, item.format_game_name),
				add_arrow_icon: getToggleValue(`right_click_on_game_context_menu_buttons_drop_down_add_arrow_icon_${index}`, item.add_arrow_icon),
				path_to_app: getTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readGamePropertiesButtonsFromDom = (): GenericButtonSetting[] => {
			return gamePropertiesButtons.map((item, index) => ({
				name: getTextFieldValue(`game_properties_menu_buttons_name_${index}`, item.name),
				format_game_name: getToggleValue(`game_properties_menu_buttons_format_game_name_${index}`, item.format_game_name),
				add_arrow_icon: getToggleValue(`game_properties_menu_buttons_add_arrow_icon_${index}`, item.add_arrow_icon),
				path_to_app: getTextFieldValue(`game_properties_menu_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readStoreSupernavButtonsFromDom = (): StoreSupernavButtonSetting[] => {
			return storeSupernavButtons.map((item, index) => ({
				name: getTextFieldValue(`store_supernav_buttons_name_${index}`, item.name),
				add_arrow_icon: getToggleValue(`store_supernav_buttons_add_arrow_icon_${index}`, item.add_arrow_icon),
				path_to_app: getTextFieldValue(`store_supernav_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		const readAppPageButtonsFromDom = (): AppPageButtonSetting[] => {
			return appPageButtons.map((item, index) => ({
				name: getTextFieldValue(`app_page_buttons_name_${index}`, item.name),
				icon: getTextFieldValue(`app_page_buttons_icon_${index}`, item.icon),
				format_game_name: getToggleValue(`app_page_buttons_format_game_name_${index}`, item.format_game_name),
				path_to_app: getTextFieldValue(`app_page_buttons_path_to_app_${index}`, item.path_to_app),
			}));
		};

		useEffect(() => {
			const snapshot = {
				top_buttons: topButtons,
				right_click_on_game_context_menu_buttons: rightClickButtons,
				right_click_on_game_context_menu_buttons_drop_down: {
					name: dropDownName,
					append_after_element_number: dropDownAppendAfter,
					items: dropDownItems,
				},
				game_properties_menu_buttons: gamePropertiesButtons,
				store_supernav_buttons: storeSupernavButtons,
				app_page_buttons: appPageButtons,
				top_buttons_style: topButtonsStyle,
			};

			setTimeout(() => TrySetupSettings(snapshot), 50);
		}, [
			topButtons,
			rightClickButtons,
			dropDownItems,
			gamePropertiesButtons,
			storeSupernavButtons,
			appPageButtons,
			dropDownName,
			dropDownAppendAfter,
			topButtonsStyle,
		]);

		return (
			<>
				<button
					onClick={() => {
						SaveSettings(setInfoMessage, {
							topButtons: topButtons,
							rightClickButtons: rightClickButtons,
							dropDownItems: dropDownItems,
							gamePropertiesButtons: gamePropertiesButtons,
							storeSupernavButtons: storeSupernavButtons,
							appPageButtons: appPageButtons,
							dropDownName: dropDownName,
							dropDownAppendAfter: dropDownAppendAfter,
							topButtonsStyle: topButtonsStyle,
						});
					}}
					title="Save settings"
					style={{ marginTop: '6px', backgroundColor: '#8FFF83', border: '0px', borderRadius: '2px', width: '100%', height: '50px', cursor: 'pointer', fontSize: '23px', color: '#000' }}
				>
					Save settings
				</button>

				{infoMessage != '' && (
					<>
						<br></br>
						<div
							style={{
								width: '100%',
								height: 'auto',
								marginTop: '6px',
								fontSize: '23px',
								color: '#000',
								alignContent: 'center',
								backgroundColor: infoMessage == 'Success!' ? '#8FFF83' : '#ff8e8e',
							}}
						>
							{infoMessage}
						</div>
					</>
				)}

				<p>{GAME_NAME_PARAMETER_TIP}</p>

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(255, 202, 0, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<h3 style={{ margin: 0 }} title={GAME_NAME_PARAMETER_TIP}>Right click on game context menu buttons <span style={{ color: YELLOW_HIGHLIGHT_COLOR }}>*</span></h3>
						<button
							style={{ backgroundColor: '#d29cffff', cursor: 'pointer', borderRadius: '10px', scale: '1.4', marginBottom: '10px' }}
							onClick={() => {
								preserveStaticFields();
								setRightClickButtons([...readRightClickButtonsFromDom(), createDefaultGenericButton()]);
							}}
							title="Add right click on game context menu button"
						>
							+
						</button>
					</div>

					{rightClickButtons.map((item, index) => (
						<div key={`right-click-${index}`} style={buttonBackgroundStyle}>
							<div style={{ textAlign: 'center' }} title="Right click on game context menu buttons">Button Number: {index + 1}</div>
							<div id={`right_click_on_game_context_menu_buttons_name_${index}`}>
								<TextField label="Name" description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_format_game_name_${index}`} title={BUTTON_FORMAT_GAME_NAME_TIP}>
								<Field label="Format game name">
									<Toggle
										value={item.format_game_name === 'true'}
										onChange={(checked) => {
											setRightClickButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, format_game_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_add_arrow_icon_${index}`} title={BUTTON_ADD_ARROW_ICON_TIP}>
								<Field label="Add arrow icon">
									<Toggle
										value={item.add_arrow_icon === 'true'}
										onChange={(checked) => {
											setRightClickButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, add_arrow_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_path_to_app_${index}`}>
								<TextField label="URL or App Path" description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div style={{ textAlign: 'center' }}>
								<button
									style={{ cursor: 'pointer', marginTop: '6px', backgroundColor: 'rgb(255 74 74)', border: '0px', borderRadius: '6px' }}
									onClick={() => {
										preserveStaticFields();
										const current = readRightClickButtonsFromDom();
										current.splice(index, 1);
										setRightClickButtons(current);
									}}
								>
									delete this button
								</button>
							</div>
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(255, 0, 0, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<h3 style={{ margin: 0 }} title={GAME_NAME_PARAMETER_TIP}>Right click on game context menu buttons in drop down <span style={{ color: YELLOW_HIGHLIGHT_COLOR }}>*</span></h3>
						<button
							style={{ backgroundColor: '#d29cffff', cursor: 'pointer', borderRadius: '10px', scale: '1.4', marginBottom: '10px' }}
							onClick={() => {
								preserveStaticFields();
								setDropDownItems([...readDropDownItemsFromDom(), createDefaultGenericButton()]);
							}}
							title="Add right click on game context menu button in drop down"
						>
							+
						</button>
					</div>

					{dropDownItems.map((item, index) => (
						<div key={`drop-down-${index}`} style={buttonBackgroundStyle}>
							<div style={{ textAlign: 'center' }} title="Right click on game context menu buttons in drop down">Button Number: {index + 1}</div>
							<div id={`right_click_on_game_context_menu_buttons_drop_down_name_${index}`}>
								<TextField label="Name" description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_drop_down_format_game_name_${index}`} title={BUTTON_FORMAT_GAME_NAME_TIP}>
								<Field label="Format game name">
									<Toggle
										value={item.format_game_name === 'true'}
										onChange={(checked) => {
											setDropDownItems((prev) => prev.map((curr, i) => i === index ? { ...curr, format_game_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_drop_down_add_arrow_icon_${index}`} title={BUTTON_ADD_ARROW_ICON_TIP}>							
								<Field label="Add arrow icon">
									<Toggle
										value={item.add_arrow_icon === 'true'}
										onChange={(checked) => {
											setDropDownItems((prev) => prev.map((curr, i) => i === index ? { ...curr, add_arrow_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`right_click_on_game_context_menu_buttons_drop_down_path_to_app_${index}`}>
								<TextField label="URL or App Path" description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div style={{ textAlign: 'center' }}>
								<button
									style={{ cursor: 'pointer', marginTop: '6px', backgroundColor: 'rgb(255 74 74)', border: '0px', borderRadius: '6px' }}
									onClick={() => {
										preserveStaticFields();
										const current = readDropDownItemsFromDom();
										current.splice(index, 1);
										setDropDownItems(current);
									}}
								>
									delete this button
								</button>
							</div>
						</div>
					))}

					<PanelSection title={DROPDOWN_MENU_SETTINGS}>
						<div id="drop_down_name_field">
							<TextField label="Name" description="Name for the drop-down menu section" />
						</div>
						<div id="drop_down_append_after_field">
							<TextField
								label="Append after"
								description="After which element should the menu be inserted"
								mustBeNumeric={true}
								rangeMin={1}
								rangeMax={7}
							/>
						</div>
					</PanelSection>
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(61, 255, 0, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<h3 style={{ margin: 0 }} title={GAME_NAME_PARAMETER_TIP}>Game properties menu buttons <span style={{ color: YELLOW_HIGHLIGHT_COLOR }}>*</span></h3>
						<button
							style={{ backgroundColor: '#d29cffff', cursor: 'pointer', borderRadius: '10px', scale: '1.4', marginBottom: '10px' }}
							onClick={() => {
								preserveStaticFields();
								setGamePropertiesButtons([...readGamePropertiesButtonsFromDom(), createDefaultGenericButton()]);
							}}
							title="Add game properties menu buttons"
						>
							+
						</button>
					</div>

					{gamePropertiesButtons.map((item, index) => (
						<div key={`game-properties-${index}`} style={buttonBackgroundStyle}>
							<div style={{ textAlign: 'center' }} title="Game properties menu buttons">Button Number: {index + 1}</div>
							<div id={`game_properties_menu_buttons_name_${index}`}>
								<TextField label="Name" description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`game_properties_menu_buttons_format_game_name_${index}`} title={BUTTON_FORMAT_GAME_NAME_TIP}>
								<Field label="Format game name">
									<Toggle
										value={item.format_game_name === 'true'}
										onChange={(checked) => {
											setGamePropertiesButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, format_game_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`game_properties_menu_buttons_add_arrow_icon_${index}`} title={BUTTON_ADD_ARROW_ICON_TIP}>
								<Field label="Add arrow icon">
									<Toggle
										value={item.add_arrow_icon === 'true'}
										onChange={(checked) => {
											setGamePropertiesButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, add_arrow_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`game_properties_menu_buttons_path_to_app_${index}`}>
								<TextField label="URL or App Path" description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div style={{ textAlign: 'center' }}>
								<button
									style={{ cursor: 'pointer', marginTop: '6px', backgroundColor: 'rgb(255 74 74)', border: '0px', borderRadius: '6px' }}
									onClick={() => {
										preserveStaticFields();
										const current = readGamePropertiesButtonsFromDom();
										current.splice(index, 1);
										setGamePropertiesButtons(current);
									}}
								>
									delete this button
								</button>
							</div>
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(0, 255, 202, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<h3 style={{ margin: 0 }}>Top Buttons</h3>
						<button
							style={{ backgroundColor: '#d29cffff', cursor: 'pointer', borderRadius: '10px', scale: '1.4', marginBottom: '10px' }}
							onClick={() => {
								preserveStaticFields();
								setTopButtons([...readTopButtonsFromDom(), createDefaultTopButton()]);
							}}
							title="Add top button"
						>
							+
						</button>
					</div>

					{topButtons.map((item, index) => (
						<div key={`top-buttons-${index}`} style={buttonBackgroundStyle}>
							<div style={{ textAlign: 'center' }} title="Top buttons">Button Number: {index + 1}</div>
							<div id={`top_buttons_name_${index}`}>
								<TextField label="Name" description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`top_buttons_show_name_${index}`} title={BUTTON_SHOW_NAME_TIP}>
								<Field label="Show name">
									<Toggle
										value={item.show_name === 'true'}
										onChange={(checked) => {
											setTopButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, show_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`top_buttons_icon_${index}`}>
								<TextField label="Icon" description={BUTTON_ICON_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`top_buttons_show_icon_${index}`} title={BUTTON_SHOW_ICON_TIP}>
								<Field label="Show icon">
									<Toggle
										value={item.show_icon === 'true'}
										onChange={(checked) => {
											setTopButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, show_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`top_buttons_path_to_app_${index}`}>
								<TextField label="URL or App Path" description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div style={{ textAlign: 'center' }}>
								<button
									style={{ cursor: 'pointer', marginTop: '6px', backgroundColor: 'rgb(255 74 74)', border: '0px', borderRadius: '6px' }}
									onClick={() => {
										preserveStaticFields();
										const current = readTopButtonsFromDom();
										current.splice(index, 1);
										setTopButtons(current);
									}}
								>
									delete this button
								</button>
							</div>
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(230, 0, 255, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<h3 style={{ margin: 0 }}>Store supernav buttons</h3>
						<button
							style={{ backgroundColor: '#d29cffff', cursor: 'pointer', borderRadius: '10px', scale: '1.4', marginBottom: '10px' }}
							onClick={() => {
								preserveStaticFields();
								setStoreSupernavButtons([...readStoreSupernavButtonsFromDom(), createDefaultStoreSupernavButton()]);
							}}
							title="Add store supernav buttons"
						>
							+
						</button>
					</div>

					{storeSupernavButtons.map((item, index) => (
						<div key={`store-supernav-${index}`} style={buttonBackgroundStyle}>
							<div style={{ textAlign: 'center' }} title="Store supernav buttons">Button Number: {index + 1}</div>
							<div id={`store_supernav_buttons_name_${index}`}>
								<TextField label="Name" description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`store_supernav_buttons_add_arrow_icon_${index}`} title={BUTTON_ADD_ARROW_ICON_TIP}>
								<Field label="Add arrow icon">
									<Toggle
										value={item.add_arrow_icon === 'true'}
										onChange={(checked) => {
											setStoreSupernavButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, add_arrow_icon: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`store_supernav_buttons_path_to_app_${index}`}>
								<TextField label="URL or App Path" description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div style={{ textAlign: 'center' }}>
								<button
									style={{ cursor: 'pointer', marginTop: '6px', backgroundColor: 'rgb(255 74 74)', border: '0px', borderRadius: '6px' }}
									onClick={() => {
										preserveStaticFields();
										const current = readStoreSupernavButtonsFromDom();
										current.splice(index, 1);
										setStoreSupernavButtons(current);
									}}
								>
									delete this button
								</button>
							</div>
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<div style={{ backgroundColor: "rgba(0, 123, 255, 0.05)", padding: '0px 5px', borderRadius: '8px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<h3 style={{ margin: 0 }} title={GAME_NAME_PARAMETER_TIP}>App page Buttons <span style={{ color: YELLOW_HIGHLIGHT_COLOR }}>*</span></h3>
						<button
							style={{ backgroundColor: '#d29cffff', cursor: 'pointer', borderRadius: '10px', scale: '1.4', marginBottom: '10px' }}
							onClick={() => {
								preserveStaticFields();
								setAppPageButtons([...readAppPageButtonsFromDom(), createDefaultAppPageButton()]);
							}}
							title="Add app page button"
						>
							+
						</button>
					</div>

					{appPageButtons.map((item, index) => (
						<div key={`app-page-${index}`} style={buttonBackgroundStyle}>
							<div style={{ textAlign: 'center' }} title="App page buttons">Button Number: {index + 1}</div>
							<div id={`app_page_buttons_name_${index}`}>
								<TextField label="Name" description={BUTTON_NAME_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`app_page_buttons_icon_${index}`}>
								<TextField label="Icon" description={BUTTON_ICON_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`app_page_buttons_format_game_name_${index}`} title={BUTTON_FORMAT_GAME_NAME_TIP}>
								<Field label="Format game name">
									<Toggle
										value={item.format_game_name === 'true'}
										onChange={(checked) => {
											setAppPageButtons((prev) => prev.map((curr, i) => i === index ? { ...curr, format_game_name: checked.toString() } : curr));
										}}
									/>
								</Field>
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div id={`app_page_buttons_path_to_app_${index}`}>
								<TextField label="URL or App Path" description={BUTTON_PATH_TO_APP_TIP} />
							</div>
							<div style={{ minHeight: '2px', backgroundColor: '#4a545d', margin: '3px 0px', borderRadius: '5px' }} />
							<div style={{ textAlign: 'center' }}>
								<button
									style={{ cursor: 'pointer', marginTop: '6px', backgroundColor: 'rgb(255 74 74)', border: '0px', borderRadius: '6px' }}
									onClick={() => {
										preserveStaticFields();
										const current = readAppPageButtonsFromDom();
										current.splice(index, 1);
										setAppPageButtons(current);
									}}
								>
									delete this button
								</button>
							</div>
						</div>
					))}
				</div>

				<div style={{ minHeight: '6px', backgroundColor: '#4a545d', margin: '8px 0px', borderRadius: '5px' }} />

				<br></br>
				<br></br>

				<h2 style={{ margin: '0px' }}>Top Buttons style</h2>
				<p>CSS style for the top buttons. You can copy it to another editor, modify it as you wish, and paste it back here.</p>
				<textarea 
					id="TopButtonsStyleInput" 
					style={{ 
						width: '94%', 
						minHeight: '150px', 
						padding: '4px 8px', 
						fontSize: '12px',
						backgroundColor: '#2e343b',
						borderRadius: '6px',
						border: '0px',
						color: '#ffffff',
						resize: 'none'
					}}>
				</textarea>
			</>
		);
	};

async function SaveSettings(setInfoMessage: Function, snapshot: SaveSnapshot) {
	setInfoMessage('');

	try {
		SyncLog('Save Settings');

		let result: any = {};

		let result_top_buttons: TopButtonSetting[] = [];
		for (let index = 0; index < snapshot.topButtons.length; index++) {
			result_top_buttons.push({
				name: getTextFieldValue(`top_buttons_name_${index}`, snapshot.topButtons[index].name),
				show_name: snapshot.topButtons[index].show_name,
				icon: getTextFieldValue(`top_buttons_icon_${index}`, snapshot.topButtons[index].icon),
				show_icon: snapshot.topButtons[index].show_icon,
				path_to_app: getTextFieldValue(`top_buttons_path_to_app_${index}`, snapshot.topButtons[index].path_to_app),
			});
		}
		result['top_buttons'] = result_top_buttons;

		let result_right_click_on_game_context_menu_buttons: GenericButtonSetting[] = [];
		for (let index = 0; index < snapshot.rightClickButtons.length; index++) {
			result_right_click_on_game_context_menu_buttons.push({
				name: getTextFieldValue(`right_click_on_game_context_menu_buttons_name_${index}`, snapshot.rightClickButtons[index].name),
				format_game_name: snapshot.rightClickButtons[index].format_game_name,
				add_arrow_icon: snapshot.rightClickButtons[index].add_arrow_icon,
				path_to_app: getTextFieldValue(`right_click_on_game_context_menu_buttons_path_to_app_${index}`, snapshot.rightClickButtons[index].path_to_app),
			});
		}
		result['right_click_on_game_context_menu_buttons'] = result_right_click_on_game_context_menu_buttons;

		let result_right_click_on_game_context_menu_buttons_drop_down: GenericButtonSetting[] = [];
		for (let index = 0; index < snapshot.dropDownItems.length; index++) {
			result_right_click_on_game_context_menu_buttons_drop_down.push({
				name: getTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_name_${index}`, snapshot.dropDownItems[index].name),
				format_game_name: snapshot.dropDownItems[index].format_game_name,
				add_arrow_icon: snapshot.dropDownItems[index].add_arrow_icon,
				path_to_app: getTextFieldValue(`right_click_on_game_context_menu_buttons_drop_down_path_to_app_${index}`, snapshot.dropDownItems[index].path_to_app),
			});
		}

		result['right_click_on_game_context_menu_buttons_drop_down'] = {
			name: getTextFieldValue('drop_down_name_field', snapshot.dropDownName),
			append_after_element_number: getTextFieldValue('drop_down_append_after_field', snapshot.dropDownAppendAfter),
			items: result_right_click_on_game_context_menu_buttons_drop_down,
		};

		let result_game_properties_menu_buttons: GenericButtonSetting[] = [];
		for (let index = 0; index < snapshot.gamePropertiesButtons.length; index++) {
			result_game_properties_menu_buttons.push({
				name: getTextFieldValue(`game_properties_menu_buttons_name_${index}`, snapshot.gamePropertiesButtons[index].name),
				format_game_name: snapshot.gamePropertiesButtons[index].format_game_name,
				add_arrow_icon: snapshot.gamePropertiesButtons[index].add_arrow_icon,
				path_to_app: getTextFieldValue(`game_properties_menu_buttons_path_to_app_${index}`, snapshot.gamePropertiesButtons[index].path_to_app),
			});
		}
		result['game_properties_menu_buttons'] = result_game_properties_menu_buttons;

		let result_store_supernav_buttons: StoreSupernavButtonSetting[] = [];
		for (let index = 0; index < snapshot.storeSupernavButtons.length; index++) {
			result_store_supernav_buttons.push({
				name: getTextFieldValue(`store_supernav_buttons_name_${index}`, snapshot.storeSupernavButtons[index].name),
				add_arrow_icon: snapshot.storeSupernavButtons[index].add_arrow_icon,
				path_to_app: getTextFieldValue(`store_supernav_buttons_path_to_app_${index}`, snapshot.storeSupernavButtons[index].path_to_app),
			});
		}
		result['store_supernav_buttons'] = result_store_supernav_buttons;

		let result_app_page_buttons: AppPageButtonSetting[] = [];
		for (let index = 0; index < snapshot.appPageButtons.length; index++) {
			result_app_page_buttons.push({
				name: getTextFieldValue(`app_page_buttons_name_${index}`, snapshot.appPageButtons[index].name),
				icon: getTextFieldValue(`app_page_buttons_icon_${index}`, snapshot.appPageButtons[index].icon),
				format_game_name: snapshot.appPageButtons[index].format_game_name,
				path_to_app: getTextFieldValue(`app_page_buttons_path_to_app_${index}`, snapshot.appPageButtons[index].path_to_app),
			});
		}
		result['app_page_buttons'] = result_app_page_buttons;

		result['top_buttons_style'] = getTextAreaValue('TopButtonsStyleInput', snapshot.topButtonsStyle);

		const jsonString = JSON.stringify(result);
		SyncLog('Settings Saved');
		SyncLog(jsonString);

		saveSettings({ ...getSettings(), settings_json: jsonString });
		global_object_settings = result;
		RespawnTopButtons();
		RespawnStoreSupernavButtons();

		await sleep(500);
		setInfoMessage('Success!');
	} catch (error) {
		setInfoMessage(error);
	}
}

//#endregion

export default definePlugin(() => {
	const settings = getSettings();
	global_object_settings = JSON.parse(settings.settings_json);

	Millennium.AddWindowCreateHook(OnPopupCreation);

	return {
		title: 'Custom Buttons',
		icon: <IconsModule.Settings />,
		content: <SettingsContent />,
	};
});

