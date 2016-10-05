"use strict";
var path_1 = require('path');
var util_1 = require('./util');
var cleanCss = require('clean-css');
function cleancss(context, cleanCssConfig) {
    context = util_1.generateContext(context);
    cleanCssConfig = util_1.fillConfigDefaults(context, cleanCssConfig, CLEANCSS_TASK_INFO);
    var logger = new util_1.Logger('cleancss');
    var sourceFile = path_1.join(context.buildDir, cleanCssConfig.sourceFileName);
    var destFileName = path_1.join(context.buildDir, cleanCssConfig.destFileName);
    return util_1.readFileAsync(sourceFile).then(function (fileContent) {
        util_1.Logger.debug("cleancss read: " + sourceFile);
        return runCleanCss(fileContent);
    }).then(function (output) {
        util_1.Logger.debug("cleancss write: " + destFileName);
        return util_1.writeFileAsync(destFileName, output.styles);
    }).then(function () {
        return logger.finish();
    }).catch(function (err) {
        logger.fail(err, err.message);
        return Promise.reject(err);
    });
}
exports.cleancss = cleancss;
function runCleanCss(fileContent) {
    return new Promise(function (resolve, reject) {
        var minifier = new cleanCss();
        minifier.minify(fileContent, function (err, minified) {
            if (err) {
                reject(err);
            }
            else if (minified.errors && minified.errors.length > 0) {
                // just return the first error for now I guess
                reject(new Error(minified.errors[0]));
            }
            else {
                resolve(minified);
            }
        });
    });
}
var CLEANCSS_TASK_INFO = {
    fullArgConfig: '--cleancss',
    shortArgConfig: '-e',
    envConfig: 'ionic_cleancss',
    defaultConfigFilename: 'cleancss.config'
};
