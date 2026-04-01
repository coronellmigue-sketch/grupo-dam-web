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
                    var msg = data && (data.message || data.error) ? (data.message || data.error) : ('GitHub API error ' + response.status);
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

    function githubReadContent(path) {
        return githubRequest('GET', path, {}).then(function (result) {
            return result.data || null;
        });
    }

    function githubPutContent(path, contentBase64, message) {
        function attempt(remainingRetries) {
            return githubReadContent(path).then(function (existing) {
                var body = {
                    message: message || ('Actualiza ' + path),
                    content: contentBase64
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
                            content: contentBase64
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
        return githubReadContent(path).then(function (existing) {
            if (!existing || !existing.sha) {
                console.warn('[DAM Cloud] Cannot delete, no SHA found:', path);
                return;
            }
            var body = {
                message: message || ('Elimina ' + path),
                sha: existing.sha
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
        var encodedPath = encodePath(path);
        var suffix = versionTag ? ('?v=' + encodeURIComponent(String(versionTag))) : '';
        var url = getRawBase() + '/' + encodedPath + suffix;
        return url;
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
        console.log('[DAM Cloud] Validando token de GitHub...');
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
            console.log('[DAM Cloud] ✓ Token válido');
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
            var count = entries && entries.length ? entries.length : 0;
            console.log('[DAM Cloud] ◆ Iniciando upload de ' + count + ' archivo(s) media');
            
            var mediaMap = {};
            var validEntries = (entries || []).filter(function (entry) {
                return !!(entry && entry.key && (entry.blob instanceof Blob));
            });
            var chain = Promise.resolve();

            validEntries.forEach(function (entry) {
                chain = chain.then(function () {
                    var path = getMediaPath(entry.key);
                    mediaMap[entry.key] = {
                        path: path,
                        contentType: entry.blob.type || 'application/octet-stream',
                        updatedAt: new Date().toISOString(),
                        size: Number(entry.blob.size || 0)
                    };

                    console.log('[DAM Cloud] · Preparando ' + entry.key + ' (' + entry.blob.size + ' bytes, ' + entry.blob.type + ')');

                    return blobToBase64(entry.blob)
                        .then(function (base64Content) {
                            console.log('[DAM Cloud] · Base64 listo: ' + base64Content.length + ' chars para ' + entry.key);
                            return githubPutContent(path, base64Content, 'DAM: media ' + entry.key);
                        })
                        .then(function () {
                            console.log('[DAM Cloud] ✓ Publicado: ' + entry.key);
                        })
                        .catch(function (error) {
                            console.error('[DAM Cloud] ✗ Error en ' + entry.key + ':', error);
                            throw error;
                        });
                });
            });

            return chain.then(function () {
                console.log('[DAM Cloud] ✓✓✓ Todos los archivos media publicados');
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

    function uploadState(state) {
        return ensureWritableSession().then(function () {
            var payload = normalizeState(state);
            return backupCurrentRemoteState()
                .then(function () {
                    return uploadStateRaw(payload);
                })
                .then(function () {
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
}());
