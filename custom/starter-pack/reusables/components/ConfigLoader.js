export class ConfigLoader {
    static load(path) {
        return fetch(path).then(function (response) {
            if (!response.ok) {
                throw new Error('Could not load ' + path);
            }

            return response.json();
        });
    }

    static loadWithDefaults(path, defaults) {
        return ConfigLoader.load(path).then(function (loaded) {
            return ConfigLoader._deepMerge(defaults, loaded);
        });
    }

    static _deepMerge(base, override) {
        var result = {};
        var key;

        for (key in base) {
            if (!Object.prototype.hasOwnProperty.call(base, key)) {
                continue;
            }

            result[key] = base[key];
        }

        for (key in override) {
            if (!Object.prototype.hasOwnProperty.call(override, key)) {
                continue;
            }

            if (
                ConfigLoader._isPlainObject(result[key]) &&
                ConfigLoader._isPlainObject(override[key])
            ) {
                result[key] = ConfigLoader._deepMerge(result[key], override[key]);
            } else {
                result[key] = override[key];
            }
        }

        return result;
    }

    static _isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }
}
