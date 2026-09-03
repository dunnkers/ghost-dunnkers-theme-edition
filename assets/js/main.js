var html = document.documentElement;
var body = document.body;
var timeout;
var st = 0;

cover();
featured();
pagination(false);
fixNavMoreToggleA11y();
labelExternalHosts();

window.addEventListener('scroll', function () {
    'use strict';
    if (body.classList.contains('home-template') && body.classList.contains('with-full-cover') && !document.querySelector('.cover').classList.contains('half')) {
        if (timeout) {
            window.cancelAnimationFrame(timeout);
        }
        timeout = window.requestAnimationFrame(portalButton);
    }
});

if (document.querySelector('.cover') && document.querySelector('.cover').classList.contains('half')) {
    body.classList.add('portal-visible');
}

function portalButton() {
    'use strict';
    st = window.scrollY;

    if (st > 300) {
        body.classList.add('portal-visible');
    } else {
        body.classList.remove('portal-visible');
    }
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
        element.scrollIntoView({behavior: 'smooth', block: 'start'});
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

function featured() {
    'use strict';
    var feed = document.querySelector('.featured-feed');
    if (!feed) return;

    tns({
        container: feed,
        controlsText: [
            '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M20.547 22.107L14.44 16l6.107-6.12L18.667 8l-8 8 8 8 1.88-1.893z"></path></svg>',
            '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M11.453 22.107L17.56 16l-6.107-6.12L13.333 8l8 8-8 8-1.88-1.893z"></path></svg>',
        ],
        gutter: 30,
        loop: false,
        nav: false,
        responsive: {
            0: {
                items: 1,
            },
            768: {
                items: 2,
            },
            992: {
                items: 3,
            },
        },
    });
}
