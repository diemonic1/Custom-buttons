import { Millennium, IconsModule, definePlugin, callable, Field } from '@steambrew/client';
import { getSettings, saveSettings } from './services/settings';
import { useState, useEffect } from 'react';

const WaitForElement = async (sel: string, parent = document) => [...(await Millennium.findElement(parent, sel))][0];

const print_log = callable<[{ text: string }], string>('print_log');
const print_error = callable<[{ text: string }], string>('print_error');

const GAME_NAME_PARAMETER = "%GAME_NAME%";
const YELLOW_HIGHLIGHT_COLOR = "#ffcc32";

const GAME_NAME_PARAMETER_TIP = 'For button sections marked with * sign, the ' + GAME_NAME_PARAMETER + ' parameter can be used in the button name and URL. It will be replaced to the name of the game for which the button was called. For example: https://www.google.com/search?q=' + GAME_NAME_PARAMETER + ' → https://www.google.com/search?q=Subnautica';
const BUTTON_NAME_TIP = "The name that will be displayed on the button";
const BUTTON_SHOW_NAME_TIP = "Should the button's name be shown on it?";
const BUTTON_ICON_TIP = "URL of the icon that will be displayed on the button";
const BUTTON_SHOW_ICON_TIP = "Should the button's icon be shown on it?";
const BUTTON_PATH_TO_APP_TIP = "The URL to open when the button is clicked";
const BUTTON_FORMAT_GAME_NAME_TIP = "Does the game name need to be formatted when it is inserted into a parameter " + GAME_NAME_PARAMETER + ". Formatting replaces spaces and slashes with + signs, which is convenient for opening URLs in a browser.";
const BUTTON_ADD_ARROW_ICON_TIP = "Whether to add an arrow icon to the button";

let __idCounter = 0;

window.mouseX = 0;
window.mouseY = 0;

let global_object_settings = '';
let popup_desktop = undefined;
let popup_store_supernav = undefined;

let spawned_top_buttons_to_delete_on_respawn = [];
let spawned_store_supernav_buttons_to_delete_on_respawn = [];

async function call_back(app_path: string){
	if (app_path.includes("http")){
    	return SteamClient.System.OpenInSystemBrowser(app_path);
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

//#region SpawnConextMenuButtons

async function SpawnConextMenuButtons(popup: any) {
	if (!popup) return;

	if (global_object_settings.right_click_on_game_context_menu_buttons.length <= 0 && global_object_settings.right_click_on_game_context_menu_buttons_drop_down.items.length <= 0) return;

	SyncLog('try to spawn ConextMenu Buttons');
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
						let elementPossiblePlayButton = node.children[0].children[0];

						if (
							!elementPossiblePlayButton.className.includes('Play') &&
							!elementPossiblePlayButton.className.includes('Install') &&
							!elementPossiblePlayButton.className.includes('Launch') &&
							!elementPossiblePlayButton.className.includes('Update') &&
							!elementPossiblePlayButton.className.includes('Cancel') &&
							!elementPossiblePlayButton.className.includes('Download') &&
							!elementPossiblePlayButton.className.includes('Pause') &&
							!elementPossiblePlayButton.className.includes('Resume')
						) {
							return;
						}

						const draggables = container.querySelectorAll('[draggable="true"]');

						if (!draggables) return;

						const x = window.mouseX;
						const y = window.mouseY;

						let lastClickedElement = '';

						for (const el of draggables) {
							const rect = el.getBoundingClientRect();
							if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
								SyncLog('element was clicked : ' + el.children[1].innerText);
								lastClickedElement = el.children[1].innerText;
							}
						}

						if (lastClickedElement == '') return;

						// just buttons
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
								SyncLog('added node in ConextMenu');
							});
						}

						// buttons in drop down menu
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
								SyncLog('added node in ConextMenu');
							});
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

