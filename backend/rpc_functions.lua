local logger = require("logger")
local utils = require("utils")
local http = require("http")

-- The default Lua-HTTP user agent gets served inconsistently, so a browser one
-- is used here - same approach as in the RSS-feed-in-whats-new plugin.
local REQUEST_OPTIONS = {
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    headers = {
        ["Accept"] = "application/json, text/plain, */*"
    },
    timeout = 5
}

---@ffi
--- The frontend runs in a CEF context whose origin steamcommunity.com does not
--- allow, so requests to it are blocked by CORS there and have to go through the
--- backend instead. Returns the body only for successful responses, so callers
--- never receive an error page that would later fail JSON parsing.
---@param url string
---@return string|nil
function get_url_data(url)
    if type(url) ~= "string" or not string.find(url, "http", 1, true) then
        return nil
    end

    local response, err = http.request(url, REQUEST_OPTIONS)

    if not response then
        logger:error("request failed for " .. url .. ": " .. tostring(err))
        return nil
    end

    if response.status < 200 or response.status >= 300 then
        logger:error("request for " .. url .. " returned status " .. tostring(response.status))
        return nil
    end

    return response.body
end

---@ffi
--- Opens a file, folder or app the same way Explorer does.
---@param path string
---@return boolean
function run_command(path)
    if type(path) ~= "string" or path == "" then
        return false
    end

    -- A quote inside the path would close the argument and let the rest of it
    -- run as a separate command, so quotes are not allowed in it at all.
    local safe_path = string.gsub(path, '"', "")
    local _, status = utils.exec('start "" "' .. safe_path .. '"')

    if status ~= 0 then
        logger:error("failed to open " .. safe_path .. ", exit status " .. tostring(status))
        return false
    end

    return true
end
