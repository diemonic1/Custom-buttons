local logger = require("logger")
local millennium = require("millennium")
local utils = require("utils")

-- ====== STATE ======

local styleCSS = ""

-- ====== read_file ======

local function read_file(path)
    local content, err = utils.read_file(path)
    return content
end

-- ====== BACKEND API ======

function get_styleCSS()
    return tostring(styleCSS)
end

function get_installPath()
    return tostring(string.gsub(utils.get_backend_path(), "\\backend", ""))
end

function print_log(text)
    logger:info("[Custom-buttons] " .. tostring(text));
    return "[Custom-buttons] " .. tostring(text);
end

function print_error(text)
    logger:error("[Custom-buttons] " .. tostring(text));
    return "[Custom-buttons] " .. tostring(text);
end

-- ====== PLUGIN LIFECYCLE ======

local function on_load()
    logger:info("Comparing millennium version: " .. millennium.cmp_version(millennium.version(), "2.29.3"))
    logger:info("Custom Buttons plugin loaded with Millennium version " .. millennium.version())

    logger:info("Plugin base dir: " .. millennium.get_install_path())

    local install_path = get_installPath()
    logger:info("install path: " .. install_path)

    local TopButtonsStyle_path = install_path .. "/TopButtonsStyle.css"
    logger:info("TopButtonsStyle path: " .. TopButtonsStyle_path)

    local content = read_file(TopButtonsStyle_path)
    if content then
        styleCSS = content
        logger:info("TopButtonsStyle loaded: " .. styleCSS)
    else
        logger:error("failed to load TopButtonsStyle.css")
    end

    millennium.ready()
end

local function on_unload()
    logger:info("Plugin Custom Buttons unloaded")
end

local function on_frontend_loaded()
    logger:info("Frontend Custom Buttons loaded")
end

return {
    on_frontend_loaded = on_frontend_loaded,
    on_load = on_load,
    on_unload = on_unload
}
