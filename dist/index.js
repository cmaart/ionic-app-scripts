"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var build_1 = require('./build');
exports.build = build_1.build;
exports.buildUpdate = build_1.buildUpdate;
var bundle_1 = require('./bundle');
exports.bundle = bundle_1.bundle;
exports.bundleUpdate = bundle_1.bundleUpdate;
var clean_1 = require('./clean');
exports.clean = clean_1.clean;
var cleancss_1 = require('./cleancss');
exports.cleancss = cleancss_1.cleancss;
var copy_1 = require('./copy');
exports.copy = copy_1.copy;
exports.copyUpdate = copy_1.copyUpdate;
var lint_1 = require('./lint');
exports.lint = lint_1.lint;
var minify_1 = require('./minify');
exports.minify = minify_1.minify;
var ngc_1 = require('./ngc');
exports.ngc = ngc_1.ngc;
exports.ngcUpdate = ngc_1.ngcUpdate;
var sass_1 = require('./sass');
exports.sass = sass_1.sass;
exports.sassUpdate = sass_1.sassUpdate;
var transpile_1 = require('./transpile');
exports.transpile = transpile_1.transpile;
var uglifyjs_1 = require('./uglifyjs');
exports.uglifyjs = uglifyjs_1.uglifyjs;
var watch_1 = require('./watch');
exports.watch = watch_1.watch;
__export(require('./util'));
function run(task) {
    try {
        require("../dist/" + task)[task]().catch(function (e) {
            console.error("Error running ionic app script \"" + task + "\": " + e);
            process.exit(1);
        });
    }
    catch (e) {
        console.error("Error running ionic app script \"" + task + "\": " + e);
        process.exit(1);
    }
}
exports.run = run;
