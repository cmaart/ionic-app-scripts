"use strict";
var util_1 = require('./util');
var path_1 = require('path');
var fs_1 = require('fs');
function lint(context, tsConfigPath) {
    context = util_1.generateContext(context);
    var defaultTsLintPath = path_1.join(context.rootDir, 'tslint.json');
    tsConfigPath = tsConfigPath || util_1.getConfigValueDefaults(TSCONFIG_TASK_INFO.fullArgConfig, TSCONFIG_TASK_INFO.shortArgConfig, TSCONFIG_TASK_INFO.envConfig, defaultTsLintPath, context);
    util_1.Logger.debug("tslint config: " + tsConfigPath);
    return new Promise(function (resolve, reject) {
        fs_1.access(tsConfigPath, function (err) {
            if (err) {
                // if the tslint.json file cannot be found that's fine, the
                // dev may not want to run tslint at all and to do that they
                // just don't have the file
                util_1.Logger.debug("tslint: " + err);
                resolve();
                return;
            }
            var logger = new util_1.Logger('lint');
            runTsLint(context, tsConfigPath).then(function () {
                resolve(logger.finish());
            }).catch(function (err) {
                logger.fail(err);
                // tslint should not break the build by default
                // so just resolve
                resolve();
            });
        });
    });
}
exports.lint = lint;
function runTsLint(context, tsConfigPath) {
    return new Promise(function (resolve, reject) {
        var cmd = util_1.getNodeBinExecutable(context, 'tslint');
        if (!cmd) {
            reject(new Error("Unable to find \"tslint\" command: " + cmd));
            return false;
        }
        var files = path_1.join(context.srcDir, '**', '*.ts');
        var args = [
            '--config', tsConfigPath,
            files
        ];
        var spawn = require('cross-spawn');
        var cp = spawn(cmd, args);
        cp.on('error', function (err) {
            reject(new Error("tslint error: " + err));
        });
        cp.stdout.on('data', function (data) {
            util_1.Logger.error("tslint: " + data);
        });
        cp.stderr.on('data', function (data) {
            util_1.Logger.error("tslint: " + data);
        });
        cp.on('close', function (data) {
            resolve();
        });
    });
}
var TSCONFIG_TASK_INFO = {
    fullArgConfig: '--tslint',
    shortArgConfig: '-l',
    envConfig: 'ionic_tslint',
    defaultConfigFilename: '../tslint'
};
