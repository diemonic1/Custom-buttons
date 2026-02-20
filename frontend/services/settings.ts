export interface PluginSettings {
  settings_json: string;
}

const STORAGE_KEY = 'Custom-buttons-settings';

const DEFAULT_SETTINGS: PluginSettings = {
  settings_json: `{
      "top_buttons": [
        {
          "name": "SteamGridDB",
          "show_name": "true",
          "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamGridDB.png",
          "show_icon": "true",
          "path_to_app": "https://www.steamgriddb.com/"
        },
        {
          "name": "SteamDB",
          "show_name": "true",
          "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steamDB.png",
          "show_icon": "true",
          "path_to_app": "https://steamdb.info/"
        },
        {
          "name": "Steam",
          "show_name": "true",
          "icon": "https://raw.githubusercontent.com/diemonic1/Millennium-apps-buttons/refs/heads/main/PUBLIC_ICONS/steam.png",
          "show_icon": "true",
          "path_to_app": "https://store.steampowered.com/"
        }
      ],
      "right_click_on_game_context_menu_buttons": [
        {
          "name": "YouTube",
          "format_game_name": "true",
          "add_arrow_icon": "true",
          "path_to_app": "https://www.youtube.com/results?search_query=%GAME_NAME%"
        },
        {
          "name": "Twitch",
          "format_game_name": "true",
          "add_arrow_icon": "true",
          "path_to_app": "https://www.twitch.tv/search?term=%GAME_NAME%"
        }
      ],
      "right_click_on_game_context_menu_buttons_drop_down": {
        "items": [
          {
            "name": "SteamGridDB",
            "format_game_name": "true",
            "add_arrow_icon": "true",
            "path_to_app": "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
          },
          {
            "name": "How Long To Beat",
            "format_game_name": "true",
            "add_arrow_icon": "true",
            "path_to_app": "https://howlongtobeat.com/?q=%GAME_NAME%"
          }
        ],
        "name": "Other",
        "append_after_element_number": "7"
      },
      "game_properties_menu_buttons": [
        {
          "name": "SteamGridDB",
          "format_game_name": "true",
          "add_arrow_icon": "true",
          "path_to_app": "https://www.steamgriddb.com/search/grids?term=%GAME_NAME%"
        },
        {
          "name": "How Long To Beat",
          "format_game_name": "true",
          "add_arrow_icon": "true",
          "path_to_app": "https://howlongtobeat.com/?q=%GAME_NAME%"
        }
      ],
      "store_supernav_buttons": [
        {
          "name": "MLNM Plugins",
          "add_arrow_icon": "true",
          "path_to_app": "https://steambrew.app/plugins"
        },
        {
          "name": "MLNM Themes",
          "add_arrow_icon": "true",
          "path_to_app": "https://steambrew.app/themes"
        },
        {
          "name": "Steam Sales",
          "add_arrow_icon": "true",
          "path_to_app": "https://steamdb.info/sales/history/"
        }
      ],
      "top_buttons_style": ".millennium-custom-buttons {\\n  margin-right: 9px;\\n  padding: 0px 3px;\\n  border-radius: 2px;\\n  height: 24px;\\n  background-color: rgba(103, 112, 123, 0.2);\\n  color: #8b929a; \\n  transition: all 0.4s;\\n}\\n\\n.millennium-custom-buttons:hover {\\n  background-color: rgba(103, 112, 123, 0.5);\\n}\\n\\n.millennium-custom-buttons-inner-div {\\n  z-index: 1000;\\n  pointer-events: auto;\\n  -webkit-app-region: no-drag;\\n  user-select: none;\\n  display: flex;\\n  align-items: center;\\n  padding: 0px 5px;\\n  cursor: pointer;\\n}\\n\\n.millennium-custom-buttons-img {\\n  width: 18px;\\n  height: 18px;\\n}\\n\\n.millennium-custom-buttons-img-with-margin {\\n  margin-top: 3px;\\n  width: 18px;\\n  height: 18px;\\n}\\n\\n.millennium-custom-buttons-text-with-margin {\\n  margin-left: 5px;\\n}\\n"
    }`
};

export function getSettings(): PluginSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: PluginSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
