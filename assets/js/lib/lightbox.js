// PhotoSwipe v5 lightbox. Replaces the PhotoSwipe v4 `lightbox()` that
// @tryghost/shared-theme-assets bundles (gulpfile.js excludes it), keeping
// the same global signature so the shared main.js call still works.
//
// v5 ships as an ES module, so instead of being concatenated into
// main.min.js it's copied to assets/built/ and only fetched — together with
// its stylesheet — the first time someone hovers or clicks an image. The
// URLs and translated button titles come from partials/pswp.hbs.
var photoSwipePromise;

function loadPhotoSwipe() {
    'use strict';
    if (photoSwipePromise) return photoSwipePromise;

    var template = document.getElementById('pswp');
    if (!template) return Promise.reject(new Error('Missing PhotoSwipe template'));

    // Resolve against the page: <template> content lives in an inert document
    var getUrl = function (selector, attribute) {
        var el = template.content.querySelector(selector);
        return new URL(el.getAttribute(attribute), document.baseURI).href;
    };

    var stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = getUrl('link', 'href');
    var stylesheetLoaded = new Promise(function (resolve, reject) {
        stylesheet.onload = resolve;
        stylesheet.onerror = reject;
    });
    document.head.appendChild(stylesheet);

    photoSwipePromise = Promise.all([
        import(getUrl('script', 'src')),
        stylesheetLoaded,
    ]).then(function (results) {
        var PhotoSwipe = results[0].default;
        return function (options) {
            var pswp = new PhotoSwipe(Object.assign({}, template.dataset, options));
            var inerted = [];

            // PhotoSwipe renders a plain div[role=dialog], not a native modal
            // <dialog>: name it, and make the rest of the page inert while
            // it's open so screen readers can't wander out of it
            pswp.on('firstUpdate', function () {
                pswp.element.setAttribute('aria-label', template.dataset.dialogLabel);
                Array.prototype.forEach.call(document.body.children, function (el) {
                    if (el !== pswp.element && !el.inert) {
                        el.inert = true;
                        inerted.push(el);
                    }
                });
            });
            // Before PhotoSwipe returns focus to the page
            pswp.on('close', function () {
                inerted.forEach(function (el) {
                    el.inert = false;
                });
            });

            return pswp;
        };
    }).catch(function (err) {
        // Let the next click retry instead of caching the failure
        photoSwipePromise = null;
        stylesheet.remove();
        throw err;
    });

    return photoSwipePromise;
}

function lightbox(trigger) {
    'use strict';

    // Ghost only sets width/height on content images; for the rest (feature
    // images) derive the size from the largest srcset candidate and the
    // aspect ratio of what the browser already loaded, so zooming isn't
    // capped at the thumbnail's resolution.
    var getItem = function (image) {
        var width = parseInt(image.getAttribute('width'), 10);
        var height = parseInt(image.getAttribute('height'), 10);

        if (!width || !height) {
            var candidates = (image.srcset.match(/\s\d+(?=w\s*(,|$))/g) || []).map(Number);
            width = Math.max.apply(null, candidates.concat(image.naturalWidth));
            height = Math.round(width * image.naturalHeight / image.naturalWidth);
        }

        return {
            src: image.getAttribute('src'),
            srcset: image.srcset || undefined,
            msrc: image.currentSrc || image.src,
            width: width,
            height: height,
            alt: image.alt,
            element: image,
            thumbCropped: getComputedStyle(image).objectFit === 'cover',
        };
    };

    // Consecutive image and gallery cards open as one gallery, as in v4
    var getGallery = function (image) {
        var card = image.closest('.kg-card');
        if (!card) return {items: [getItem(image)], index: 0};

        var isImageCard = function (el) {
            return el && (el.classList.contains('kg-image-card') || el.classList.contains('kg-gallery-card'));
        };

        var first = card;
        while (isImageCard(first.previousElementSibling)) first = first.previousElementSibling;

        var images = [];
        for (var el = first; isImageCard(el); el = el.nextElementSibling) {
            images.push.apply(images, el.querySelectorAll('img'));
        }

        return {items: images.map(getItem), index: Math.max(images.indexOf(image), 0)};
    };

    var open = function (image) {
        // A not-yet-decoded image has no natural size to fall back on
        var ready = image.naturalWidth ? Promise.resolve() : image.decode().catch(function () {});

        Promise.all([loadPhotoSwipe(), ready]).then(function (results) {
            var createPhotoSwipe = results[0];
            var gallery = getGallery(image);

            createPhotoSwipe({
                dataSource: gallery.items,
                index: gallery.index,
                bgOpacity: 0.9,
            }).init();
        }).catch(function () {
            // Lightbox failed to load: show the full image on its own instead
            window.location.href = image.getAttribute('src');
        });
    };

    var getTrigger = function (e) {
        return e.target instanceof Element ? e.target.closest(trigger) : null;
    };

    document.addEventListener('click', function (e) {
        var image = getTrigger(e);
        if (!image) return;

        e.preventDefault();
        open(image);
    });

    // Start fetching on hover so the first open doesn't wait on the network
    document.addEventListener('pointerover', function (e) {
        if (getTrigger(e)) loadPhotoSwipe().catch(function () {});
    });
}
