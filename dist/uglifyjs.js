"use strict";
var path_1 = require('path');
var uglify = require('uglify-js');
var util_1 = require('./util');
function uglifyjs(context, uglifyJsConfig) {
    context = util_1.generateContext(context);
    uglifyJsConfig = util_1.fillConfigDefaults(context, uglifyJsConfig, UGLIFY_TASK_INFO);
    var logger = new util_1.Logger('uglifyjs');
    return runUglify(context, uglifyJsConfig).then(function () {
        return logger.finish();
    }).catch(function (err) {
        logger.fail(err);
        return Promise.reject(err);
    });
}
exports.uglifyjs = uglifyjs;
function runUglify(context, uglifyJsConfig) {
    try {
        // provide a full path for the config options
        uglifyJsConfig.sourceFile = path_1.join(context.buildDir, uglifyJsConfig.sourceFile);
        uglifyJsConfig.inSourceMap = path_1.join(context.buildDir, uglifyJsConfig.inSourceMap);
        uglifyJsConfig.destFileName = path_1.join(context.buildDir, uglifyJsConfig.destFileName);
        var minifiedOutputPath = path_1.join(context.buildDir, uglifyJsConfig.outSourceMap);
        var minifyOutput = runUglifyInternal(uglifyJsConfig);
        var writeFilePromises = [];
        writeFilePromises.push(util_1.writeFileAsync(uglifyJsConfig.destFileName, minifyOutput.code));
        writeFilePromises.push(util_1.writeFileAsync(minifiedOutputPath, minifyOutput.map));
        return Promise.all(writeFilePromises);
    }
    catch (ex) {
        return Promise.reject(ex);
    }
}
function runUglifyInternal(uglifyJsConfig) {
    return uglify.minify(uglifyJsConfig.sourceFile, {
        compress: uglifyJsConfig.compress,
        mangle: uglifyJsConfig.mangle,
        outSourceMap: uglifyJsConfig.outSourceMap
    });
}
var UGLIFY_TASK_INFO = {
    fullArgConfig: '--uglifyjs',
    shortArgConfig: '-u',
    envConfig: 'ionic_uglifyjs',
    defaultConfigFilename: 'uglifyjs.config'
};
