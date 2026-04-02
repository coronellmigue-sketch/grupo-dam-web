(function () {
    'use strict';

    var DEFAULTS = {
        enabled: false,
        provider: 'github',
        apiBaseUrl: '',
        mediaBaseUrl: '',
        wixStateUrl: '',
        wixManagerUrl: '',
        adminTokenStorageKey: 'dam-do-admin-token',
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
    var authTokenMemory = '';

    function readConfig() {
        var cfg = window.DAM_CLOUD_CONFIG || {};
        var merged = Object.assign({}, DEFAULTS, cfg);
        merged.provider = String(merged.provider || 'github').toLowerCase();
        if (merged.provider !== 'github' && merged.provider !== 'doapi' && merged.provider !== 'wix') {
            merged.provider = 'github';
        }
        return merged;
    }

    function isPlaceholder(value) {
        return !value || /your-|example|reemplaza|pegue|pega/i.test(String(value));
    }

    function isEnabled() {
        var cfg = readConfig();
        if (!cfg.enabled) {
            return false;
        }
        if (cfg.provider === 'wix') {
            return !!(!isPlaceholder(cfg.wixStateUrl));
        }
        if (cfg.provider === 'doapi') {
            return !!(!isPlaceholder(cfg.apiBaseUrl) && !isPlaceholder(cfg.mediaBaseUrl));
        }
        return !!(!isPlaceholder(cfg.githubOwner) && !isPlaceholder(cfg.githubRepo));
    }

    function tokenStorageKey() {
        var cfg = readConfig();
        if (cfg.provider === 'wix') {
            return '__dam-wix-no-token__';
        }
        if (cfg.provider === 'doapi') {
            return String(cfg.adminTokenStorageKey || DEFAULTS.adminTokenStorageKey);
        }
        return String(cfg.githubTokenStorageKey || DEFAULTS.githubTokenStorageKey);
    }

    function readAuthToken() {
        if (authTokenMemory) {
            return authTokenMemory;
        }
        var key = tokenStorageKey();
        try {
            var sessionToken = window.sessionStorage.getItem(key);
            if (sessionToken) {
                authTokenMemory = sessionToken;
                return sessionToken;
            }
        } catch (error) {}
        try {
            var localToken = window.localStorage.getItem(key) || '';
            if (localToken) {
                authTokenMemory = localToken;
            }
            return localToken;
        } catch (error) {
            return authTokenMemory || '';
        }
    }

    function writeAuthToken(token, persist) {
        var key = tokenStorageKey();
        authTokenMemory = String(token || '');
        try { window.sessionStorage.removeItem(key); } catch (error) {}
        try { window.localStorage.removeItem(key); } catch (error) {}
        if (!token) {
            authTokenMemory = '';
            return;
        }
        if (persist === false) {
            var wroteSession = false;
            try {
                window.sessionStorage.setItem(key, token);
                wroteSession = true;
            } catch (error) {}
            if (!wroteSession) {
                try { window.localStorage.setItem(key, token); } catch (error2) {}
            }
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
        if (cfg.provider === 'wix') {
            return {
                provider: 'wix',
                wixStateUrl: String(cfg.wixStateUrl || '').trim(),
                wixManagerUrl: String(cfg.wixManagerUrl || '').trim(),
                mediaBaseUrl: String(cfg.mediaBaseUrl || '').replace(/\/+$/, '')
            };
        }
        if (cfg.provider === 'doapi') {
            return {
                provider: 'doapi',
                apiBaseUrl: String(cfg.apiBaseUrl || '').replace(/\/+$/, ''),
                mediaBaseUrl: String(cfg.mediaBaseUrl || '').replace(/\/+$/, ''),
                token: readAuthToken()
            };
        }
        return {
            provider: 'github',
            owner: cfg.githubOwner,
            repo: cfg.githubRepo,
            branch: cfg.githubBranch,
            token: readAuthToken()
        };
    }

    function getDoApiBase() {
        return String(readConfig().apiBaseUrl || '').replace(/\/+$/, '');
    }

    function getWixStateUrl() {
        return String(readConfig().wixStateUrl || '').trim();
    }

    function getWixManagerUrl() {
        return String(readConfig().wixManagerUrl || '').trim();
    }

    function getWixInlineState() {
        var cfg = readConfig();
        var inline = cfg.wixInlineState || window.DAM_WIX_INLINE_STATE || null;
        if (!inline || typeof inline !== 'object') {
            return null;
        }
        return inline;
    }

    function getMediaBase() {
        return String(readConfig().mediaBaseUrl || '').replace(/\/+$/, '');
    }

    function isAbsoluteUrl(value) {
        return /^https?:\/\//i.test(String(value || '').trim());
    }

    function normalizeDoApiMessage(message, status) {
        var text = String(message || '').trim();
        if (!text) {
            return status ? ('Servidor devolvio error ' + status + '.') : 'Error del servidor.';
        }
        if (/unauthorized|forbidden|token/i.test(text) || status === 401 || status === 403) {
            return 'Token admin invalido o sin permisos para DigitalOcean API.';
        }
        return text;
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

    function getRepoApiUrl() {
        var cfg = readConfig();
        return 'https://api.github.com/repos/' +
            encodeURIComponent(cfg.githubOwner) + '/' +
            encodeURIComponent(cfg.githubRepo);
    }

    function normalizeGitHubMessage(message, status) {
        var text = String(message || '').trim();
        if (!text) {
            return status ? ('GitHub devolvio error ' + status + '.') : 'Error de GitHub.';
        }
        if (/resource not accessible by personal access token/i.test(text)) {
            return 'Tu token no tiene acceso a este repositorio. Crea un token con acceso a coronellmigue-sketch/grupo-dam-web y permisos Contents: Read and write, Metadata: Read.';
        }
        if (/bad credentials|requires authentication/i.test(text)) {
            return 'El token de GitHub es invalido o vencio.';
        }
        if (status === 403) {
            return 'GitHub rechazo el acceso. Verifica que el token tenga permisos Contents: Read and write sobre este repositorio.';
        }
        if (status === 404) {
            return 'El token no puede ver este repositorio. Debes autorizar coronellmigue-sketch/grupo-dam-web en el token.';
        }
        return text;
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

    function wait(ms) {
        return new Promise(function (resolve) {
            window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
        });
    }

    function githubRequest(method, path, options) {
        var settings = options || {};
        var token = settings.token !== undefined ? settings.token : readAuthToken();
        var cleanPath = encodePath(String(path || ''));
        var cfg = readConfig();
        var url = getApiBase() + '/' + cleanPath;
        if (String(method || '').toUpperCase() === 'GET') {
            url += '?ref=' + encodeURIComponent(cfg.githubBranch);
        }
        
        console.log('[DAM Cloud] → GitHub Request', { method: method, path: cleanPath, url: url, hasAuth: !!token });
        
        var headers = {
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers.Authorization = 'Bearer ' + token;
        }

        var body = settings.jsonBody !== undefined ? JSON.stringify(settings.jsonBody) : undefined;
        
        return fetch(url, {
            method: method,
            headers: headers,
            body: body
        }).then(function (response) {
            var statusOk = response.ok || response.status === 204;
            console.log('[DAM Cloud] ← Response', { method: method, status: response.status, ok: statusOk, path: cleanPath });
            
            if (response.status === 204) {
                return { ok: true, data: null, status: response.status };
            }
            
            return response.text().then(function (text) {
                var data = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (parseError) {
                    console.warn('[DAM Cloud] JSON parse failed:', parseError);
                    data = null;
                }
                
                if (!statusOk) {
                    var rawMsg = data && (data.message || data.error) ? (data.message || data.error) : ('GitHub API error ' + response.status);
                    var msg = normalizeGitHubMessage(rawMsg, response.status);
                    if (response.status === 401) {
                        clearAuthToken();
                    }
                    console.error('[DAM Cloud] ✗ API Error:', { 
                        method: method, 
                        status: response.status, 
                        path: cleanPath, 
                        message: msg, 
                        githubResponse: data 
                    });
                    var err = new Error(msg);
                    err.status = response.status;
                    err.githubData = data;
                    throw err;
                }
                
                return { ok: true, data: data, status: response.status };
            });
        }).catch(function (error) {
            console.error('[DAM Cloud] ✗ Fetch Error:', { error: error.message, status: error.status });
            throw error;
        });
    }

    function doApiRequest(method, path, options) {
        var settings = options || {};
        var base = getDoApiBase();
        var cleanPath = String(path || '').replace(/^\/+/, '');
        var url = base + '/' + cleanPath;
        if (settings.query && typeof settings.query === 'object') {
            var keys = Object.keys(settings.query);
            if (keys.length) {
                var qs = keys.map(function (key) {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(String(settings.query[key]));
                }).join('&');
                url += (url.indexOf('?') >= 0 ? '&' : '?') + qs;
            }
        }

        var headers = Object.assign({}, settings.headers || {});
        var token = settings.token !== undefined ? settings.token : readAuthToken();
        if (token) {
            headers.Authorization = 'Bearer ' + token;
        }

        var body = settings.body;
        if (settings.jsonBody !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(settings.jsonBody);
        }

        return fetch(url, {
            method: method,
            headers: headers,
            body: body
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
                    var rawMsg = data && (data.message || data.error) ? (data.message || data.error) : ('API error ' + response.status);
                    var msg = normalizeDoApiMessage(rawMsg, response.status);
                    if (response.status === 401 || response.status === 403) {
                        clearAuthToken();
                    }
                    var err = new Error(msg);
                    err.status = response.status;
                    err.apiData = data;
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
        var cfg = readConfig();
        function attempt(remainingRetries) {
            return githubReadContent(path).then(function (existing) {
                var body = {
                    message: message || ('Actualiza ' + path),
                    content: contentBase64,
                    branch: cfg.githubBranch
                };
                if (existing && existing.sha) {
                    body.sha = existing.sha;
                }

                console.log('[DAM Cloud] PUT Content:', { path: path, hasSha: !!body.sha, contentLength: contentBase64 ? contentBase64.length : 0, retriesLeft: remainingRetries });

                return githubRequest('PUT', path, { jsonBody: body }).then(function (result) {
                    console.log('[DAM Cloud] ✓ PUT Success:', path);
                    return result.data;
                });
            }).catch(function (error) {
                if (error && error.status === 404) {
                    console.log('[DAM Cloud] File not found, creating new:', path);
                    return githubRequest('PUT', path, {
                        jsonBody: {
                            message: message || ('Crea ' + path),
                            content: contentBase64,
                            branch: cfg.githubBranch
                        }
                    }).then(function (result) {
                        console.log('[DAM Cloud] ✓ PUT Create Success:', path);
                        return result.data;
                    });
                }

                if (error && (error.status === 409 || error.status === 422) && remainingRetries > 0) {
                    console.warn('[DAM Cloud] Retry PUT after conflict:', { path: path, status: error.status, retriesLeft: remainingRetries });
                    return wait(450).then(function () {
                        return attempt(remainingRetries - 1);
                    });
                }

                throw error;
            });
        }

        return attempt(2);
    }

    function githubDeleteContent(path, message) {
        var cfg = readConfig();
        return githubReadContent(path).then(function (existing) {
            if (!existing || !existing.sha) {
                console.warn('[DAM Cloud] Cannot delete, no SHA found:', path);
                return;
            }
            var body = {
                message: message || ('Elimina ' + path),
                sha: existing.sha,
                branch: cfg.githubBranch
            };
            return githubRequest('DELETE', path, { jsonBody: body }).then(function () {
                console.log('[DAM Cloud] ✓ DELETE Success:', path);
                return;
            });
        }).catch(function (error) {
            if (error && error.status === 404) {
                console.log('[DAM Cloud] File already deleted:', path);
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
        if (isAbsoluteUrl(path)) {
            var absolutePath = String(path || '').trim();
            var absoluteSuffix = versionTag ? ((absolutePath.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(String(versionTag))) : '';
            return absolutePath + absoluteSuffix;
        }
        if (readConfig().provider === 'wix') {
            var wixBase = getMediaBase();
            if (!wixBase) {
                return String(path || '');
            }
            var wixPath = String(path || '').replace(/^\/+/, '');
            var wixSuffix = versionTag ? ('?v=' + encodeURIComponent(String(versionTag))) : '';
            return wixBase + '/' + encodePath(wixPath) + wixSuffix;
        }
        if (readConfig().provider === 'doapi') {
            var base = getMediaBase();
            var directPath = String(path || '').replace(/^\/+/, '');
            var doSuffix = versionTag ? ('?v=' + encodeURIComponent(String(versionTag))) : '';
            return base + '/' + encodePath(directPath) + doSuffix;
        }
        var encodedPath = encodePath(path);
        var suffix = versionTag ? ('?v=' + encodeURIComponent(String(versionTag))) : '';
        var url = getRawBase() + '/' + encodedPath + suffix;
        return url;
    }

    function getStatePublicUrl() {
        if (readConfig().provider === 'wix') {
            if (getWixInlineState()) {
                return 'inline://dam-wix-state';
            }
            var wixStateUrl = getWixStateUrl();
            if (!wixStateUrl) {
                return '';
            }
            return wixStateUrl + (wixStateUrl.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
        }
        if (readConfig().provider === 'doapi') {
            return getDoApiBase() + '/dam/state?_=' + Date.now();
        }
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

        if (readConfig().provider === 'wix') {
            var inlineState = getWixInlineState();
            if (inlineState) {
                stateCache = normalizeState(inlineState);
                return Promise.resolve(stateCache);
            }
            statePromise = fetchJson(getStatePublicUrl())
                .catch(function () {
                    return null;
                })
                .then(function (data) {
                    stateCache = normalizeState(data);
                    return stateCache;
                }).finally(function () {
                    statePromise = null;
                });
            return statePromise;
        }

        if (readConfig().provider === 'doapi') {
            statePromise = doApiRequest('GET', 'dam/state', { query: { _: Date.now() } })
                .then(function (result) {
                    return result && result.data ? result.data : null;
                })
                .catch(function () {
                    return null;
                })
                .then(function (data) {
                    stateCache = normalizeState(data);
                    return stateCache;
                }).finally(function () {
                    statePromise = null;
                });
            return statePromise;
        }

        var statePath = readConfig().statePath;
        statePromise = fetchJson(buildPublicUrl(statePath, Date.now()))
            .catch(function () {
                console.log('[DAM Cloud] Retry reading state via GitHub API');
                return githubReadContent(statePath).then(function (content) {
                    if (!content || !content.content) {
                        return null;
                    }
                    try {
                        return JSON.parse(decodeUtf8Base64(content.content));
                    } catch (error) {
                        console.error('[DAM Cloud] Error parsing state:', error);
                        return null;
                    }
                }).catch(function () {
                    return null;
                });
            }).then(function (data) {
                stateCache = normalizeState(data);
                console.log('[DAM Cloud] ✓ State loaded');
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
        if (readConfig().provider === 'wix') {
            return '';
        }
        var prefix = readConfig().mediaPrefix;
        return prefix + encodeURIComponent(String(key || ''));
    }

    function getMediaPublicUrl(key, state) {
        var snapshot = state || stateCache;
        var record = snapshot ? getMediaRecord(key, snapshot) : null;
        
        if (snapshot && !record) {
            return '';
        }
        
        var path = getMediaPath(key, snapshot);
        var tag = record && record.updatedAt ? record.updatedAt : Date.now();
        var url = buildPublicUrl(path, tag);
        
        return url;
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
        }).catch(function (error) {
            if (error && error.status === 404) {
                return null;
            }
            throw error;
        });
    }

    function fetchBlobRobust(path, contentType, versionTag) {
        if (readConfig().provider === 'wix') {
            if (!path) {
                return Promise.resolve(null);
            }
            return fetchBlobByUrl(buildPublicUrl(path, versionTag || Date.now())).catch(function () {
                return null;
            });
        }
        if (readConfig().provider === 'doapi') {
            return fetchBlobByUrl(buildPublicUrl(path, versionTag || Date.now())).catch(function () {
                return null;
            });
        }
        var url = buildPublicUrl(path, versionTag || Date.now());

        function tryRawFetch(retriesLeft) {
            return fetchBlobByUrl(url).catch(function (error) {
                if (retriesLeft > 0) {
                    return wait(350).then(function () {
                        return tryRawFetch(retriesLeft - 1);
                    });
                }
                throw error;
            });
        }

        return tryRawFetch(1).then(function (blob) {
            if (blob) {
                return blob;
            }
            return fetchBlobViaGithubApi(path, contentType);
        }).catch(function () {
            return fetchBlobViaGithubApi(path, contentType);
        });
    }

    function listRemoteMediaMap() {
        if (!isEnabled()) {
            return Promise.resolve({});
        }
        if (readConfig().provider === 'wix') {
            return loadState(true).then(function (snapshot) {
                return Object.assign({}, (snapshot && snapshot.media) || {});
            }).catch(function () {
                return {};
            });
        }
        if (readConfig().provider === 'doapi') {
            return doApiRequest('GET', 'dam/media-list', {}).then(function (result) {
                var items = result && result.data && Array.isArray(result.data.items) ? result.data.items : [];
                var map = {};
                items.forEach(function (item) {
                    if (!item || !item.key) {
                        return;
                    }
                    map[String(item.key)] = {
                        path: String(item.path || (getMediaPath(item.key))),
                        updatedAt: String(item.updatedAt || ''),
                        size: Number(item.size || 0),
                        contentType: String(item.contentType || '')
                    };
                });
                return map;
            }).catch(function () {
                return {};
            });
        }
        var prefix = String(readConfig().mediaPrefix || 'media/');
        var mediaFolder = prefix.replace(/\/+$/, '');
        if (!mediaFolder) {
            return Promise.resolve({});
        }
        return githubReadContent(mediaFolder).then(function (entries) {
            if (!Array.isArray(entries)) {
                return {};
            }
            var map = {};
            entries.forEach(function (entry) {
                if (!entry || entry.type !== 'file' || !entry.name || entry.name === '.gitkeep') {
                    return;
                }
                var key = String(entry.name);
                map[key] = {
                    path: entry.path || (mediaFolder + '/' + key),
                    updatedAt: '',
                    size: Number(entry.size || 0),
                    contentType: ''
                };
            });
            return map;
        }).catch(function () {
            return {};
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

            function hydrateSingleKey(key) {
                if (!media[key]) {
                    var fallbackPath = getMediaPath(key, snapshot);
                    return fetchBlobRobust(fallbackPath, '').then(function (blob) {
                        if (!blob) {
                            return (deleteMissing ? mediaAssetDelete(key) : Promise.resolve()).then(function () {
                                if (deleteMissing) {
                                    writeMediaMeta(key, null);
                                }
                            });
                        }
                        return mediaAssetPut(key, blob).then(function () {
                            writeMediaMeta(key, {
                                path: fallbackPath,
                                updatedAt: '',
                                size: Number(blob.size || 0),
                                contentType: String(blob.type || '')
                            });
                        });
                    }).catch(function () {
                        return Promise.resolve();
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
                
                return fetchBlobRobust(getMediaPath(key, snapshot), remoteMeta && remoteMeta.contentType, remoteMeta && remoteMeta.updatedAt).then(function (blob) {
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
                }).catch(function (error) {
                    console.warn('[DAM Cloud] Error loading media ' + key + ':', error);
                    return Promise.resolve();
                });
            }

            var chain = Promise.resolve();
            targetKeys.forEach(function (key) {
                chain = chain.then(function () {
                    return hydrateSingleKey(key);
                });
            });

            return chain.then(function () {
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

    function fetchMediaBlobByKey(key, options) {
        var targetKey = String(key || '').trim();
        if (!targetKey) {
            return Promise.resolve(null);
        }
        var settings = options || {};
        var directPath = String(readConfig().mediaPrefix || 'media/') + encodeURIComponent(targetKey);

        function formatResult(blob, path, record) {
            if (!blob) return null;
            return {
                key: targetKey,
                blob: blob,
                meta: record || {
                    path: path,
                    updatedAt: '',
                    size: Number(blob.size || 0),
                    contentType: String(blob.type || '')
                }
            };
        }

        return fetchBlobRobust(directPath, '', Date.now()).then(function (blob) {
            if (blob) {
                return formatResult(blob, directPath, null);
            }

            return loadState(!!settings.forceStateRefresh).catch(function () {
                return normalizeState(null);
            }).then(function (snapshot) {
                var safeSnapshot = snapshot || normalizeState(null);
                var record = normalizeMediaMeta(getMediaRecord(targetKey, safeSnapshot));
                var statePath = (record && record.path) ? record.path : directPath;
                var versionTag = record && record.updatedAt ? record.updatedAt : Date.now();
                return fetchBlobRobust(statePath, record && record.contentType, versionTag).then(function (stateBlob) {
                    return formatResult(stateBlob, statePath, record);
                });
            });
        }).catch(function () {
            return null;
        });
    }

    function getSession() {
        if (readConfig().provider === 'wix') {
            return Promise.resolve({ provider: 'wix', externalAdmin: true, tokenPresent: false });
        }
        var token = readAuthToken();
        if (!token) {
            return Promise.resolve(null);
        }
        return Promise.resolve({ provider: readConfig().provider, tokenPresent: true });
    }

    function signIn(token) {
        if (!isEnabled()) {
            return Promise.reject(new Error('Nube no configurada'));
        }
        if (readConfig().provider === 'wix') {
            return Promise.resolve({ ok: true, externalAdmin: true });
        }
        var cleanToken = String(token || '').trim();
        if (!cleanToken) {
            return Promise.reject(new Error('Token vacio'));
        }

        if (readConfig().provider === 'doapi') {
            return doApiRequest('GET', 'dam/media-list', { token: cleanToken }).then(function () {
                writeAuthToken(cleanToken, false);
                return { ok: true };
            });
        }
        console.log('[DAM Cloud] Validando token de GitHub...');
        return fetch('https://api.github.com/user', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + cleanToken,
                'Accept': 'application/vnd.github+json'
            }
        }).then(function (response) {
            if (!response.ok) {
                throw new Error(normalizeGitHubMessage('bad credentials', response.status));
            }
            return fetch(getRepoApiUrl(), {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + cleanToken,
                    'Accept': 'application/vnd.github+json'
                }
            });
        }).then(function (response) {
            return response.text().then(function (text) {
                var data = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (error) {
                    data = null;
                }
                if (!response.ok) {
                    var repoMsg = data && (data.message || data.error) ? (data.message || data.error) : 'repo-access-error';
                    throw new Error(normalizeGitHubMessage(repoMsg, response.status));
                }
                if (data && data.permissions && data.permissions.push === false) {
                    throw new Error('El token puede ver el repositorio, pero no puede escribir. Dale permiso de escritura Contents: Read and write.');
                }
                writeAuthToken(cleanToken, false);
                console.log('[DAM Cloud] ✓ Token válido y con acceso al repo');
                return { ok: true };
            });
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
        if (readConfig().provider === 'wix') {
            return Promise.reject(new Error('La publicacion se administra desde Wix.'));
        }
        if (!readAuthToken()) {
            return Promise.reject(new Error('Conecta un token admin para publicar cambios.'));
        }
        return Promise.resolve();
    }

    /* Compresses an image Blob to fit under maxBytes using Canvas.
       Falls back to JPEG conversion if PNG is still too large after resize. */
    function compressImageBlob(blob, maxBytes) {
        var limit = maxBytes || 900000; // 900 KB — stays under GitHub's 1 MB API limit
        if (!blob || blob.size <= limit) { return Promise.resolve(blob); }
        if (!blob.type || blob.type.indexOf('image/') !== 0) { return Promise.resolve(blob); }

        return new Promise(function (resolve) {
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.onload = function () {
                URL.revokeObjectURL(url);
                var MAX_DIM = 1920;
                var w = img.width, h = img.height;
                if (w > MAX_DIM || h > MAX_DIM) {
                    if (w >= h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
                    else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
                }
                var canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                var mime = blob.type === 'image/png' ? 'image/png' : 'image/jpeg';
                var q = 0.82;
                canvas.toBlob(function (pass1) {
                    if (pass1 && pass1.size <= limit) {
                        console.log('[DAM Cloud] · Comprimido (' + blob.size + '→' + pass1.size + ' bytes)');
                        resolve(pass1);
                        return;
                    }
                    // Second pass: force JPEG at lower quality
                    canvas.toBlob(function (pass2) {
                        var out = (pass2 && pass2.size <= limit) ? pass2 : (pass2 || blob);
                        console.log('[DAM Cloud] · Compresión forzada JPEG (' + blob.size + '→' + out.size + ' bytes)');
                        resolve(out);
                    }, 'image/jpeg', 0.65);
                }, mime, q);
            };
            img.onerror = function () { URL.revokeObjectURL(url); resolve(blob); };
            img.src = url;
        });
    }

    function uploadMediaEntries(entries) {
        return ensureWritableSession().then(function () {
            if (readConfig().provider === 'doapi') {
                var doMediaMap = {};
                var doEntries = (entries || []).filter(function (entry) {
                    return !!(entry && entry.key && (entry.blob instanceof Blob));
                });
                var doChain = Promise.resolve();
                doEntries.forEach(function (entry) {
                    doChain = doChain.then(function () {
                        return compressImageBlob(entry.blob, 900000).then(function (readyBlob) {
                            var fd = new FormData();
                            fd.append('file', readyBlob, String(entry.key));
                            return doApiRequest('PUT', 'dam/media/' + encodeURIComponent(String(entry.key)), {
                                body: fd,
                                headers: {}
                            }).then(function (result) {
                                var data = result && result.data ? result.data : {};
                                doMediaMap[String(entry.key)] = {
                                    path: String(data.path || getMediaPath(entry.key)),
                                    contentType: String(data.contentType || readyBlob.type || 'application/octet-stream'),
                                    updatedAt: String(data.updatedAt || new Date().toISOString()),
                                    size: Number(data.size || readyBlob.size || 0)
                                };
                            });
                        });
                    });
                });
                return doChain.then(function () {
                    return doMediaMap;
                });
            }

            var count = entries && entries.length ? entries.length : 0;
            console.log('[DAM Cloud] ◆ Iniciando upload de ' + count + ' archivo(s) media');

            var mediaMap = {};
            var skipped = [];
            var validEntries = (entries || []).filter(function (entry) {
                return !!(entry && entry.key && (entry.blob instanceof Blob));
            });
            var chain = Promise.resolve();

            validEntries.forEach(function (entry) {
                chain = chain.then(function () {
                    var path = getMediaPath(entry.key);
                    console.log('[DAM Cloud] · Preparando ' + entry.key + ' (' + entry.blob.size + ' bytes, ' + entry.blob.type + ')');

                    return compressImageBlob(entry.blob, 900000)
                        .then(function (readyBlob) {
                            mediaMap[entry.key] = {
                                path: path,
                                contentType: readyBlob.type || entry.blob.type || 'application/octet-stream',
                                updatedAt: new Date().toISOString(),
                                size: Number(readyBlob.size || 0)
                            };
                            return blobToBase64(readyBlob);
                        })
                        .then(function (base64Content) {
                            console.log('[DAM Cloud] · Base64 listo: ' + base64Content.length + ' chars para ' + entry.key);
                            return githubPutContent(path, base64Content, 'DAM: media ' + entry.key);
                        })
                        .then(function () {
                            console.log('[DAM Cloud] ✓ Publicado: ' + entry.key);
                        })
                        .catch(function (error) {
                            // Log and skip this file — don't abort the whole upload
                            console.error('[DAM Cloud] ✗ Omitido ' + entry.key + ' (' + (error && error.message) + ')');
                            skipped.push(entry.key);
                            delete mediaMap[entry.key];
                        });
                });
            });

            return chain.then(function () {
                if (skipped.length) {
                    console.warn('[DAM Cloud] Archivos omitidos por error:', skipped);
                }
                console.log('[DAM Cloud] ✓✓✓ Upload media completo (' + Object.keys(mediaMap).length + ' subidos, ' + skipped.length + ' omitidos)');
                return mediaMap;
            });
        });
    }

    function removeMediaKeys(keys) {
        return ensureWritableSession().then(function () {
            if (readConfig().provider === 'doapi') {
                var doKeys = (keys || []).map(function (key) { return String(key || '').trim(); }).filter(Boolean);
                var doChain = Promise.resolve();
                doKeys.forEach(function (key) {
                    doChain = doChain.then(function () {
                        return doApiRequest('DELETE', 'dam/media/' + encodeURIComponent(key), {});
                    });
                });
                return doChain.then(function () { return; });
            }

            var paths = (keys || []).map(function (key) {
                return getMediaPath(key);
            });
            if (!paths.length) {
                return Promise.resolve();
            }
            var chain = Promise.resolve();
            paths.forEach(function (path) {
                chain = chain.then(function () {
                    return githubDeleteContent(path, 'DAM: elimina media ' + path);
                });
            });
            return chain.then(function () {
                return;
            });
        });
    }

    function buildStateBackupPath() {
        var now = new Date();
        var y = now.getUTCFullYear();
        var m = String(now.getUTCMonth() + 1).padStart(2, '0');
        var d = String(now.getUTCDate()).padStart(2, '0');
        var hh = String(now.getUTCHours()).padStart(2, '0');
        var mm = String(now.getUTCMinutes()).padStart(2, '0');
        var ss = String(now.getUTCSeconds()).padStart(2, '0');
        return 'state/backups/' + y + '/' + m + '/state-' + y + m + d + '-' + hh + mm + ss + '.json';
    }

    function backupCurrentRemoteState() {
        if (readConfig().provider === 'wix') {
            return Promise.resolve(null);
        }
        if (readConfig().provider === 'doapi') {
            return Promise.resolve(null);
        }
        var cfg = readConfig();
        return githubReadContent(cfg.statePath).then(function (content) {
            if (!content || !content.content) {
                return null;
            }
            var backupPath = buildStateBackupPath();
            return githubPutContent(backupPath, content.content, 'DAM: backup automatico de estado').then(function () {
                console.log('[DAM Cloud] ✓ Backup de estado creado:', backupPath);
                return backupPath;
            });
        }).catch(function (error) {
            if (error && error.status === 404) {
                return null;
            }
            console.warn('[DAM Cloud] No se pudo crear backup de estado:', error);
            return null;
        });
    }

    function uploadStateRaw(payload) {
        if (readConfig().provider === 'wix') {
            return Promise.reject(new Error('La publicacion se administra desde Wix.'));
        }
        if (readConfig().provider === 'doapi') {
            return doApiRequest('PUT', 'dam/state', { jsonBody: payload }).then(function () {
                stateCache = payload;
                return payload;
            });
        }
        var cfg = readConfig();
        var jsonText = JSON.stringify(payload, null, 2);
        console.log('[DAM Cloud] ◆ Publicando estado global (' + jsonText.length + ' bytes)');
        return githubPutContent(cfg.statePath, encodeUtf8Base64(jsonText), 'DAM: estado global').then(function () {
            stateCache = payload;
            console.log('[DAM Cloud] ✓ Estado global publicado');
            return payload;
        });
    }

    function verifyAndRepairRemoteState() {
        return Promise.all([loadState(true), listRemoteMediaMap()]).then(function (results) {
            var snapshot = normalizeState(results[0]);
            var remoteMediaMap = results[1] || {};
            var stateMedia = snapshot.media || {};
            var mergedMedia = Object.assign({}, remoteMediaMap, stateMedia);
            var remoteMediaCount = Object.keys(remoteMediaMap).length;
            var stateMediaCount = Object.keys(stateMedia).length;
            var mergedMediaCount = Object.keys(mergedMedia).length;

            if (remoteMediaCount === 0 || mergedMediaCount <= stateMediaCount) {
                return snapshot;
            }

            console.warn('[DAM Cloud] Se detectaron referencias faltantes en state. Ejecutando auto-reparacion...', {
                remoteMediaCount: remoteMediaCount,
                stateMediaCount: stateMediaCount,
                mergedMediaCount: mergedMediaCount
            });

            var repaired = {
                version: Number(snapshot.version || 1),
                updatedAt: new Date().toISOString(),
                kv: Object.assign({}, snapshot.kv || {}),
                media: mergedMedia
            };

            return uploadStateRaw(repaired).then(function () {
                console.log('[DAM Cloud] ✓ Auto-reparacion de estado completada');
                return repaired;
            });
        });
    }

    function uploadState(state, options) {
        var settings = options || {};
        return ensureWritableSession().then(function () {
            var payload = normalizeState(state);
            var chain = Promise.resolve();
            if (settings.skipBackup !== true) {
                chain = chain.then(function () {
                    return backupCurrentRemoteState();
                });
            }
            return chain.then(function () {
                return uploadStateRaw(payload);
            }).then(function () {
                if (settings.skipVerifyRepair === true) {
                    return payload;
                }
                return verifyAndRepairRemoteState();
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
        fetchMediaBlobByKey: fetchMediaBlobByKey,
        listRemoteMediaMap: listRemoteMediaMap,
        getSession: getSession,
        signIn: signIn,
        signOut: signOut,
        uploadMediaEntries: uploadMediaEntries,
        removeMediaKeys: removeMediaKeys,
        uploadState: uploadState,
        backupCurrentRemoteState: backupCurrentRemoteState,
        verifyAndRepairRemoteState: verifyAndRepairRemoteState
    };

    window.DAMCloud.getWixManagerUrl = getWixManagerUrl;
}());
