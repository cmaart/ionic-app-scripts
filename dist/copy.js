"use strict";
var util_1 = require('./util');
var fs_extra_1 = require('fs-extra');
function copy(context, copyConfig) {
    context = util_1.generateContext(context);
    copyConfig = util_1.fillConfigDefaults(context, copyConfig, COPY_TASK_INFO);
    var logger = new util_1.Logger('copy');
    return runCopy(context, copyConfig).then(function () {
        return logger.finish();
    }).catch(function (err) {
        logger.fail(err);
        return Promise.reject(err);
    });
}
exports.copy = copy;
function copyUpdate(event, path, context, options) {
    util_1.Logger.debug("copyUpdate, event: " + event + ", path: " + path);
    var copyConfig = util_1.fillConfigDefaults(context, null, COPY_TASK_INFO);
    return runCopy(context, copyConfig);
}
exports.copyUpdate = copyUpdate;
function runCopy(context, copyConfig) {
    var promises = [];
    copyConfig.include.forEach(function (copyOptions) {
        promises.push(copySrcToDest(context, copyOptions.src, copyOptions.dest, copyOptions.filter));
    });
    return Promise.all(promises);
}
function copySrcToDest(context, src, dest, filter) {
    src = util_1.replacePathVars(context, src);
    dest = util_1.replacePathVars(context, dest);
    var opts = {
        filter: filter
    };
    return new Promise(function (resolve, reject) {
        fs_extra_1.copy(src, dest, opts, function (err) {
            if (err) {
                var msg = "Error copying \"" + src + "\" to \"" + dest + "\": " + err;
                if (msg.indexOf('ENOENT') < 0 && msg.indexOf('EEXIST') < 0) {
                    reject(new Error("Error copying \"" + src + "\" to \"" + dest + "\": " + err));
                    return;
                }
            }
            resolve();
        });
    });
}
var COPY_TASK_INFO = {
    fullArgConfig: '--copy',
    shortArgConfig: '-y',
    envConfig: 'ionic_copy',
    defaultConfigFilename: 'copy.config'
};
