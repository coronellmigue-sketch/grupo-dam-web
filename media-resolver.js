(function () {
    'use strict';

    var IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'avif'];
    var VIDEO_EXTS = ['mp4', 'webm', 'mov', 'm4v'];
    var ALL_EXTS = IMAGE_EXTS.concat(VIDEO_EXTS);
    var VIDEO_FIRST_EXTS = VIDEO_EXTS.concat(IMAGE_EXTS);
    // Buscar primero en la raiz del proyecto y luego en media/
    var CODE_PREFIXES = ['', 'media/'];
    var PROBE_CACHE = {};
    var FAIL_RETRY_MS = 15000;
    var RESOLVE_CACHE_KEY = 'dam-media-resolve-cache-v1';
    var CODE_RE = /^\d{3}(-(\d{2}|[ni]\d{2}))?$/i;
    var RESOLVE_CACHE = loadResolveCache();

    function loadResolveCache() {
        try {
            var raw = localStorage.getItem(RESOLVE_CACHE_KEY);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function saveResolveCache() {
        try {
            localStorage.setItem(RESOLVE_CACHE_KEY, JSON.stringify(RESOLVE_CACHE));
        } catch (error) {}
    }

    function resolveCacheKey(codeKey, preferredOrder) {
        var order = Array.isArray(preferredOrder) && preferredOrder.length ? preferredOrder.join(',') : 'all';
        return String(codeKey || '') + '|' + order;
    }

    function splitUrl(url) {
        var value = String(url || '');
        var queryIndex = value.indexOf('?');
        var hashIndex = value.indexOf('#');
        var cut = value.length;

        if (queryIndex >= 0) cut = Math.min(cut, queryIndex);
        if (hashIndex >= 0) cut = Math.min(cut, hashIndex);

        return {
            main: value.slice(0, cut),
            suffix: value.slice(cut)
        };
    }

    function removeKnownExtension(path) {
        return String(path || '').replace(/\.(png|jpg|jpeg|webp|avif|mp4|webm|mov|m4v)$/i, '');
    }

    function stripKnownPrefix(path) {
        var clean = String(path || '').replace(/^\.\//, '');
        return clean.replace(/^media\//i, '');
    }

    function extensionOf(path) {
        var match = String(path || '').match(/\.([a-z0-9]+)$/i);
        return match ? match[1].toLowerCase() : '';
    }

    function isVideoExt(ext) {
        return VIDEO_EXTS.indexOf(String(ext || '').toLowerCase()) !== -1;
    }

    function buildCandidates(base, suffix, preferredOrder) {
        var exts = Array.isArray(preferredOrder) && preferredOrder.length ? preferredOrder : ALL_EXTS;
        return exts.map(function (ext) {
            return {
                ext: ext,
                url: base + '.' + ext + (suffix || '')
            };
        });
    }

    function buildCandidatesByCode(codeKey, suffix, preferredOrder) {
        var exts = Array.isArray(preferredOrder) && preferredOrder.length ? preferredOrder : ALL_EXTS;
        var candidates = [];

        CODE_PREFIXES.forEach(function (prefix) {
            exts.forEach(function (ext) {
                candidates.push({
                    ext: ext,
                    url: prefix + codeKey + '.' + ext + (suffix || '')
                });
            });
        });

        return candidates;
    }

    function probe(url) {
        var cached = PROBE_CACHE[url];
        if (cached && cached.ok === true) {
            return Promise.resolve(true);
        }
        if (cached && cached.ok === false && (Date.now() - cached.ts) < FAIL_RETRY_MS) {
            return Promise.resolve(false);
        }

        return fetch(url, { method: 'HEAD', cache: 'force-cache' })
            .then(function (res) {
                var ok = !!(res && res.ok);
                PROBE_CACHE[url] = { ok: ok, ts: Date.now() };
                return ok;
            })
            .catch(function () {
                return fetch(url, { method: 'GET', cache: 'force-cache' })
                    .then(function (res) {
                        var ok = !!(res && res.ok);
                        PROBE_CACHE[url] = { ok: ok, ts: Date.now() };
                        return ok;
                    })
                    .catch(function () {
                        PROBE_CACHE[url] = { ok: false, ts: Date.now() };
                        return false;
                    });
            });
    }

    function resolveFirst(baseWithOptionalExtAndSuffix, preferredOrder) {
        var split = splitUrl(baseWithOptionalExtAndSuffix);
        var base = removeKnownExtension(split.main);
        var candidates = buildCandidates(base, split.suffix, preferredOrder);

        return candidates.reduce(function (chain, candidate) {
            return chain.then(function (found) {
                if (found) return found;
                return probe(candidate.url).then(function (ok) {
                    return ok ? candidate : null;
                });
            });
        }, Promise.resolve(null));
    }

    function extractCodeKey(rawPath) {
        var split = splitUrl(rawPath);
        var main = stripKnownPrefix(split.main);
        var parts = main.split('/');
        var last = parts[parts.length - 1] || '';
        var base = removeKnownExtension(last);
        return CODE_RE.test(base) ? base : null;
    }

    function resolveByCode(rawPath, preferredOrder) {
        var split = splitUrl(rawPath);
        var codeKey = extractCodeKey(rawPath);
        if (!codeKey) {
            return resolveFirst(rawPath, preferredOrder);
        }

        var cacheKey = resolveCacheKey(codeKey, preferredOrder);
        var cachedUrl = RESOLVE_CACHE[cacheKey];
        if (cachedUrl) {
            return Promise.resolve({
                ext: extensionOf(cachedUrl),
                url: cachedUrl
            });
        }

        var candidates = buildCandidatesByCode(codeKey, split.suffix, preferredOrder);
        return candidates.reduce(function (chain, candidate) {
            return chain.then(function (found) {
                if (found) return found;
                return probe(candidate.url).then(function (ok) {
                    if (!ok) return null;
                    RESOLVE_CACHE[cacheKey] = candidate.url;
                    saveResolveCache();
                    return candidate;
                });
            });
        }, Promise.resolve(null));
    }

    function cloneBaseAttributes(fromEl, toEl) {
        Array.prototype.slice.call(fromEl.attributes || []).forEach(function (attr) {
            if (attr.name === 'src') return;
            toEl.setAttribute(attr.name, attr.value);
        });
    }

    function replaceImgWithVideo(img, resolvedUrl) {
        var video = document.createElement('video');
        cloneBaseAttributes(img, video);
        video.src = resolvedUrl;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.controls = false;
        video.setAttribute('aria-label', img.getAttribute('alt') || 'Video DAM');
        video.style.width = img.style.width || '100%';
        video.style.height = img.style.height || '100%';
        video.style.objectFit = img.style.objectFit || 'cover';
        if (video.classList) {
            video.classList.add('is-visible');
        }
        img.parentNode.replaceChild(video, img);
        try {
            var playResult = video.play();
            if (playResult && typeof playResult.catch === 'function') {
                playResult.catch(function () {});
            }
        } catch (error) {}
    }

    function replaceVideoWithImg(video, resolvedUrl) {
        var img = document.createElement('img');
        cloneBaseAttributes(video, img);
        img.src = resolvedUrl;
        img.alt = video.getAttribute('aria-label') || video.getAttribute('title') || 'Imagen DAM';
        img.style.width = video.style.width || '100%';
        img.style.height = video.style.height || '100%';
        img.style.objectFit = video.style.objectFit || 'cover';
        if (img.classList) {
            img.classList.add('is-visible');
        }
        video.parentNode.replaceChild(img, video);
    }

    function preferredOrderFromElement(el) {
        var prefer = String((el && el.getAttribute('data-media-prefer')) || '').toLowerCase().trim();
        if (prefer === 'video') return VIDEO_FIRST_EXTS;
        if (prefer === 'image' || prefer === 'img') return IMAGE_EXTS.concat(VIDEO_EXTS);
        return ALL_EXTS;
    }

    function resolveImgElement(img) {
        if (!img || img.dataset.mediaResolved === '1') return;

        var rawSrc = img.getAttribute('src') || '';
        if (!extractCodeKey(rawSrc)) return;

        img.dataset.mediaResolved = '1';

        resolveByCode(rawSrc, preferredOrderFromElement(img)).then(function (result) {
            if (!result) {
                img.dataset.mediaResolved = '0';
                if (img.classList) {
                    img.classList.add('is-visible');
                }
                return;
            }

            if (isVideoExt(result.ext)) {
                if (img.parentNode) {
                    replaceImgWithVideo(img, result.url);
                }
                return;
            }

            img.src = result.url;
            if (img.classList) {
                img.classList.add('is-visible');
            }
        });
    }

    function resolveVideoElement(video) {
        if (!video || video.dataset.mediaResolved === '1') return;

        var rawSrc = video.getAttribute('src') || '';
        if (!extractCodeKey(rawSrc)) return;

        video.dataset.mediaResolved = '1';

        var order = preferredOrderFromElement(video);
        if (order === ALL_EXTS) {
            order = VIDEO_FIRST_EXTS;
        }

        resolveByCode(rawSrc, order).then(function (result) {
            if (!result) {
                video.dataset.mediaResolved = '0';
                if (video.classList) {
                    video.classList.add('is-visible');
                }
                return;
            }

            if (isVideoExt(result.ext)) {
                video.src = result.url;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.defaultMuted = true;
                video.playsInline = true;
                video.setAttribute('muted', '');
                video.setAttribute('playsinline', '');
                try {
                    video.load();
                    var playResult = video.play();
                    if (playResult && typeof playResult.catch === 'function') {
                        playResult.catch(function () {});
                    }
                } catch (error) {}
                if (video.classList) {
                    video.classList.add('is-visible');
                }
                return;
            }

            if (video.parentNode) {
                replaceVideoWithImg(video, result.url);
            }
        });
    }

    function resolveBackgroundCode(el) {
        if (!el || el.dataset.mediaBgResolved === '1') return;
        var code = String(el.getAttribute('data-media-bg-code') || '').trim();
        if (!code) return;

        el.dataset.mediaBgResolved = '1';
        resolveByCode(code, IMAGE_EXTS.concat(VIDEO_EXTS)).then(function (result) {
            if (!result) {
                el.dataset.mediaBgResolved = '0';
                return;
            }
            if (isVideoExt(result.ext)) {
                return;
            }
            el.style.backgroundImage = 'url("' + result.url + '")';
        });
    }

    function scan(root) {
        var scope = root || document;
        scope.querySelectorAll('img[src]').forEach(resolveImgElement);
        scope.querySelectorAll('video[src]').forEach(resolveVideoElement);
        scope.querySelectorAll('[data-media-bg-code]').forEach(resolveBackgroundCode);
    }

    function observeMutations() {
        if (!window.MutationObserver) return;
        var observer = new MutationObserver(function (records) {
            records.forEach(function (record) {
                Array.prototype.slice.call(record.addedNodes || []).forEach(function (node) {
                    if (!node || node.nodeType !== 1) return;
                    if (node.matches && node.matches('img[src], video[src], [data-media-bg-code]')) {
                        scan(node.parentNode || node);
                    } else if (node.querySelectorAll) {
                        scan(node);
                    }
                });
            });
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            scan(document);
            observeMutations();
        });
    } else {
        scan(document);
        observeMutations();
    }
})();
