pagination(false, function () {
    // "Load more" fetches and appends post cards without a full page
    // reload, so re-run this to label the newly-added external badges.
    labelExternalHosts();
});
fixNavMoreToggleA11y();
labelExternalHosts();

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
