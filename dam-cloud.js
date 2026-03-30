(function () {
    'use strict';

    var DEFAULTS = {
        enabled: false,
        supabaseUrl: '',
        supabaseAnonKey: '',
        bucket: 'dam-site',
        statePath: 'state/main.json',
        mediaPrefix: 'media/',
        adminEmail: ''
    };

    var stateCache = null;
    var statePromise = null;
    var client = null;
    var MEDIA_META_KEY = 'dam-cloud-media-meta';

    function readConfig() {
        var cfg = window.DAM_CLOUD_CONFIG || {};
        return Object.assign({}, DEFAULTS, cfg);
    }

    function isPlaceholder(value) {
        return !value || /your-|example|reemplaza|pegue|pega/i.test(String(value));
    }

    function isEnabled() {
        var cfg = readConfig();
        return !!(cfg.enabled && !isPlaceholder(cfg.supabaseUrl) && !isPlaceholder(cfg.supabaseAnonKey));
    }

    function ensureClient() {
        if (!isEnabled()) {
            return null;
        }
        if (client) {
            return client;
        }
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            throw new Error('Supabase client no disponible');
        }
        var cfg = readConfig();
        client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
        return client;
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

    function buildPublicUrl(path) {
        var cfg = readConfig();
        var base = String(cfg.supabaseUrl || '').replace(/\/$/, '');
        var bucket = encodeURIComponent(cfg.bucket);
        var cleanPath = String(path || '').split('/').map(encodeURIComponent).join('/');
        return base + '/storage/v1/object/public/' + bucket + '/' + cleanPath;
    }

    function getStatePublicUrl() {
        return buildPublicUrl(readConfig().statePath);
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

        statePromise = fetchJson(getStatePublicUrl() + '?t=' + Date.now()).then(function (data) {
            stateCache = normalizeState(data);
            return stateCache;
        }).catch(function () {
            stateCache = normalizeState(null);
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
        return buildPublicUrl(getMediaPath(key, snapshot));
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

    function fetchBlob(url) {
        return fetch(url, { cache: 'default' }).then(function (response) {
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error('No se pudo descargar asset remoto (' + response.status + ')');
            }
            return response.blob();
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
                return fetchBlob(url).then(function (blob) {
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
        try {
            var supabaseClient = ensureClient();
            if (!supabaseClient) {
                return Promise.resolve(null);
            }
            return supabaseClient.auth.getSession().then(function (result) {
                return result && result.data ? result.data.session : null;
            });
        } catch (error) {
            return Promise.resolve(null);
        }
    }

    function signIn(email, password) {
        var supabaseClient = ensureClient();
        if (!supabaseClient) {
            return Promise.reject(new Error('Nube no configurada'));
        }
        return supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        }).then(function (result) {
            if (result.error) {
                throw result.error;
            }
            return result.data;
        });
    }

    function signOut() {
        var supabaseClient = ensureClient();
        if (!supabaseClient) {
            return Promise.resolve();
        }
        return supabaseClient.auth.signOut();
    }

    function uploadMediaEntries(entries) {
        var supabaseClient = ensureClient();
        if (!supabaseClient) {
            return Promise.reject(new Error('Nube no configurada'));
        }
        var bucket = readConfig().bucket;
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
            return supabaseClient.storage.from(bucket).upload(path, entry.blob, {
                upsert: true,
                contentType: entry.blob.type || 'application/octet-stream'
            }).then(function (result) {
                if (result.error) {
                    throw result.error;
                }
            });
        })).then(function () {
            return mediaMap;
        });
    }

    function removeMediaKeys(keys) {
        var supabaseClient = ensureClient();
        if (!supabaseClient) {
            return Promise.resolve();
        }
        var bucket = readConfig().bucket;
        var paths = (keys || []).map(function (key) {
            return getMediaPath(key);
        });
        if (!paths.length) {
            return Promise.resolve();
        }
        return supabaseClient.storage.from(bucket).remove(paths).then(function (result) {
            if (result.error) {
                throw result.error;
            }
        });
    }

    function uploadState(state) {
        var supabaseClient = ensureClient();
        if (!supabaseClient) {
            return Promise.reject(new Error('Nube no configurada'));
        }
        var cfg = readConfig();
        var payload = normalizeState(state);
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        return supabaseClient.storage.from(cfg.bucket).upload(cfg.statePath, blob, {
            upsert: true,
            contentType: 'application/json'
        }).then(function (result) {
            if (result.error) {
                throw result.error;
            }
            stateCache = payload;
            return payload;
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
