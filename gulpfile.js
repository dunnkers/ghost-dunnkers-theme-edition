const {series, parallel, watch, src, dest} = require('gulp');
const pump = require('pump');
const fs = require('fs');
const path = require('path');
const order = require('ordered-read-streams');

// gulp plugins and utils
const livereload = require('gulp-livereload');
const postcss = require('gulp-postcss');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const beeper = require('beeper');
const zip = require('gulp-zip');

// postcss plugins
const easyimport = require('postcss-easy-import');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

// translations support
const { mergeLocales } = require('@tryghost/theme-translations/build');
const sharedThemeAssetsPath = path.dirname(require.resolve('@tryghost/shared-theme-assets/package.json'));

function serve(done) {
    livereload.listen();
    done();
}

function handleError(done) {
    return function (err) {
        if (err) {
            beeper();
        }
        return done(err);
    };
};

function hbs(done) {
    pump([
        src(['*.hbs', 'partials/**/*.hbs']),
        livereload()
    ], handleError(done));
}

function css(done) {
    pump([
        src('assets/css/screen.css', {sourcemaps: true}),
        postcss([
            easyimport,
            autoprefixer(),
            cssnano()
        ]),
        dest('assets/built/', {sourcemaps: '.'}),
        livereload()
    ], handleError(done));
}

// PhotoSwipe is only used by the lightbox on posts and pages (where
// partials/pswp.hbs renders), so it gets its own bundle, loaded only there,
// instead of weighing down main.min.js on every page.
function getPhotoSwipeFiles(version) {
    return [
        `${sharedThemeAssetsPath}/assets/js/${version}/lib/vendor/photoswipe.min.js`,
        `${sharedThemeAssetsPath}/assets/js/${version}/lib/vendor/photoswipe-ui-default.min.js`,
    ];
}

function getJsFiles(version) {
    const jsFiles = [
        src([
            `${sharedThemeAssetsPath}/assets/js/${version}/lib/**/*.js`,
            ...getPhotoSwipeFiles(version).map(file => `!${file}`)
        ]),
        src(`${sharedThemeAssetsPath}/assets/js/${version}/main.js`),
    ];

    if (fs.existsSync(`assets/js/lib`)) {
        jsFiles.push(src(`assets/js/lib/*.js`));
    }

    jsFiles.push(src(`assets/js/main.js`));

    return jsFiles;
}

function jsMain(done) {
    pump([
        order(getJsFiles('v1')),
        concat('main.min.js'),
        uglify(),
        dest('assets/built/'),
        livereload()
    ], handleError(done));
}

function jsPhotoSwipe(done) {
    pump([
        order(getPhotoSwipeFiles('v1').map(file => src(file))),
        concat('photoswipe.min.js'),
        uglify(),
        // The vendored sources are executable upstream; don't carry that over.
        dest('assets/built/', {mode: 0o644}),
        livereload()
    ], handleError(done));
}

const js = parallel(jsMain, jsPhotoSwipe);

function zipper(done) {
    const filename = require('./package.json').name + '.zip';

    pump([
        src([
            '**',
            '!node_modules', '!node_modules/**',
            '!dist', '!dist/**',
            '!yarn-error.log'
        ]),
        zip(filename),
        dest('dist/')
    ], handleError(done));
}

function locales(done) {
    mergeLocales({
        local: './locales-local',
        output: './locales'
    })(done);
}

const localesWatcher = () => watch('./locales-local/**/*.json', locales);
const hbsWatcher = () => watch(['*.hbs', 'partials/**/*.hbs'], hbs);
const cssWatcher = () => watch('assets/css/**/*.css', css);
// Only the theme's own JS changes; the PhotoSwipe bundle is vendored.
const jsWatcher = () => watch('assets/js/**/*.js', jsMain);
const watcher = parallel(hbsWatcher, cssWatcher, jsWatcher, localesWatcher);
const build = series(css, js, locales);

exports.build = build;
exports.zip = series(build, zipper);
exports.default = series(build, serve, watcher);
