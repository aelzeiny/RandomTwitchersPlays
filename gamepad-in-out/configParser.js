/**
 * Will process & load a JSON configuration. If the value starts with a '$', the parser will assume that it's an
 * environment variable.
 */
const fs = require('fs');


function parseConfig(configPath) {
    const unparsedConfig = JSON.parse(fs.readFileSync(configPath));
    const config = {};
    for (let key of Object.keys(unparsedConfig)) {
        let val = unparsedConfig[key]
        if (typeof(val) === "string" && val.startsWith('$'))
            config[key] = process.env[unparsedConfig[key].substring(1)];
        else
            config[key] = val;
    }
    return config;
}

module.exports = parseConfig;