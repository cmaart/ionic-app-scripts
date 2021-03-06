"use strict";
var path_1 = require('path');
var util_1 = require('./util');
var fs_extra_1 = require('fs-extra');
var tsc_1 = require('./tsc');
function ngc(context, options, ngcConfig) {
    context = util_1.generateContext(context);
    options = util_1.generateBuildOptions(options);
    ngcConfig = util_1.fillConfigDefaults(context, ngcConfig, NGC_TASK_INFO);
    var logger = new util_1.Logger('ngc');
    // first make a copy of src TS files
    // and copy them into the tmp directory
    return copySrcTsToTmpDir(context).then(function () {
        // ts files have finishe being copied to the tmp directory
        // now compile the copied TS files with NGC
        return runNgc(context, options, ngcConfig);
    }).then(function () {
        return logger.finish();
    }).catch(function (err) {
        logger.fail(err);
        return Promise.reject(err);
    });
}
exports.ngc = ngc;
function ngcUpdate(event, path, context, options) {
    util_1.Logger.debug("ngcUpdate, event: " + event + ", path: " + path);
    var ngcConfig = util_1.fillConfigDefaults(context, null, NGC_TASK_INFO);
    return runNgc(context, options, ngcConfig);
}
exports.ngcUpdate = ngcUpdate;
function runNgc(context, options, ngcConfig) {
    return new Promise(function (resolve, reject) {
        // make a copy of the users src tsconfig file
        // and save the modified copy into the tmp directory
        createTmpTsConfig(context, ngcConfig);
        var ngcCmd = util_1.getNodeBinExecutable(context, 'ngc');
        if (!ngcCmd) {
            reject(new Error("Unable to find Angular Compiler \"ngc\" command: " + ngcCmd));
            return;
        }
        // let's kick off the actual ngc command on our copied TS files
        // use the user's ngc in their node_modules to ensure ngc
        // versioned and working along with the user's ng2 version
        var spawn = require('cross-spawn');
        var ngcCmdArgs = [
            '--project', getTmpTsConfigPath(context)
        ];
        var hadAnError = false;
        // would love to not use spawn here but import and run ngc directly
        var cp = spawn(ngcCmd, ngcCmdArgs);
        cp.stdout.on('data', function (data) {
            util_1.Logger.info(data);
        });
        cp.stderr.on('data', function (data) {
            util_1.Logger.error("ngc error: " + data);
            hadAnError = true;
        });
        cp.on('close', function (code) {
            if (hadAnError) {
                reject(new Error("NGC encountered an error"));
            }
            else {
                resolve();
            }
        });
    });
}
function createTmpTsConfig(context, ngcConfig) {
    // create the tsconfig from the original src
    var tsConfig = tsc_1.getSrcTsConfig(context);
    // delete outDir if it's set since we only want
    // to compile to the same directory we're in
    delete tsConfig.compilerOptions.outDir;
    // downstream, we have a dependency on es5 code and
    // es2015 modules, so force them
    tsConfig.compilerOptions.module = 'es2015';
    tsConfig.compilerOptions.target = 'es5';
    // force where to look for ts files
    tsConfig.include = ngcConfig.include;
    // save the modified copy into the tmp directory
    fs_extra_1.outputJsonSync(getTmpTsConfigPath(context), tsConfig);
}
function copySrcTsToTmpDir(context) {
    return new Promise(function (resolve, reject) {
        // ensure the tmp directory is ready to go
        try {
            fs_extra_1.emptyDirSync(context.tmpDir);
        }
        catch (e) {
            throw new Error("tmpDir error: " + e);
        }
        var copyOpts = {
            filter: filterCopyFiles
        };
        util_1.Logger.debug("copySrcTsToTmpDir, src: " + context.srcDir + ", src: " + context.tmpDir);
        fs_extra_1.copy(context.srcDir, context.tmpDir, copyOpts, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
function filterCopyFiles(filePath, hoop) {
    var shouldInclude = false;
    try {
        var stats = fs_extra_1.statSync(filePath);
        if (stats.isDirectory()) {
            shouldInclude = (EXCLUDE_DIRS.indexOf(path_1.basename(filePath)) < 0);
        }
        else {
            if (util_1.isTsFilename(filePath)) {
                shouldInclude = true;
            }
            if (filePath.substr(filePath.length - 5) === '.html') {
                shouldInclude = true;
            }
        }
    }
    catch (e) { }
    return shouldInclude;
}
function getTmpTsConfigPath(context) {
    return path_1.join(context.tmpDir, 'tsconfig.json');
}
exports.getTmpTsConfigPath = getTmpTsConfigPath;
var EXCLUDE_DIRS = ['assets', 'theme'];
var NGC_TASK_INFO = {
    fullArgConfig: '--ngc',
    shortArgConfig: '-n',
    envConfig: 'ionic_ngc',
    defaultConfigFilename: 'ngc.config'
};