async function OnPopupCreation(popup: any) {
	if (popup.m_strName === 'SP Desktop_uid0') {
		SyncLog('OnPopupCreation SP Desktop_uid0');
		popup_desktop = popup;
		SpawnConextMenuButtons(popup_desktop);
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

const SettingsContent = () => {
	const [infoMessage, setInfoMessage] = useState("");

	useEffect(() => {
		setTimeout(TrySetupSettings, 100);
	}, []);

	return (
		<>
			<button 
				onClick={() => {SaveSettings(setInfoMessage)}} 
				title="Save settings"
				style={{marginTop: "6px", backgroundColor: "#8FFF83", 
					border: "0px", borderRadius: "2px", width: "100%", 
					height: "50px", cursor: "pointer", fontSize: "23px", color: "#000"}}
			>Save settings</button>

			{
				infoMessage != "" &&
				<>
					<br></br>
					<div
						style={{ width: "100%", height: "auto", marginTop: "6px", 
							fontSize: "23px", color: "#000", alignContent: "center",
							backgroundColor: infoMessage == "Success!" ? "#8FFF83" : "#ff8e8e"
						}}
					>
						{infoMessage}
					</div>
				</>
			}

			<p>{GAME_NAME_PARAMETER_TIP}</p>

			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<h1 style={{ margin: 0 }} title={GAME_NAME_PARAMETER_TIP}>Right click on game context menu buttons <span style={{color: YELLOW_HIGHLIGHT_COLOR }}>*</span></h1>
				<button style={{ backgroundColor: "#d29cffff", cursor: "pointer", borderRadius: "10px", scale: "1.4" }} onClick={SpawnRightClickOnGameContextMenuButtonsSettingsElement} title="Add right click on game context menu button">+</button>
			</div>

			<div id="right_click_on_game_context_menu_buttons_settings_handler"></div>

			<div style={{ height: "6px", backgroundColor: "#4a545d", margin: "8px 0px", borderRadius: "5px" }}/>

			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<h1 style={{ margin: 0 }} title={GAME_NAME_PARAMETER_TIP}>Right click on game context menu buttons in drop down <span style={{color: YELLOW_HIGHLIGHT_COLOR }}>*</span></h1>
				<button style={{ backgroundColor: "#d29cffff", cursor: "pointer", borderRadius: "10px", scale: "1.4" }} onClick={SpawnRightClickOnGameContextMenuButtonsDropDownSettingsElement} title="Add right click on game context menu button in drop down">+</button>
			</div>

			<Field label="Name" description="Name for the drop-down menu section" bottomSeparator="standard">
			<input
				type="text"
				id="drop_down_name"
				style={{ width: '200px', padding: '4px 8px' }}
				required
			/>
			</Field>

			<Field label="Append after" description="After which element should the menu be inserted" bottomSeparator="standard">
			<input
				type="number"
				id="drop_down_append_after"
				min={1}
				max={7}
				style={{ width: '60px', padding: '4px 8px' }}
				required
			/>
			</Field>

			<div id="right_click_on_game_context_menu_buttons_drop_down_settings_handler"></div>

			<div style={{ height: "6px", backgroundColor: "#4a545d", margin: "8px 0px", borderRadius: "5px" }}/>

			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<h1 style={{ margin: 0 }} title={GAME_NAME_PARAMETER_TIP}>Game properties menu buttons <span style={{color: YELLOW_HIGHLIGHT_COLOR }}>*</span></h1>
				<button style={{ backgroundColor: "#d29cffff", cursor: "pointer", borderRadius: "10px", scale: "1.4" }} onClick={SpawnGamePropertiesMenuButtonsSettingsElement} title="Add game properties menu buttons">+</button>
			</div>

			<div id="game_properties_menu_buttons_settings_handler"></div>
			
			<div style={{ height: "6px", backgroundColor: "#4a545d", margin: "8px 0px", borderRadius: "5px" }}/>

			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<h1 style={{ margin: 0 }}>Top Buttons</h1>
				<button style={{ backgroundColor: "#d29cffff", cursor: "pointer", borderRadius: "10px", scale: "1.4" }} onClick={SpawnTopButtonSettingsElement} title="Add top button">+</button>
			</div>

			<div id="top_buttons_settings_handler"></div>

			<div style={{ height: "6px", backgroundColor: "#4a545d", margin: "8px 0px", borderRadius: "5px" }}/>

			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<h1 style={{ margin: 0 }}>Store supernav buttons</h1>
				<button style={{ backgroundColor: "#d29cffff", cursor: "pointer", borderRadius: "10px", scale: "1.4" }} onClick={SpawnStoreSupernavButtonsSettingsElement} title="Add store supernav buttons">+</button>
			</div>

			<div id="store_supernav_buttons_settings_handler"></div>

			<div style={{ height: "6px", backgroundColor: "#4a545d", margin: "8px 0px", borderRadius: "5px" }}/>

			<h2 style={{ margin: "0px" }}>Top Buttons style</h2>
			<p>CSS style for the top buttons. You can copy it to another editor, modify it as you wish, and paste it back here.</p>
			<textarea 
				id="TopButtonsStyleInput"
				style={{ width: '100%', height: "100px", padding: '4px 8px' }}
			>
			</textarea>
		</>
	);
};

function TrySetupSettings(){
	global_object_settings.top_buttons.forEach((app: any, index: number) => {
		SpawnTopButtonSettingsElement(app);
	})

	global_object_settings.right_click_on_game_context_menu_buttons.forEach((app: any, index: number) => {
		SpawnRightClickOnGameContextMenuButtonsSettingsElement(app);
	})
	
	let element = popup_desktop.m_popup.document.getElementById("drop_down_name");

	if (element) {
		element.value = global_object_settings.right_click_on_game_context_menu_buttons_drop_down.name;
	}

	element = popup_desktop.m_popup.document.getElementById("drop_down_append_after");

	if (element) {
		element.value = global_object_settings.right_click_on_game_context_menu_buttons_drop_down.append_after_element_number;
	}

	element = popup_desktop.m_popup.document.getElementById("TopButtonsStyleInput");

	if (element) {
		element.value = global_object_settings.top_buttons_style;
	}

	global_object_settings.right_click_on_game_context_menu_buttons_drop_down.items.forEach((app: any, index: number) => {
		SpawnRightClickOnGameContextMenuButtonsDropDownSettingsElement(app);
	})

	global_object_settings.game_properties_menu_buttons.forEach((app: any, index: number) => {
		SpawnGamePropertiesMenuButtonsSettingsElement(app);
	})

	global_object_settings.store_supernav_buttons.forEach((app: any, index: number) => {
		SpawnStoreSupernavButtonsSettingsElement(app);
	})
}

function SpawnTopButtonSettingsElement(app: any = undefined){
	if (app.name == undefined){
		app = {
			name: "Steam",
            show_name: "true",
            icon: "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steam.png",
            show_icon: "true",
            path_to_app: "https://store.steampowered.com/"
		}
	}

	const top_buttons_settings_handler = popup_desktop.m_popup.document.getElementById("top_buttons_settings_handler");
	
	const newElement = popup_desktop.m_popup.document.createElement('div');

	const id = generateId();

	newElement.id = "top_buttons_settings_element_" + id;
	newElement.innerHTML = `
		<div class="top_buttons_settings_item">
			<span title="` + BUTTON_NAME_TIP + `">
				<span>Name</span>
				<input type="text" name="name" value="${app.name}" style="width:220px;padding:4px 8px" />
			</span>
			<br>

			<span title="` + BUTTON_SHOW_NAME_TIP + `">
				<span>Show name</span>
				<input type="checkbox" name="show_name" ${app.show_name === "true" ? "checked" : ""} />
			</span>
			<br>

			<span title="` + BUTTON_ICON_TIP + `">
				<span>Icon</span>
				<input type="text" name="icon" value="${app.icon}" style="width:220px;padding:4px 8px" />
			</span>
			<br>

			<span title="` + BUTTON_SHOW_ICON_TIP + `">
				<span>Show icon</span>
				<input type="checkbox" name="show_icon" ${app.show_icon === "true" ? "checked" : ""} />
			</span>
			<br>

			<span title="` + BUTTON_PATH_TO_APP_TIP + `">
				<span>URL</span>
				<input type="text" name="path_to_app" value="${app.path_to_app}" style="width:220px;padding:4px 8px" />
			</span>
			<br>
			<center><button style="cursor: pointer; margin-top: 6px; background-color: rgb(255 74 74); border: 0px; border-radius: 6px;" id="` + id + `_deleteButton">delete this button</button></center>
		</div>
		<div style="height: 3px; background-color: #4a545d; margin: 8px 0px; border-radius: 5px;"/>
	`;

	top_buttons_settings_handler.appendChild(newElement);

	popup_desktop.m_popup.document.getElementById(id + "_deleteButton")
		.addEventListener('click', function (event) {
				DeleteObject("top_buttons_settings_element_" + id);
			});
}

function SpawnRightClickOnGameContextMenuButtonsSettingsElement(app: any = undefined){
	if (app.name == undefined){
		app = {
			name: "SteamGridDB",
            format_game_name: "true",
			add_arrow_icon: "true",
            path_to_app: "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
		}
	}

	const right_click_on_game_context_menu_buttons_settings_handler = popup_desktop.m_popup.document.getElementById("right_click_on_game_context_menu_buttons_settings_handler");
	
	const newElement = popup_desktop.m_popup.document.createElement('div');

	const id = generateId();

	newElement.id = "right_click_on_game_context_menu_buttons_settings_element_" + id;
	newElement.innerHTML = `
		<div class="right_click_on_game_context_menu_buttons_settings_item">
			<span title="` + BUTTON_NAME_TIP + `">
				<span>Name</span>
				<input
					type="text"
					name="name"
					value="` + app.name + `"
					style="width: 220px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_FORMAT_GAME_NAME_TIP + `">
				<span>Format game name</span>
				<input
					type="checkbox"
					name="format_game_name"
					${app.format_game_name === "true" ? "checked" : ""}
					style="width: 40px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_ADD_ARROW_ICON_TIP + `">
				<span>Add arrow icon</span>
				<input
					type="checkbox"
					name="add_arrow_icon"
					${app.add_arrow_icon === "true" ? "checked" : ""}
					style="width: 40px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_PATH_TO_APP_TIP + `">
				<span>URL</span>
				<input
					type="text"
					name="path_to_app"
					value="` + app.path_to_app + `"
					style="width: 220px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<center><button style="cursor: pointer; margin-top: 6px; background-color: rgb(255 74 74); border: 0px; border-radius: 6px;" id="` + id + `_deleteButton">delete this button</button></center>
		</div>
		<div style="height: 3px; background-color: #4a545d; margin: 8px 0px; border-radius: 5px;"/>
	`;

	right_click_on_game_context_menu_buttons_settings_handler.appendChild(newElement);

	popup_desktop.m_popup.document.getElementById(id + "_deleteButton")
		.addEventListener('click', function (event) {
				DeleteObject("right_click_on_game_context_menu_buttons_settings_element_" + id);
			});
}

function SpawnRightClickOnGameContextMenuButtonsDropDownSettingsElement(app: any = undefined){
	if (app.name == undefined){
		app = {
			name: "SteamGridDB",
            format_game_name: "true",
			add_arrow_icon: "true",
            path_to_app: "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
		}
	}

	const right_click_on_game_context_menu_buttons_drop_down_settings_handler = popup_desktop.m_popup.document.getElementById("right_click_on_game_context_menu_buttons_drop_down_settings_handler");
	
	const newElement = popup_desktop.m_popup.document.createElement('div');

	const id = generateId();

	newElement.id = "right_click_on_game_context_menu_buttons_drop_down_settings_element_" + id;
	newElement.innerHTML = `
		<div class="right_click_on_game_context_menu_buttons_drop_down_settings_item">
			<span title="` + BUTTON_NAME_TIP + `">
				<span>Name</span>
				<input
					type="text"
					name="name"
					value="` + app.name + `"
					style="width: 220px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_FORMAT_GAME_NAME_TIP + `">
				<span>Format game name</span>
				<input
					type="checkbox"
					name="format_game_name"
					${app.format_game_name === "true" ? "checked" : ""}
					style="width: 40px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_ADD_ARROW_ICON_TIP + `">
				<span>Add arrow icon</span>
				<input
					type="checkbox"
					name="add_arrow_icon"
					${app.add_arrow_icon === "true" ? "checked" : ""}
					style="width: 40px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_PATH_TO_APP_TIP + `">
				<span>URL</span>
				<input
					type="text"
					name="path_to_app"
					value="` + app.path_to_app + `"
					style="width: 220px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<center><button style="cursor: pointer; margin-top: 6px; background-color: rgb(255 74 74); border: 0px; border-radius: 6px;" id="` + id + `_deleteButton">delete this button</button></center>
		</div>
		<div style="height: 3px; background-color: #4a545d; margin: 8px 0px; border-radius: 5px;"/>
	`;

	right_click_on_game_context_menu_buttons_drop_down_settings_handler.appendChild(newElement);

	popup_desktop.m_popup.document.getElementById(id + "_deleteButton")
		.addEventListener('click', function (event) {
				DeleteObject("right_click_on_game_context_menu_buttons_drop_down_settings_element_" + id);
			});	
}

function SpawnGamePropertiesMenuButtonsSettingsElement(app: any = undefined){
	if (app.name == undefined){
		app = {
			name: "SteamGridDB",
            format_game_name: "true",
			add_arrow_icon: "true",
            path_to_app: "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
		}
	}

	const game_properties_menu_buttons_settings_handler = popup_desktop.m_popup.document.getElementById("game_properties_menu_buttons_settings_handler");
	
	const newElement = popup_desktop.m_popup.document.createElement('div');

	const id = generateId();

	newElement.id = "game_properties_menu_buttons_settings_element_" + id;
	newElement.innerHTML = `
		<div class="game_properties_menu_buttons_settings_item">
			<span title="` + BUTTON_NAME_TIP + `">
				<span>Name</span>
				<input
					type="text"
					name="name"
					value="` + app.name + `"
					style="width: 220px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_FORMAT_GAME_NAME_TIP + `">
				<span>Format game name</span>
				<input
					type="checkbox"
					name="format_game_name"
					${app.format_game_name === "true" ? "checked" : ""}
					style="width: 40px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_ADD_ARROW_ICON_TIP + `">
				<span>Add arrow icon</span>
				<input
					type="checkbox"
					name="add_arrow_icon"
					${app.add_arrow_icon === "true" ? "checked" : ""}
					style="width: 40px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_PATH_TO_APP_TIP + `">
				<span>URL</span>
				<input
					type="text"
					name="path_to_app"
					value="` + app.path_to_app + `"
					style="width: 220px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<center><button style="cursor: pointer; margin-top: 6px; background-color: rgb(255 74 74); border: 0px; border-radius: 6px;" id="` + id + `_deleteButton">delete this button</button></center>
		</div>
		<div style="height: 3px; background-color: #4a545d; margin: 8px 0px; border-radius: 5px;"/>
	`;

	game_properties_menu_buttons_settings_handler.appendChild(newElement);

	popup_desktop.m_popup.document.getElementById(id + "_deleteButton")
		.addEventListener('click', function (event) {
				DeleteObject("game_properties_menu_buttons_settings_element_" + id);
			});
}

function SpawnStoreSupernavButtonsSettingsElement(app: any = undefined){
	if (app.name == undefined){
		app = {
            name: "Steam Sales",
            add_arrow_icon: "true",
            path_to_app: "https://steamdb.info/sales/history/"
		}
	}

	const store_supernav_buttons_settings_handler = popup_desktop.m_popup.document.getElementById("store_supernav_buttons_settings_handler");
	
	const newElement = popup_desktop.m_popup.document.createElement('div');

	const id = generateId();

	newElement.id = "store_supernav_buttons_settings_element_" + id;
	newElement.innerHTML = `
		<div class="store_supernav_buttons_settings_item">
			<span title="` + BUTTON_NAME_TIP + `">
				<span>Name</span>
				<input
					type="text"
					name="name"
					value="` + app.name + `"
					style="width: 220px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_ADD_ARROW_ICON_TIP + `">
				<span>Add arrow icon</span>
				<input
					type="checkbox"
					name="add_arrow_icon"
					${app.add_arrow_icon === "true" ? "checked" : ""}
					style="width: 40px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<span title="` + BUTTON_PATH_TO_APP_TIP + `">
				<span>URL</span>
				<input
					type="text"
					name="path_to_app"
					value="` + app.path_to_app + `"
					style="width: 220px; padding: 4px 8px"
					required
				/>
			</span>
			<br>
			<center><button style="cursor: pointer; margin-top: 6px; background-color: rgb(255 74 74); border: 0px; border-radius: 6px;" id="` + id + `_deleteButton">delete this button</button></center>
		</div>
		<div style="height: 3px; background-color: #4a545d; margin: 8px 0px; border-radius: 5px;"/>
	`;

	store_supernav_buttons_settings_handler.appendChild(newElement);

	popup_desktop.m_popup.document.getElementById(id + "_deleteButton")
		.addEventListener('click', function (event) {
				DeleteObject("store_supernav_buttons_settings_element_" + id);
			});
}

async function SaveSettings(setInfoMessage: Function){
	setInfoMessage("");

	try {
		SyncLog("Save Settings");

		let result = {};

		let handler = popup_desktop.m_popup.document.getElementById("top_buttons_settings_handler");
		let items = handler.querySelectorAll(".top_buttons_settings_item");

		let result_top_buttons = [];

		items.forEach(item => {
			const obj = {
				name: item.querySelector('[name="name"]').value,
				show_name: item.querySelector('[name="show_name"]').checked.toString(),
				icon: item.querySelector('[name="icon"]').value,
				show_icon: item.querySelector('[name="show_icon"]').checked.toString(),
				path_to_app: item.querySelector('[name="path_to_app"]').value
			};

			result_top_buttons.push(obj);
		});

		result["top_buttons"] = result_top_buttons;

		handler = popup_desktop.m_popup.document.getElementById("right_click_on_game_context_menu_buttons_settings_handler");
		items = handler.querySelectorAll(".right_click_on_game_context_menu_buttons_settings_item");

		let result_right_click_on_game_context_menu_buttons = [];

		items.forEach(item => {
			const obj = {
				name: item.querySelector('[name="name"]').value,
				format_game_name: item.querySelector('[name="format_game_name"]').checked.toString(),
				add_arrow_icon: item.querySelector('[name="add_arrow_icon"]').checked.toString(),
				path_to_app: item.querySelector('[name="path_to_app"]').value
			};

			result_right_click_on_game_context_menu_buttons.push(obj);
		});

		result["right_click_on_game_context_menu_buttons"] = result_right_click_on_game_context_menu_buttons;

		handler = popup_desktop.m_popup.document.getElementById("right_click_on_game_context_menu_buttons_drop_down_settings_handler");
		items = handler.querySelectorAll(".right_click_on_game_context_menu_buttons_drop_down_settings_item");

		let result_right_click_on_game_context_menu_buttons_drop_down = [];

		items.forEach(item => {
			const obj = {
				name: item.querySelector('[name="name"]').value,
				format_game_name: item.querySelector('[name="format_game_name"]').checked.toString(),
				add_arrow_icon: item.querySelector('[name="add_arrow_icon"]').checked.toString(),
				path_to_app: item.querySelector('[name="path_to_app"]').value
			};

			result_right_click_on_game_context_menu_buttons_drop_down.push(obj);
		});

		let current_items = {};
		current_items["items"] = result_right_click_on_game_context_menu_buttons_drop_down;

		let element = popup_desktop.m_popup.document.getElementById("drop_down_name");

		if (element) {
			current_items["name"] = element.value.toString();
		}

		element = popup_desktop.m_popup.document.getElementById("drop_down_append_after");

		if (element) {
			current_items["append_after_element_number"] = element.value.toString();
		}

		result["right_click_on_game_context_menu_buttons_drop_down"] = current_items;

		handler = popup_desktop.m_popup.document.getElementById("game_properties_menu_buttons_settings_handler");
		items = handler.querySelectorAll(".game_properties_menu_buttons_settings_item");

		let result_game_properties_menu_buttons = [];

		items.forEach(item => {
			const obj = {
				name: item.querySelector('[name="name"]').value,
				format_game_name: item.querySelector('[name="format_game_name"]').checked.toString(),
				add_arrow_icon: item.querySelector('[name="add_arrow_icon"]').checked.toString(),
				path_to_app: item.querySelector('[name="path_to_app"]').value
			};

			result_game_properties_menu_buttons.push(obj);
		});

		result["game_properties_menu_buttons"] = result_game_properties_menu_buttons;

		handler = popup_desktop.m_popup.document.getElementById("store_supernav_buttons_settings_handler");
		items = handler.querySelectorAll(".store_supernav_buttons_settings_item");

		let result_store_supernav_buttons = [];

		items.forEach(item => {
			const obj = {
				name: item.querySelector('[name="name"]').value,
				add_arrow_icon: item.querySelector('[name="add_arrow_icon"]').checked.toString(),
				path_to_app: item.querySelector('[name="path_to_app"]').value
			};

			result_store_supernav_buttons.push(obj);
		});

		result["store_supernav_buttons"] = result_store_supernav_buttons;

		element = popup_desktop.m_popup.document.getElementById("TopButtonsStyleInput");

		if (element) {
			result["top_buttons_style"] = element.value;
		}

		const jsonString = JSON.stringify(result);
		SyncLog("Settings Saved");
		SyncLog(jsonString);

		saveSettings({ ...getSettings(), settings_json: jsonString });
		global_object_settings = result;
		RespawnTopButtons();
		RespawnStoreSupernavButtons();

		await sleep(500);
		setInfoMessage("Success!");
	}
	catch (error) {
		setInfoMessage(error);
	}
}

function DeleteObject(id: string){
    const element = popup_desktop.m_popup.document.getElementById(id);
    if (element) {
        element.remove();
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
