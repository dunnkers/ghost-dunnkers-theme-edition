var html = document.documentElement;
var body = document.body;

cover();
featured();
portalButton();
pagination(false, function () {
    // "Load more" fetches and appends post cards without a full page
    // reload, so re-run this to label the newly-added external badges.
    labelExternalHosts();
});
fixNavMoreToggleA11y();
labelExternalHosts();
fixGalleryLightbox();

function prefersReducedMotion() {
    'use strict';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function portalButton() {
    'use strict';
    var cover = document.querySelector('.cover');
    if (!cover) return;

    if (cover.classList.contains('half')) {
        body.classList.add('portal-visible');
        return;
    }

    if (!body.classList.contains('home-template') || !body.classList.contains('with-full-cover')) return;

    // Show the Portal button once the reader has scrolled 300px into the
    // full-screen cover. A sentinel at that offset (see misc/portal.css) is
    // watched instead of running a handler on every scroll event.
    var sentinel = document.createElement('div');
    sentinel.className = 'cover-sentinel';
    cover.appendChild(sentinel);

    new IntersectionObserver(function (entries) {
        var entry = entries[0];
        body.classList.toggle('portal-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }).observe(sentinel);
}

function cover() {
    'use strict';
    var cover = document.querySelector('.cover');
    if (!cover) return;

    imagesLoaded(cover, function () {
        cover.classList.remove('image-loading');
    });

    document.querySelector('.cover-arrow').addEventListener('click', function () {
        var element = cover.nextElementSibling;
        element.scrollIntoView({behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start'});
    });
}

function fixNavMoreToggleA11y() {
    'use strict';
    // @tryghost/shared-theme-assets' dropdown.js appends `.nav-more-toggle` as a
    // direct child of <ul class="nav">, which is invalid list markup for a11y
    // (lists must contain only <li> / script-supporting elements). It also
    // rebuilds the nav on resize, so we watch for the toggle instead of patching once.
    var nav = document.querySelector('.gh-head-menu .nav');
    if (!nav) return;

    var wrapInListItem = function (toggle) {
        if (toggle.parentElement && toggle.parentElement.tagName === 'LI') return;
        var li = document.createElement('li');
        li.className = 'nav-more-toggle-wrap';
        toggle.replaceWith(li);
        li.appendChild(toggle);
    };

    var existing = nav.querySelector('.nav-more-toggle');
    if (existing) wrapInListItem(existing);

    new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('nav-more-toggle')) {
                    wrapInListItem(node);
                }
            });
        });
    }).observe(nav, {childList: true});
}

function labelExternalHosts() {
    'use strict';
    // Renders a "Xebia.com ⧉"-style label for #external-link posts, derived
    // from canonical_url at render time instead of a hand-typed title suffix.
    document.querySelectorAll('[data-external-host]').forEach(function (el) {
        var rawUrl = el.getAttribute('data-external-host');
        if (!rawUrl) return;

        try {
            var host = new URL(rawUrl).hostname.replace(/^www\./, '');
            var label = host.charAt(0).toUpperCase() + host.slice(1);
            var target = el.classList.contains('external-badge-label') ? el : el.querySelector('.external-badge-label');
            if (target) target.textContent = label;
            if (el.hasAttribute('hidden')) el.hidden = false;
        } catch (e) {
            // Malformed canonical_url: leave the badge hidden/empty rather than showing "undefined".
        }
    });
}

function fixGalleryLightbox() {
    'use strict';
    // @tryghost/shared-theme-assets' bundled main.js already calls
    // lightbox('.kg-image-card > .kg-image[width][height], .kg-gallery-image > img')
    // on load (see node_modules/@tryghost/shared-theme-assets/assets/js/v1/main.js),
    // which is meant to bind a click handler to every gallery/single image
    // that opens the PhotoSwipe modal (partials/pswp.hbs). Both selectors
    // require the <img> to be a direct child, but current Ghost core now
    // renders image cards as `<picture><source>...<img></picture>` for
    // AVIF/WebP negotiation — one DOM level deeper — so neither selector
    // matches anything and the click handler is never attached. `lightbox`
    // is a plain global function (declared, not wrapped, in that bundle, and
    // concatenated into the same script as this file), so just re-invoke it
    // with selectors that reach through the <picture> wrapper; the original,
    // now-empty-matching call is a harmless no-op.
    if (typeof lightbox !== 'function') return;
    lightbox('.kg-image-card > picture > .kg-image[width][height], .kg-gallery-image > picture > img');
}

function featured() {
    'use strict';
    // The featured feed is a native CSS scroll-snap carousel (see
    // blog/featured.css), so it works without JS; this only adds the
    // prev/next buttons, which stay hidden if this never runs.
    var feed = document.querySelector('.featured-feed');
    var controls = document.querySelector('.featured-controls');
    if (!feed || !controls) return;

    var slides = feed.children;
    var first = slides[0];
    var last = slides[slides.length - 1];
    var prev = controls.querySelector('[data-controls="prev"]');
    var next = controls.querySelector('[data-controls="next"]');

    var slideBy = function (direction) {
        // One slide (plus the gap) per click; scroll snapping aligns the result.
        var step = slides.length > 1 ? slides[1].offsetLeft - first.offsetLeft : feed.clientWidth;
        feed.scrollBy({left: direction * step, behavior: prefersReducedMotion() ? 'auto' : 'smooth'});
    };

    prev.addEventListener('click', function () {
        slideBy(-1);
    });
    next.addEventListener('click', function () {
        slideBy(1);
    });

    // Disable a button once the first/last slide is fully in view, and hide
    // both when everything fits, without listening to scroll events.
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            var inView = entry.intersectionRatio >= 0.95;
            if (entry.target === first) prev.disabled = inView;
            if (entry.target === last) next.disabled = inView;
        });
        controls.hidden = prev.disabled && next.disabled;
    }, {root: feed, threshold: [0, 0.95]});

    observer.observe(first);
    observer.observe(last);
}
