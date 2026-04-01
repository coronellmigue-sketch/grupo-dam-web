(function () {
    'use strict';

    var DEFAULTS = {
        enabled: false,
        provider: 'github',
        githubOwner: '',
        githubRepo: '',
        githubBranch: 'main',
        statePath: 'state/main.json',
        mediaPrefix: 'media/',
        githubTokenStorageKey: 'dam-github-token'
    };

    var stateCache = null;
    var statePromise = null;
    var MEDIA_META_KEY = 'dam-cloud-media-meta';

    function readConfig() {
        var cfg = window.DAM_CLOUD_CONFIG || {};
        var merged = Object.assign({}, DEFAULTS, cfg);
        merged.provider = 'github';
        return merged;
    }

    function isPlaceholder(value) {
        return !value || /your-|example|reemplaza|pegue|pega/i.test(String(value));
    }

    function isEnabled() {
        var cfg = readConfig();
        return !!(cfg.enabled && !isPlaceholder(cfg.githubOwner) && !isPlaceholder(cfg.githubRepo));
    }

    function tokenStorageKey() {
        return String(readConfig().githubTokenStorageKey || DEFAULTS.githubTokenStorageKey);
    }

    function readAuthToken() {
        var key = tokenStorageKey();
        try {
            var sessionToken = window.sessionStorage.getItem(key);
            if (sessionToken) {
                return sessionToken;
            }
        } catch (error) {}
        try {
            return window.localStorage.getItem(key) || '';
        } catch (error) {
            return '';
        }
    }

    function writeAuthToken(token, persist) {
        var key = tokenStorageKey();
        try { window.sessionStorage.removeItem(key); } catch (error) {}
        try { window.localStorage.removeItem(key); } catch (error) {}
        if (!token) {
            return;
        }
        if (persist === false) {
            try { window.sessionStorage.setItem(key, token); } catch (error) {}
            return;
        }
        try { window.localStorage.setItem(key, token); } catch (error) {
            try { window.sessionStorage.setItem(key, token); } catch (error2) {}
        }
    }

    function clearAuthToken() {
        writeAuthToken('', false);
    }

    function ensureClient() {
        if (!isEnabled()) {
            return null;
        }
        var cfg = readConfig();
        return {
            provider: 'github',
            owner: cfg.githubOwner,
            repo: cfg.githubRepo,
            branch: cfg.githubBranch,
            token: readAuthToken()
        };
    }

    function encodePath(path) {
        return String(path || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
    }

    function getRawBase() {
        var cfg = readConfig();
        return 'https://raw.githubusercontent.com/' +
            encodeURIComponent(cfg.githubOwner) + '/' +
            encodeURIComponent(cfg.githubRepo) + '/' +
            encodeURIComponent(cfg.githubBranch);
    }

    function getApiBase() {
        var cfg = readConfig();
        return 'https://api.github.com/repos/' +
            encodeURIComponent(cfg.githubOwner) + '/' +
            encodeURIComponent(cfg.githubRepo) + '/contents';
    }

    function decodeUtf8Base64(base64Value) {
        var binary = atob(String(base64Value || '').replace(/\s+/g, ''));
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
    }

    function encodeUtf8Base64(text) {
        var bytes = new TextEncoder().encode(String(text || ''));
        var binary = '';
        for (var i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function decodeBytesBase64(base64Value) {
        var clean = String(base64Value || '').replace(/\s+/g, '');
        var binary = atob(clean);
        var len = binary.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function blobToBase64(blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var result = String(reader.result || '');
                var index = result.indexOf(',');
                resolve(index >= 0 ? result.slice(index + 1) : result);
            };
            reader.onerror = function () {
                reject(reader.error || new Error('No se pudo leer el archivo para GitHub.'));
            };
            reader.readAsDataURL(blob);
        });
    }

    function githubRequest(method, path, options) {
        var settings = options || {};
        var token = settings.token !== undefined ? settings.token : readAuthToken();
        var headers = {
            'Accept': 'application/vnd.github+json'
        };
        if (token) {
            headers.Authorization = 'Bearer ' + token;
        }
        if (settings.jsonBody !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        return fetch(getApiBase() + '/' + encodePath(path) + '?ref=' + encodeURIComponent(readConfig().githubBranch), {
            method: method,
            headers: headers,
            body: settings.jsonBody !== undefined ? JSON.stringify(settings.jsonBody) : undefined
        }).then(function (response) {
            if (response.status === 204) {
                return { ok: true, data: null, status: response.status };
            }
            return response.text().then(function (text) {
                var data = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (error) {
                    data = null;
                }
                if (!response.ok) {
                    var msg = data && (data.message || data.error) ? (data.message || data.error) : ('GitHub API error ' + response.status);
                    var err = new Error(msg);
                    err.status = response.status;
                    throw err;
                }
                return { ok: true, data: data, status: response.status };
            });
        });
    }

    function githubReadContent(path) {
        return githubRequest('GET', path, {}).then(function (result) {
            return result.data || null;
        });
    }

    function githubPutContent(path, contentBase64, message) {
        return githubReadContent(path).then(function (existing) {
            var body = {
                message: message || ('Actualiza ' + path),
                branch: readConfig().githubBranch,
                content: contentBase64
            };
            if (existing && existing.sha) {
                body.sha = existing.sha;
            }
            return githubRequest('PUT', path, { jsonBody: body }).then(function (result) {
                return result.data;
            });
        }).catch(function (error) {
            if (error && error.status !== 404) {
                throw error;
            }
            var createBody = {
                message: message || ('Crea ' + path),
                branch: readConfig().githubBranch,
                content: contentBase64
            };
            return githubRequest('PUT', path, { jsonBody: createBody }).then(function (result) {
                return result.data;
            });
        });
    }

    function githubDeleteContent(path, message) {
        return githubReadContent(path).then(function (existing) {
            if (!existing || !existing.sha) {
                return;
            }
            var body = {
                message: message || ('Elimina ' + path),
                branch: readConfig().githubBranch,
                sha: existing.sha
            };
            return githubRequest('DELETE', path, { jsonBody: body }).then(function () {
                return;
            });
        }).catch(function (error) {
            if (error && error.status === 404) {
                return;
            }
            throw error;
        });
    }

    function normalizeState(raw) {
        var data = raw && typeof raw === 'object' ? raw : {};
        return {
            version: Number(data.version || 1),
            updatedAt: String(data.updatedAt || ''),
            kv: data.kv && typeof data.kv === 'object' ? data.kv : {},
            media: data.media && typeof data.media === 'object' ? data.media : {}
        };
    }

    function buildPublicUrl(path, versionTag) {
        var suffix = versionTag ? ('?v=' + encodeURIComponent(String(versionTag))) : '';
        return getRawBase() + '/' + encodePath(path) + suffix;
    }

    function getStatePublicUrl() {
        return buildPublicUrl(readConfig().statePath, Date.now());
    }

    function fetchJson(url) {
        return fetch(url, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        }).then(function (response) {
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error('No se pudo leer el estado remoto (' + response.status + ')');
            }
            return response.json();
        });
    }

    function loadState(force) {
        if (!isEnabled()) {
            return Promise.resolve(normalizeState(null));
        }
        if (stateCache && !force) {
            return Promise.resolve(stateCache);
        }
        if (statePromise && !force) {
            return statePromise;
        }

        var statePath = readConfig().statePath;
        statePromise = fetchJson(buildPublicUrl(statePath, Date.now())).catch(function () {
            return githubReadContent(statePath).then(function (content) {
                if (!content || !content.content) {
                    return null;
                }
                try {
                    return JSON.parse(decodeUtf8Base64(content.content));
                } catch (error) {
                    return null;
                }
            }).catch(function () {
                return null;
            });
        }).then(function (data) {
            stateCache = normalizeState(data);
            return stateCache;
        }).finally(function () {
            statePromise = null;
        });

        return statePromise;
    }

    function getMediaRecord(key, state) {
        var snapshot = state || stateCache || normalizeState(null);
        return snapshot.media && snapshot.media[key] ? snapshot.media[key] : null;
    }

    function getMediaPath(key, state) {
        var record = getMediaRecord(key, state);
        if (record && record.path) {
            return record.path;
        }
        var prefix = readConfig().mediaPrefix;
        return prefix + encodeURIComponent(String(key || ''));
    }

    function getMediaPublicUrl(key, state) {
        var snapshot = state || stateCache;
        if (snapshot && !getMediaRecord(key, snapshot)) {
            return '';
        }
        var record = snapshot ? getMediaRecord(key, snapshot) : null;
        return buildPublicUrl(getMediaPath(key, snapshot), record && record.updatedAt ? record.updatedAt : Date.now());
    }

    function openMediaDb() {
        return new Promise(function (resolve, reject) {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB no disponible'));
                return;
            }
            var req = indexedDB.open('dam-media-db', 1);
            req.onupgradeneeded = function (ev) {
                var db = ev.target.result;
                if (!db.objectStoreNames.contains('assets')) {
                    db.createObjectStore('assets');
                }
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error || new Error('db-open-error')); };
        });
    }

    function mediaAssetPut(key, value) {
        return openMediaDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction('assets', 'readwrite');
                tx.objectStore('assets').put(value, key);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function () { reject(tx.error || new Error('db-write-error')); };
            });
        });
    }

    function mediaAssetDelete(key) {
        return openMediaDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction('assets', 'readwrite');
                tx.objectStore('assets').delete(key);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function () { reject(tx.error || new Error('db-delete-error')); };
            });
        });
    }

    function listMediaDbEntries() {
        return openMediaDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction('assets', 'readonly');
                var store = tx.objectStore('assets');
                var req = store.openCursor();
                var items = [];
                req.onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (!cursor) {
                        resolve(items);
                        return;
                    }
                    items.push({ key: cursor.key, value: cursor.value });
                    cursor.continue();
                };
                req.onerror = function () {
                    reject(req.error || new Error('db-cursor-error'));
                };
            });
        }).catch(function () {
            return [];
        });
    }

    function hydrateLocalStorage(options) {
        var settings = options || {};
        var keys = Array.isArray(settings.keys) ? settings.keys : null;
        var clearFirst = !!settings.clearFirst;
        return loadState().then(function (snapshot) {
            var kv = snapshot.kv || {};
            var targetKeys = keys || Object.keys(kv);
            if (clearFirst) {
                targetKeys.forEach(function (key) {
                    try { window.localStorage.removeItem(key); } catch (error) {}
                });
            }
            targetKeys.forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(kv, key)) {
                    return;
                }
                try {
                    window.localStorage.setItem(key, kv[key]);
                } catch (error) {}
            });
            return snapshot;
        });
    }

    function fetchBlobByUrl(url) {
        return fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }).then(function (response) {
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error('No se pudo descargar asset remoto (' + response.status + ')');
            }
            return response.blob();
        });
    }

    function fetchBlobViaGithubApi(path, contentType) {
        return githubReadContent(path).then(function (content) {
            if (!content || !content.content) {
                return null;
            }
            var bytes = decodeBytesBase64(content.content);
            return new Blob([bytes], { type: contentType || content.type || 'application/octet-stream' });
        }).catch(function () {
            return null;
        });
    }

    function readMediaMetaStore() {
        try {
            var raw = window.localStorage.getItem(MEDIA_META_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function writeMediaMetaStore(store) {
        try {
            window.localStorage.setItem(MEDIA_META_KEY, JSON.stringify(store || {}));
        } catch (error) {}
    }

    function readMediaMeta(key) {
        var store = readMediaMetaStore();
        return store && store[key] ? store[key] : null;
    }

    function writeMediaMeta(key, meta) {
        if (!key) {
            return;
        }
        var store = readMediaMetaStore();
        store[key] = meta || null;
        if (!meta) {
            delete store[key];
        }
        writeMediaMetaStore(store);
    }

    function normalizeMediaMeta(record) {
        if (!record || typeof record !== 'object') {
            return null;
        }
        return {
            path: String(record.path || ''),
            updatedAt: String(record.updatedAt || ''),
            size: Number(record.size || 0),
            contentType: String(record.contentType || '')
        };
    }

    function isSameMediaMeta(left, right) {
        var a = normalizeMediaMeta(left);
        var b = normalizeMediaMeta(right);
        if (!a || !b) {
            return false;
        }
        return a.path === b.path &&
            a.updatedAt === b.updatedAt &&
            a.size === b.size &&
            a.contentType === b.contentType;
    }

    function hasLocalMediaAsset(key) {
        return openMediaDb().then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction('assets', 'readonly');
                var req = tx.objectStore('assets').getKey(key);
                req.onsuccess = function () {
                    resolve(req.result !== undefined);
                };
                req.onerror = function () {
                    resolve(false);
                };
            });
        }).catch(function () {
            return false;
        });
    }

    function hydrateMediaCache(options) {
        var settings = options || {};
        var keys = Array.isArray(settings.keys) ? settings.keys : null;
        var deleteMissing = !!settings.deleteMissing;
        var forceRefresh = !!settings.forceRefresh;
        return loadState().then(function (snapshot) {
            var media = snapshot.media || {};
            var targetKeys = keys || Object.keys(media);
            return Promise.all(targetKeys.map(function (key) {
                if (!media[key]) {
                    return (deleteMissing ? mediaAssetDelete(key) : Promise.resolve()).then(function () {
                        if (deleteMissing) {
                            writeMediaMeta(key, null);
                        }
                    });
                }

                var remoteMeta = normalizeMediaMeta(media[key]);
                if (!forceRefresh && isSameMediaMeta(readMediaMeta(key), remoteMeta)) {
                    return hasLocalMediaAsset(key).then(function (exists) {
                        if (exists) {
                            return Promise.resolve();
                        }
                        writeMediaMeta(key, null);
                        return Promise.resolve();
                    });
                }

                var url = getMediaPublicUrl(key, snapshot);
                if (!url) {
                    return Promise.resolve();
                }
                return fetchBlobByUrl(url).then(function (blob) {
                    if (blob) {
                        return blob;
                    }
                    return fetchBlobViaGithubApi(getMediaPath(key, snapshot), remoteMeta && remoteMeta.contentType);
                }).then(function (blob) {
                    if (!blob) {
                        return (deleteMissing ? mediaAssetDelete(key) : Promise.resolve()).then(function () {
                            if (deleteMissing) {
                                writeMediaMeta(key, null);
                            }
                        });
                    }
                    return mediaAssetPut(key, blob).then(function () {
                        writeMediaMeta(key, remoteMeta);
                    });
                }).catch(function () {
                    return Promise.resolve();
                });
            })).then(function () {
                return snapshot;
            });
        });
    }

    function hydratePage(options) {
        var settings = options || {};
        return hydrateLocalStorage({ keys: settings.localStorageKeys || [] }).then(function () {
            return hydrateMediaCache({ keys: settings.mediaKeys || [] });
        });
    }

    function getSession() {
        var token = readAuthToken();
        if (!token) {
            return Promise.resolve(null);
        }
        return Promise.resolve({ provider: 'github', tokenPresent: true });
    }

    function signIn(token) {
        if (!isEnabled()) {
            return Promise.reject(new Error('Nube no configurada'));
        }
        var cleanToken = String(token || '').trim();
        if (!cleanToken) {
            return Promise.reject(new Error('Token de GitHub vacio'));
        }
        return fetch('https://api.github.com/user', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + cleanToken,
                'Accept': 'application/vnd.github+json'
            }
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('Token de GitHub invalido o sin permisos.');
            }
            writeAuthToken(cleanToken, true);
            return { ok: true };
        });
    }

    function signOut() {
        clearAuthToken();
        return Promise.resolve();
    }

    function ensureWritableSession() {
        if (!isEnabled()) {
            return Promise.reject(new Error('Nube no configurada'));
        }
        if (!readAuthToken()) {
            return Promise.reject(new Error('Conecta un token de GitHub para publicar cambios.'));
        }
        return Promise.resolve();
    }

    function uploadMediaEntries(entries) {
        return ensureWritableSession().then(function () {
            var mediaMap = {};
            return Promise.all((entries || []).map(function (entry) {
                if (!entry || !entry.key || !(entry.blob instanceof Blob)) {
                    return Promise.resolve();
                }
                var path = getMediaPath(entry.key);
                mediaMap[entry.key] = {
                    path: path,
                    contentType: entry.blob.type || 'application/octet-stream',
                    updatedAt: new Date().toISOString(),
                    size: Number(entry.blob.size || 0)
                };
                return blobToBase64(entry.blob).then(function (base64Content) {
                    return githubPutContent(path, base64Content, 'DAM: actualiza media ' + String(entry.key));
                });
            })).then(function () {
                return mediaMap;
            });
        });
    }

    function removeMediaKeys(keys) {
        return ensureWritableSession().then(function () {
            var paths = (keys || []).map(function (key) {
                return getMediaPath(key);
            });
            if (!paths.length) {
                return Promise.resolve();
            }
            return Promise.all(paths.map(function (path) {
                return githubDeleteContent(path, 'DAM: elimina media ' + path);
            })).then(function () {
                return;
            });
        });
    }

    function uploadState(state) {
        return ensureWritableSession().then(function () {
            var cfg = readConfig();
            var payload = normalizeState(state);
            var jsonText = JSON.stringify(payload, null, 2);
            return githubPutContent(cfg.statePath, encodeUtf8Base64(jsonText), 'DAM: actualiza estado global').then(function () {
                stateCache = payload;
                return payload;
            });
        });
    }

    window.DAMCloud = {
        config: readConfig,
        enabled: isEnabled,
        ensureClient: ensureClient,
        loadState: loadState,
        getStatePublicUrl: getStatePublicUrl,
        getMediaPath: getMediaPath,
        getMediaPublicUrl: getMediaPublicUrl,
        openMediaDb: openMediaDb,
        mediaAssetPut: mediaAssetPut,
        mediaAssetDelete: mediaAssetDelete,
        listMediaDbEntries: listMediaDbEntries,
        hydrateLocalStorage: hydrateLocalStorage,
        hydrateMediaCache: hydrateMediaCache,
        hydratePage: hydratePage,
        getSession: getSession,
        signIn: signIn,
        signOut: signOut,
        uploadMediaEntries: uploadMediaEntries,
        removeMediaKeys: removeMediaKeys,
        uploadState: uploadState
    };
}());
