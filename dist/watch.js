"use strict";
var build_1 = require('./build');
var util_1 = require('./util');
function watch(context, options, watchConfig) {
    context = util_1.generateContext(context);
    options = util_1.generateBuildOptions(options);
    watchConfig = util_1.fillConfigDefaults(context, watchConfig, WATCH_TASK_INFO);
    // force watch options
    options.isProd = false;
    options.isWatch = true;
    var logger = new util_1.Logger('watch');
    return build_1.build(context, options).then(function () {
        startWatchers(context, options, watchConfig);
        return logger.ready();
    }).catch(function (err) {
        return logger.fail(err);
    });
}
exports.watch = watch;
function startWatchers(context, options, watchConfig) {
    // https://github.com/paulmillr/chokidar
    var chokidar = require('chokidar');
    watchConfig.watchers.forEach(function (watcher) {
        if (watcher.callback && watcher.paths) {
            var taskPromise_1 = Promise.resolve();
            var nextTask_1 = null;
            var watcherOptions = watcher.options || {};
            if (!watcherOptions.cwd) {
                watcherOptions.cwd = context.rootDir;
            }
            if (typeof watcherOptions.ignoreInitial !== 'boolean') {
                watcherOptions.ignoreInitial = true;
            }
            var paths = cleanPaths(context, watcher.paths);
            var chokidarWatcher = chokidar.watch(paths, watcherOptions);
            chokidarWatcher.on('all', function (event, path) {
                util_1.setIonicEnvironment(options.isProd);
                util_1.Logger.debug("watch callback start, id: " + watchCount + ", isProd: " + options.isProd + ", event: " + event + ", path: " + path);
                nextTask_1 = watcher.callback.bind(null, event, path, context, options);
                taskPromise_1.then(function () {
                    util_1.Logger.debug("watch callback complete, id: " + watchCount + ", isProd: " + options.isProd + ", event: " + event + ", path: " + path);
                    taskPromise_1 = nextTask_1();
                    nextTask_1 = null;
                    watchCount++;
                }).catch(function (err) {
                    util_1.Logger.debug("watch callback error, id: " + watchCount + ", isProd: " + options.isProd + ", event: " + event + ", path: " + path);
                    util_1.Logger.debug("" + err);
                    taskPromise_1 = nextTask_1();
                    nextTask_1 = null;
                    watchCount++;
                });
            });
        }
    });
}
exports.startWatchers = startWatchers;
function cleanPaths(context, paths) {
    if (Array.isArray(paths)) {
        return paths.map(function (p) { return util_1.replacePathVars(context, p); });
    }
    if (typeof paths === 'string') {
        return util_1.replacePathVars(context, paths);
    }
    return paths;
}
var WATCH_TASK_INFO = {
    fullArgConfig: '--watch',
    shortArgConfig: '-w',
    envConfig: 'ionic_watch',
    defaultConfigFilename: 'watch.config'
};
var watchCount = 0;
