local millennium = require("millennium")

require("rpc_functions")

-- All the buttons are injected by patching Steam's own UI code (the Hooking API),
-- so Steam renders them itself instead of the plugin cloning DOM nodes.
-- #{{self}} is the frontend module; every hook falls back to Steam's original
-- behaviour when the frontend is not loaded. If Steam changes the code and a
-- pattern stops matching, only that one place is left without buttons.
local STEAM_UI_FILE = [[sp\.js]]

local patches = {
    -- Main window title bar: the buttons go first in the row of title bar controls.
    {
        file = STEAM_UI_FILE,
        find = [=[TitleBarControls,[\w$]+\),\.\.\.[\w$]+,children:\(0,[\w$]+\.jsxs\)\([\w$]+\.[\w$]+,\{children:\[]=],
        transforms = {
            {
                match = [=[children:\(0,([\w$]+)\.jsxs\)\(([\w$]+\.[\w$]+),\{children:\[]=],
                replace = [=[children:(0,\1.jsxs)(\2,{children:[(0,\1.jsx)(#{{self}}?.hooks?.TopButtons||(()=>null),{}),]=],
            },
        },
    },
    -- Game context menu (library list and the gear button on the game page).
    -- Its whole children array is passed through the frontend, which inserts
    -- the buttons and the drop down submenu. Steam's own menu item component is
    -- passed along with it, so the buttons are built from the same component.
    {
        file = STEAM_UI_FILE,
        find = [=[render\(\)\{const [\w$]+=this\.GetTargetApps\(\).*?"#GameAction_GameProperties"\)\}\)\]\}\)\]\}\)\}]=],
        transforms = {
            {
                match = [=[label:([\w$]+)\.length==1\?[\w$]+\[0\]\.display_name:null,children:\[]=],
                replace = [=[label:\1.length==1?\1[0].display_name:null,children:(#{{self}}?.hooks?.contextMenu||((a,c)=>c))(\1,[]=],
            },
            {
                match = [=[(\(0,[\w$]+\.jsx\)\(([\w$]+\.[\w$]+),\{onSelected:\(\)=>this\.props\.navigator\.AppProperties\([\w$]+\[0\]\.appid\),children:\(0,[\w$]+\.we\)\("#GameAction_GameProperties"\)\}\)\]\}\))\]\}\)\}]=],
                replace = [=[\1],\2)})}]=],
            },
        },
    },
    -- The "Manage" submenu of the same context menu. Its component is handed to
    -- the frontend, which builds the drop down submenu of the buttons from it.
    {
        file = STEAM_UI_FILE,
        find = [=[return\(0,[\w$]+\.jsxs\)\([\w$]+\.[\w$]+,\{label:\(0,[\w$]+\.we\)\("#GameAction_Manage"\)]=],
        transforms = {
            {
                match = [=[jsxs\)\(([\w$]+\.[\w$]+),\{label:]=],
                replace = [=[jsxs)((#{{self}}?.hooks?.rememberSubmenu?.(\1),\1),{label:]=],
            },
        },
    },
    -- Game properties dialog: the buttons are appended to its list of pages.
    {
        file = STEAM_UI_FILE,
        find = [=[title:[\w$]+\.display_name,pages:[\w$]+,showTitle]=],
        transforms = {
            {
                match = [=[title:([\w$]+)\.display_name,pages:([\w$]+),]=],
                replace = [=[title:\1.display_name,pages:(#{{self}}?.hooks?.propertiesPages||((o,p)=>p))(\1,\2),]=],
            },
        },
    },
    -- "Store" menu in the main window header: the buttons are appended to its items.
    {
        file = STEAM_UI_FILE,
        find = [=[title:"Store Supernav",name:"#Menu_Store",[^\]]*?menuItems:\[[^\]]*\]]=],
        transforms = {
            {
                match = [=[(menuItems:\[[^\]]*)\]]=],
                replace = [=[\1,...(#{{self}}?.hooks?.storeItems?.()||[])]]=],
            },
        },
    },
    -- Game page: the buttons go first in the row with the gear, info and favourite buttons.
    {
        file = STEAM_UI_FILE,
        find = [=[AppButtonsContainer,children:\[\(0,[\w$]+\.jsx\)]=],
        transforms = {
            {
                match = [=[children:\[\(0,([\w$]+)\.jsx\)]=],
                replace = [=[children:[(0,\1.jsx)(#{{self}}?.hooks?.AppPageButtons||(()=>null),{overview:this.props.overview}),(0,\1.jsx)]=],
            },
        },
    },
}

local function on_load()
    millennium.ready()
end

return {
    on_load = on_load,
    patches = patches,
}
