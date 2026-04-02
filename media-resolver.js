(function () {
    'use strict';

    var IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'avif'];
    var VIDEO_EXTS = ['mp4', 'webm', 'mov', 'm4v'];
    var ALL_EXTS = IMAGE_EXTS.concat(VIDEO_EXTS);
    var VIDEO_FIRST_EXTS = VIDEO_EXTS.concat(IMAGE_EXTS);
    var PROBE_CACHE = {};

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

    function isMediaPath(path) {
        var clean = String(path || '').toLowerCase();
        return clean.indexOf('media/') !== -1;
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

    function probe(url) {
        if (PROBE_CACHE[url] !== undefined) {
            return Promise.resolve(PROBE_CACHE[url]);
        }

        return fetch(url, { method: 'HEAD', cache: 'no-store' })
            .then(function (res) {
                var ok = !!(res && res.ok);
                PROBE_CACHE[url] = ok;
                return ok;
            })
            .catch(function () {
                return fetch(url, { method: 'GET', cache: 'no-store' })
                    .then(function (res) {
                        var ok = !!(res && res.ok);
                        PROBE_CACHE[url] = ok;
                        return ok;
                    })
                    .catch(function () {
                        PROBE_CACHE[url] = false;
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
        video.playsInline = true;
        video.controls = false;
        video.setAttribute('aria-label', img.getAttribute('alt') || 'Video DAM');
        video.style.width = img.style.width || '100%';
        video.style.height = img.style.height || '100%';
        video.style.objectFit = img.style.objectFit || 'cover';
        img.parentNode.replaceChild(video, img);
    }

    function replaceVideoWithImg(video, resolvedUrl) {
        var img = document.createElement('img');
        cloneBaseAttributes(video, img);
        img.src = resolvedUrl;
        img.alt = video.getAttribute('aria-label') || video.getAttribute('title') || 'Imagen DAM';
        img.style.width = video.style.width || '100%';
        img.style.height = video.style.height || '100%';
        img.style.objectFit = video.style.objectFit || 'cover';
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
        if (!isMediaPath(rawSrc)) return;

        img.dataset.mediaResolved = '1';

        resolveFirst(rawSrc, preferredOrderFromElement(img)).then(function (result) {
            if (!result) {
                img.dataset.mediaResolved = '0';
                return;
            }

            if (isVideoExt(result.ext)) {
                if (img.parentNode) {
                    replaceImgWithVideo(img, result.url);
                }
                return;
            }

            img.src = result.url;
        });
    }

    function resolveVideoElement(video) {
        if (!video || video.dataset.mediaResolved === '1') return;

        var rawSrc = video.getAttribute('src') || '';
        if (!isMediaPath(rawSrc)) return;

        video.dataset.mediaResolved = '1';

        var order = preferredOrderFromElement(video);
        if (order === ALL_EXTS) {
            order = VIDEO_FIRST_EXTS;
        }

        resolveFirst(rawSrc, order).then(function (result) {
            if (!result) {
                video.dataset.mediaResolved = '0';
                return;
            }

            if (isVideoExt(result.ext)) {
                video.src = result.url;
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
        resolveFirst('media/' + code).then(function (result) {
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
        scope.querySelectorAll('img[src*="media/"]').forEach(resolveImgElement);
        scope.querySelectorAll('video[src*="media/"]').forEach(resolveVideoElement);
        scope.querySelectorAll('[data-media-bg-code]').forEach(resolveBackgroundCode);
    }

    function observeMutations() {
        if (!window.MutationObserver) return;
        var observer = new MutationObserver(function (records) {
            records.forEach(function (record) {
                Array.prototype.slice.call(record.addedNodes || []).forEach(function (node) {
                    if (!node || node.nodeType !== 1) return;
                    if (node.matches && node.matches('img[src*="media/"], video[src*="media/"], [data-media-bg-code]')) {
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
