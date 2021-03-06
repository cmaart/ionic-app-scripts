"use strict";
var path_1 = require('path');
var util_1 = require('./util');
var bundle_1 = require('./bundle');
var fs_1 = require('fs');
function sass(context, options, sassConfig, useCache) {
    if (useCache === void 0) { useCache = false; }
    context = util_1.generateContext(context);
    options = util_1.generateBuildOptions(options);
    sassConfig = util_1.fillConfigDefaults(context, sassConfig, SASS_TASK_INFO);
    var logger = new util_1.Logger('sass');
    if (!context.moduleFiles) {
        // we haven't already gotten the moduleFiles in this process
        // see if we have it cached
        context.moduleFiles = bundle_1.getModulePathsCache();
        if (!context.moduleFiles) {
            logger.fail(null, 'Cannot generate Sass files without first bundling JavaScript ' +
                'files in order to know all used modules. Please build JS files first.');
            return Promise.reject(new Error('Missing module paths for sass build'));
        }
    }
    // where the final css output file is saved
    if (!sassConfig.outFile) {
        sassConfig.outFile = path_1.join(context.buildDir, sassConfig.outputFilename);
    }
    util_1.Logger.debug("sass outFile: " + sassConfig.outFile);
    // import paths where the sass compiler will look for imports
    sassConfig.includePaths.unshift(path_1.join(context.srcDir));
    util_1.Logger.debug("sass includePaths: " + sassConfig.includePaths);
    // sass import sorting algorithms incase there was something to tweak
    sassConfig.sortComponentPathsFn = (sassConfig.sortComponentPathsFn || defaultSortComponentPathsFn);
    sassConfig.sortComponentFilesFn = (sassConfig.sortComponentFilesFn || defaultSortComponentFilesFn);
    if (!sassConfig.file) {
        // if the sass config was not given an input file, then
        // we're going to dynamically generate the sass data by
        // scanning through all the components included in the bundle
        // and generate the sass on the fly
        generateSassData(context, options, sassConfig);
    }
    // let's begin shall we...
    return render(sassConfig, useCache).then(function () {
        return logger.finish();
    }).catch(function (err) {
        logger.fail(err, null, false);
        return Promise.reject(err);
    });
}
exports.sass = sass;
function sassUpdate(event, path, context, options, useCache) {
    if (useCache === void 0) { useCache = false; }
    util_1.Logger.debug("sassUpdate, event: " + event + ", path: " + path);
    var sassConfig = util_1.fillConfigDefaults(context, null, SASS_TASK_INFO);
    return sass(context, options, sassConfig, useCache);
}
exports.sassUpdate = sassUpdate;
function generateSassData(context, options, sassConfig) {
    /**
     * 1) Import user sass variables first since user variables
     *    should have precedence over default library variables.
     * 2) Import all library sass files next since library css should
     *    be before user css, and potentially have library css easily
     *    overridden by user css selectors which come after the
     *    library's in the same file.
     * 3) Import the user's css last since we want the user's css to
     *    potentially easily override library css with the same
     *    css specificity.
     */
    var moduleDirectories = [];
    context.moduleFiles.forEach(function (moduleFile) {
        var moduleDirectory = path_1.dirname(moduleFile);
        if (moduleDirectories.indexOf(moduleDirectory) < 0) {
            moduleDirectories.push(moduleDirectory);
        }
    });
    util_1.Logger.debug("sass moduleDirectories: " + moduleDirectories.length);
    // gather a list of all the sass variable files that should be used
    // these variable files will be the first imports
    var userSassVariableFiles = sassConfig.variableSassFiles.map(function (f) {
        return util_1.replacePathVars(context, f);
    });
    // gather a list of all the sass files that are next to components we're bundling
    var componentSassFiles = getComponentSassFiles(moduleDirectories, context, sassConfig);
    util_1.Logger.debug("sass userSassVariableFiles: " + userSassVariableFiles.length);
    util_1.Logger.debug("sass componentSassFiles: " + componentSassFiles.length);
    var sassImports = userSassVariableFiles.concat(componentSassFiles).map(function (sassFile) { return '"' + sassFile.replace(/\\/g, '\\\\') + '"'; });
    if (sassImports.length) {
        sassConfig.data = "@charset \"UTF-8\"; @import " + sassImports.join(',') + ";";
    }
}
function getComponentSassFiles(moduleDirectories, context, sassConfig) {
    var collectedSassFiles = [];
    var componentDirectories = getComponentDirectories(moduleDirectories, sassConfig);
    // sort all components with the library components being first
    // and user components coming last, so it's easier for user css
    // to override library css with the same specificity
    var sortedComponentPaths = componentDirectories.sort(sassConfig.sortComponentPathsFn);
    sortedComponentPaths.forEach(function (componentPath) {
        addComponentSassFiles(componentPath, collectedSassFiles, context, sassConfig);
    });
    return collectedSassFiles;
}
function addComponentSassFiles(componentPath, collectedSassFiles, context, sassConfig) {
    var siblingFiles = getSiblingSassFiles(componentPath, sassConfig);
    if (!siblingFiles.length && componentPath.indexOf(path_1.sep + 'node_modules') === -1) {
        // if we didn't find anything, see if this module is mapped to another directory
        for (var k in sassConfig.directoryMaps) {
            if (sassConfig.directoryMaps.hasOwnProperty(k)) {
                var actualDirectory = util_1.replacePathVars(context, k);
                var mappedDirectory = util_1.replacePathVars(context, sassConfig.directoryMaps[k]);
                componentPath = componentPath.replace(actualDirectory, mappedDirectory);
                siblingFiles = getSiblingSassFiles(componentPath, sassConfig);
                if (siblingFiles.length) {
                    break;
                }
            }
        }
    }
    if (siblingFiles.length) {
        siblingFiles = siblingFiles.sort(sassConfig.sortComponentFilesFn);
        siblingFiles.forEach(function (componentFile) {
            collectedSassFiles.push(componentFile);
        });
    }
}
function getSiblingSassFiles(componentPath, sassConfig) {
    return fs_1.readdirSync(componentPath).filter(function (f) {
        return isValidSassFile(f, sassConfig);
    }).map(function (f) {
        return path_1.join(componentPath, f);
    });
}
function isValidSassFile(filename, sassConfig) {
    for (var i = 0; i < sassConfig.includeFiles.length; i++) {
        if (sassConfig.includeFiles[i].test(filename)) {
            // filename passes the test to be included
            for (var j = 0; j < sassConfig.excludeFiles.length; j++) {
                if (sassConfig.excludeFiles[j].test(filename)) {
                    // however, it also passed the test that it should be excluded
                    util_1.Logger.debug("sass excluded: " + filename);
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
function getComponentDirectories(moduleDirectories, sassConfig) {
    // filter out module directories we know wouldn't have sibling component sass file
    // just a way to reduce the amount of lookups to be done later
    return moduleDirectories.filter(function (moduleDirectory) {
        for (var i = 0; i < sassConfig.excludeModules.length; i++) {
            if (moduleDirectory.indexOf(sassConfig.excludeModules[i]) > -1) {
                return false;
            }
        }
        return true;
    });
}
function render(sassConfig, useCache) {
    return new Promise(function (resolve, reject) {
        if (useCache && lastRenderKey !== null) {
            // if the sass data imports are same, don't bother
            var renderKey = getRenderCacheKey(sassConfig);
            if (renderKey === lastRenderKey) {
                resolve();
                return;
            }
        }
        sassConfig.omitSourceMapUrl = true;
        if (sassConfig.sourceMap) {
            sassConfig.sourceMap = path_1.basename(sassConfig.outFile);
            sassConfig.sourceMapContents = true;
        }
        var nodeSass = require('node-sass');
        nodeSass.render(sassConfig, function (renderErr, sassResult) {
            if (renderErr) {
                // sass render error!
                if (renderErr.line) {
                    util_1.Logger.error("Sass Error: line: " + renderErr.line + ", column: " + renderErr.column + "\n" + renderErr.message);
                }
                else {
                    util_1.Logger.error("Sass Error: " + renderErr);
                }
                reject(new Error('Sass compile error'));
            }
            else {
                // sass render success!
                renderSassSuccess(sassResult, sassConfig).then(function () {
                    lastRenderKey = getRenderCacheKey(sassConfig);
                    resolve();
                }).catch(function (reason) {
                    reject(reason);
                });
            }
        });
    });
}
function renderSassSuccess(sassResult, sassConfig) {
    if (sassConfig.autoprefixer) {
        // with autoprefixer
        var postcss = require('postcss');
        var autoprefixer = require('autoprefixer');
        var autoPrefixerMapOptions = false;
        if (sassConfig.sourceMap) {
            autoPrefixerMapOptions = {
                inline: false
            };
        }
        var postcssOptions = {
            to: path_1.basename(sassConfig.outFile),
            map: autoPrefixerMapOptions
        };
        util_1.Logger.debug("sass, start postcss/autoprefixer");
        return postcss([autoprefixer(sassConfig.autoprefixer)])
            .process(sassResult.css, postcssOptions).then(function (postCssResult) {
            postCssResult.warnings().forEach(function (warn) {
                util_1.Logger.warn(warn.toString());
            });
            var apMapResult = null;
            if (sassConfig.sourceMap && postCssResult.map) {
                util_1.Logger.debug("sass, parse postCssResult.map");
                apMapResult = JSON.parse(postCssResult.map.toString()).mappings;
            }
            util_1.Logger.debug("sass: postcss/autoprefixer completed");
            return writeOutput(sassConfig, postCssResult.css, apMapResult);
        });
    }
    // without autoprefixer
    generateSourceMaps(sassResult, sassConfig);
    var sassMapResult = null;
    if (sassResult.map) {
        sassMapResult = JSON.parse(sassResult.map.toString()).mappings;
    }
    return writeOutput(sassConfig, sassResult.css, sassMapResult);
}
function generateSourceMaps(sassResult, sassConfig) {
    // this can be async and nothing needs to wait on it
    // build Source Maps!
    if (sassResult.map) {
        util_1.Logger.debug("sass, generateSourceMaps");
        // transform map into JSON
        var sassMap = JSON.parse(sassResult.map.toString());
        // grab the stdout and transform it into stdin
        var sassMapFile = sassMap.file.replace(/^stdout$/, 'stdin');
        // grab the base file name that's being worked on
        var sassFileSrc = sassConfig.outFile;
        // grab the path portion of the file that's being worked on
        var sassFileSrcPath_1 = path_1.dirname(sassFileSrc);
        if (sassFileSrcPath_1) {
            // prepend the path to all files in the sources array except the file that's being worked on
            var sourceFileIndex_1 = sassMap.sources.indexOf(sassMapFile);
            sassMap.sources = sassMap.sources.map(function (source, index) {
                return (index === sourceFileIndex_1) ? source : path_1.join(sassFileSrcPath_1, source);
            });
        }
        // remove 'stdin' from souces and replace with filenames!
        sassMap.sources = sassMap.sources.filter(function (src) {
            if (src !== 'stdin') {
                return src;
            }
        });
    }
}
function writeOutput(sassConfig, cssOutput, mappingsOutput) {
    return new Promise(function (resolve, reject) {
        util_1.Logger.debug("sass start write output: " + sassConfig.outFile);
        fs_1.writeFile(sassConfig.outFile, cssOutput, function (cssWriteErr) {
            if (cssWriteErr) {
                reject(new Error("Error writing css file, " + sassConfig.outFile + ": " + cssWriteErr));
            }
            else {
                util_1.Logger.debug("sass saved output: " + sassConfig.outFile);
                if (mappingsOutput) {
                    // save the css map file too
                    // this save completes async and does not hold up the resolve
                    var sourceMapPath_1 = path_1.join(path_1.dirname(sassConfig.outFile), path_1.basename(sassConfig.outFile) + '.map');
                    util_1.Logger.debug("sass start write css map: " + sourceMapPath_1);
                    fs_1.writeFile(sourceMapPath_1, mappingsOutput, function (mapWriteErr) {
                        if (mapWriteErr) {
                            util_1.Logger.error("Error writing css map file, " + sourceMapPath_1 + ": " + mapWriteErr);
                        }
                        else {
                            util_1.Logger.debug("sass saved css map: " + sourceMapPath_1);
                        }
                    });
                }
                // css file all saved
                // note that we're not waiting on the css map to finish saving
                resolve();
            }
        });
    });
}
function defaultSortComponentPathsFn(a, b) {
    var aIndexOfNodeModules = a.indexOf('node_modules');
    var bIndexOfNodeModules = b.indexOf('node_modules');
    if (aIndexOfNodeModules > -1 && bIndexOfNodeModules > -1) {
        return (a > b) ? 1 : -1;
    }
    if (aIndexOfNodeModules > -1 && bIndexOfNodeModules === -1) {
        return -1;
    }
    if (aIndexOfNodeModules === -1 && bIndexOfNodeModules > -1) {
        return 1;
    }
    return (a > b) ? 1 : -1;
}
function defaultSortComponentFilesFn(a, b) {
    var aPeriods = a.split('.').length;
    var bPeriods = b.split('.').length;
    var aDashes = a.split('-').length;
    var bDashes = b.split('-').length;
    if (aPeriods > bPeriods) {
        return 1;
    }
    else if (aPeriods < bPeriods) {
        return -1;
    }
    if (aDashes > bDashes) {
        return 1;
    }
    else if (aDashes < bDashes) {
        return -1;
    }
    return (a > b) ? 1 : -1;
}
function getRenderCacheKey(sassConfig) {
    return [
        sassConfig.data,
        sassConfig.file,
    ].join('|');
}
var lastRenderKey = null;
var SASS_TASK_INFO = {
    fullArgConfig: '--sass',
    shortArgConfig: '-s',
    envConfig: 'ionic_sass',
    defaultConfigFilename: 'sass.config'
};
