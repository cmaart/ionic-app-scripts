"use strict";
var util_1 = require('./util');
var path_1 = require('path');
var fs_extra_1 = require('fs-extra');
function tsc(context, options) {
    context = util_1.generateContext(context);
    options = util_1.generateBuildOptions(options);
    var logger = new util_1.Logger('typescript compiler');
    return runTsc(context, options).then(function () {
        if (options.isWatch) {
            return logger.ready();
        }
        return logger.finish();
    }).catch(function (err) {
        logger.fail(err);
        return Promise.reject(err);
    });
}
exports.tsc = tsc;
function runTsc(context, options) {
    return new Promise(function (resolve, reject) {
        // ensure the tmp directory is ready to go
        try {
            util_1.Logger.debug("emptyDirSync: " + context.tmpDir);
            fs_extra_1.emptyDirSync(context.tmpDir);
        }
        catch (e) {
            reject(new Error("tmpDir error: " + e));
            return false;
        }
        var tscCmd = util_1.getNodeBinExecutable(context, 'tsc');
        if (!tscCmd) {
            reject(new Error("Unable to find typescript \"tsc\" command: " + tscCmd));
            return false;
        }
        var files = [];
        if (options.isProd) {
            files.push(path_1.join(context.srcDir, context.mainEntryProd));
            files.push(path_1.join(context.srcDir, '**', '*.d.ts'));
        }
        else {
            files.push(path_1.join(context.srcDir, context.mainEntryDev));
            files.push(path_1.join(context.srcDir, '**', '*.d.ts'));
        }
        var tmpTsConfigPath = createTmpTsConfig(context, files, true);
        var tscCmdArgs = [
            '--project', tmpTsConfigPath
        ];
        if (options.isWatch) {
            tscCmdArgs.push('--watch');
        }
        // would love to not use spawn here but import and run ngc directly
        var spawn = require('cross-spawn');
        var cp = spawn(tscCmd, tscCmdArgs);
        var watchLogger;
        var promiseResolvedOrRejected = false;
        cp.on('error', function (err) {
            var error = new Error("tsc error: " + err);
            if (!promiseResolvedOrRejected) {
                promiseResolvedOrRejected = true;
                reject(error);
            }
            else {
                watchLogger.fail(error);
            }
        });
        cp.stdout.on('data', function (data) {
            data = data.toString();
            util_1.Logger.debug("tsc data: " + data);
            if (options.isWatch) {
                if (hasWords(data, 'error')) {
                    var error = new Error(data);
                    if (!promiseResolvedOrRejected) {
                        promiseResolvedOrRejected = true;
                        reject(error);
                    }
                    else {
                        if (watchLogger) {
                            watchLogger.fail(error, error.message);
                            watchLogger = null;
                        }
                    }
                    return;
                }
                else if (hasWords(data, 'starting', 'compilation')) {
                    watchLogger = new util_1.Logger('typescript compilation');
                    return;
                }
                else if (hasWords(data, 'compilation', 'complete')) {
                    if (watchLogger) {
                        watchLogger.finish();
                        watchLogger = null;
                    }
                    if (!promiseResolvedOrRejected) {
                        promiseResolvedOrRejected = true;
                        resolve();
                    }
                }
            }
        });
        cp.stderr.on('data', function (data) {
            util_1.Logger.error(data);
        });
        cp.on('close', function (data) {
            util_1.Logger.debug("tsc, close: " + data + ", unlink: " + tmpTsConfigPath);
            fs_extra_1.unlink(tmpTsConfigPath);
            resolve();
        });
    });
}
function hasWords(data) {
    var words = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        words[_i - 1] = arguments[_i];
    }
    data = data.toString().toLowerCase();
    for (var i = 0; i < words.length; i++) {
        if (data.indexOf(words[i]) < 0) {
            return false;
        }
    }
    return true;
}
function createTmpTsConfig(context, files, isWatch) {
    // create the tsconfig from the original src
    var tsConfig = getSrcTsConfig(context);
    // compile to a tmp directory
    tsConfig.compilerOptions.outDir = context.tmpDir;
    // if it's a watch, don't emit on error
    tsConfig.compilerOptions.noEmitOnError = isWatch;
    // force what files to include
    if (Array.isArray(tsConfig.include)) {
        tsConfig.include = tsConfig.include.concat(files);
    }
    else {
        tsConfig.include = files;
    }
    var tmpTsConfigPath = getTmpTsConfigPath(context);
    util_1.Logger.debug("tsc outputJsonSync: " + tmpTsConfigPath);
    // save the modified copy into the tmp directory
    fs_extra_1.outputJsonSync(tmpTsConfigPath, tsConfig);
    return tmpTsConfigPath;
}
function getSrcTsConfig(context) {
    var srcTsConfig = null;
    var srcTsConfigPath = path_1.join(context.rootDir, TS_CONFIG_FILE);
    try {
        srcTsConfig = fs_extra_1.readJsonSync(srcTsConfigPath);
    }
    catch (e) {
        throw new Error("Error reading tsconfig file \"" + srcTsConfigPath + "\", " + e);
    }
    if (!srcTsConfig) {
        throw new Error("Invalid tsconfig file \"" + srcTsConfigPath + "\"");
    }
    if (!srcTsConfig.compilerOptions) {
        throw new Error('TSConfig is missing necessary compiler options');
    }
    return srcTsConfig;
}
exports.getSrcTsConfig = getSrcTsConfig;
function getTmpTsConfigPath(context) {
    return path_1.join(context.rootDir, 'tsconfig.tmp.json');
}
var TS_CONFIG_FILE = 'tsconfig.json';
