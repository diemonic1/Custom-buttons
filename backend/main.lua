local logger = require("logger")
local millennium = require("millennium")

-- ====== BACKEND API ======

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
