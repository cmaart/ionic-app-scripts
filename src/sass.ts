import { basename, dirname, join, sep } from 'path';
import { BuildContext, BuildOptions, fillConfigDefaults, generateContext, generateBuildOptions, Logger, replacePathVars, TaskInfo } from './util';
import { getModulePathsCache } from './bundle';
import { readdirSync, writeFile } from 'fs';


export function sass(context?: BuildContext, options?: BuildOptions, sassConfig?: SassConfig, useCache = false) {
  context = generateContext(context);
  options = generateBuildOptions(options);
  sassConfig = fillConfigDefaults(context, sassConfig, SASS_TASK_INFO);

  const logger = new Logger('sass');

  if (!context.moduleFiles) {
    // we haven't already gotten the moduleFiles in this process
    // see if we have it cached
    context.moduleFiles = getModulePathsCache();
    if (!context.moduleFiles) {
      logger.fail(null, 'Cannot generate Sass files without first bundling JavaScript ' +
                  'files in order to know all used modules. Please build JS files first.');
      return Promise.reject(new Error('Missing module paths for sass build'));
    }
  }

  // where the final css output file is saved
  if (!sassConfig.outFile) {
    sassConfig.outFile = join(context.buildDir, sassConfig.outputFilename);
  }
  Logger.debug(`sass outFile: ${sassConfig.outFile}`);

  // import paths where the sass compiler will look for imports
  sassConfig.includePaths.unshift(join(context.srcDir));
  Logger.debug(`sass includePaths: ${sassConfig.includePaths}`);

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
  return render(sassConfig, useCache).then(() => {
    return logger.finish();

  }).catch((err: Error) => {
    logger.fail(err, null, false);
    return Promise.reject(err);
  });
}


export function sassUpdate(event: string, path: string, context: BuildContext, options: BuildOptions, useCache: boolean = false) {
  Logger.debug(`sassUpdate, event: ${event}, path: ${path}`);

  const sassConfig = fillConfigDefaults(context, null, SASS_TASK_INFO);
  return sass(context, options, sassConfig, useCache);
}


function generateSassData(context: BuildContext, options: BuildOptions, sassConfig: SassConfig) {
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

  const moduleDirectories: string[] = [];
  context.moduleFiles.forEach(moduleFile => {
    const moduleDirectory = dirname(moduleFile);
    if (moduleDirectories.indexOf(moduleDirectory) < 0) {
      moduleDirectories.push(moduleDirectory);
    }
  });

  Logger.debug(`sass moduleDirectories: ${moduleDirectories.length}`);

  // gather a list of all the sass variable files that should be used
  // these variable files will be the first imports
  const userSassVariableFiles = sassConfig.variableSassFiles.map(f => {
    return replacePathVars(context, f);
  });

  // gather a list of all the sass files that are next to components we're bundling
  const componentSassFiles = getComponentSassFiles(moduleDirectories, context, sassConfig);

  Logger.debug(`sass userSassVariableFiles: ${userSassVariableFiles.length}`);
  Logger.debug(`sass componentSassFiles: ${componentSassFiles.length}`);

  const sassImports = userSassVariableFiles.concat(componentSassFiles).map(sassFile => '"' + sassFile.replace(/\\/g, '\\\\') + '"');

  if (sassImports.length) {
    sassConfig.data = `@charset "UTF-8"; @import ${sassImports.join(',')};`;
  }
}


function getComponentSassFiles(moduleDirectories: string[], context: BuildContext, sassConfig: SassConfig) {
  const collectedSassFiles: string[] = [];
  const componentDirectories = getComponentDirectories(moduleDirectories, sassConfig);

  // sort all components with the library components being first
  // and user components coming last, so it's easier for user css
  // to override library css with the same specificity
  const sortedComponentPaths = componentDirectories.sort(sassConfig.sortComponentPathsFn);

  sortedComponentPaths.forEach(componentPath => {
    addComponentSassFiles(componentPath, collectedSassFiles, context, sassConfig);
  });

  return collectedSassFiles;
}


function addComponentSassFiles(componentPath: string, collectedSassFiles: string[], context: BuildContext, sassConfig: SassConfig) {
  let siblingFiles = getSiblingSassFiles(componentPath, sassConfig);

  if (!siblingFiles.length && componentPath.indexOf(sep + 'node_modules') === -1) {

    // if we didn't find anything, see if this module is mapped to another directory
    for (const k in sassConfig.directoryMaps) {
      if (sassConfig.directoryMaps.hasOwnProperty(k)) {
        var actualDirectory = replacePathVars(context, k);
        var mappedDirectory = replacePathVars(context, sassConfig.directoryMaps[k]);

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

    siblingFiles.forEach(componentFile => {
      collectedSassFiles.push(componentFile);
    });
  }
}


function getSiblingSassFiles(componentPath: string, sassConfig: SassConfig) {
  return readdirSync(componentPath).filter(f => {
    return isValidSassFile(f, sassConfig);
  }).map(f => {
    return join(componentPath, f);
  });
}


function isValidSassFile(filename: string, sassConfig: SassConfig) {
  for (var i = 0; i < sassConfig.includeFiles.length; i++) {
    if (sassConfig.includeFiles[i].test(filename)) {
      // filename passes the test to be included
      for (var j = 0; j < sassConfig.excludeFiles.length; j++) {
        if (sassConfig.excludeFiles[j].test(filename)) {
          // however, it also passed the test that it should be excluded
          Logger.debug(`sass excluded: ${filename}`);
          return false;
        }
      }
      return true;
    }
  }
  return false;
}


function getComponentDirectories(moduleDirectories: string[], sassConfig: SassConfig) {
  // filter out module directories we know wouldn't have sibling component sass file
  // just a way to reduce the amount of lookups to be done later
  return moduleDirectories.filter(moduleDirectory => {
    for (var i = 0; i < sassConfig.excludeModules.length; i++) {
      if (moduleDirectory.indexOf(sassConfig.excludeModules[i]) > -1) {
        return false;
      }
    }
    return true;
  });
}


function render(sassConfig: SassConfig, useCache: boolean) {
  return new Promise((resolve, reject) => {

    if (useCache && lastRenderKey !== null) {
      // if the sass data imports are same, don't bother
      const renderKey = getRenderCacheKey(sassConfig);
      if (renderKey === lastRenderKey) {
        resolve();
        return;
      }
    }

    sassConfig.omitSourceMapUrl = true;

    if (sassConfig.sourceMap) {
      sassConfig.sourceMap = basename(sassConfig.outFile);
      sassConfig.sourceMapContents = true;
    }

    const nodeSass = require('node-sass');

    nodeSass.render(sassConfig, (renderErr: any, sassResult: SassResult) => {
      if (renderErr) {
        // sass render error!
        if (renderErr.line) {
          Logger.error(`Sass Error: line: ${renderErr.line}, column: ${renderErr.column}\n${renderErr.message}`);
        } else {
          Logger.error(`Sass Error: ${renderErr}`);
        }

        reject(new Error('Sass compile error'));

      } else {
        // sass render success!
        renderSassSuccess(sassResult, sassConfig).then(() => {
          lastRenderKey = getRenderCacheKey(sassConfig);

          resolve();

        }).catch(reason => {
          reject(reason);
        });
      }
    });
  });
}


function renderSassSuccess(sassResult: SassResult, sassConfig: SassConfig): Promise<any> {
  if (sassConfig.autoprefixer) {
    // with autoprefixer
    const postcss = require('postcss');
    const autoprefixer = require('autoprefixer');

    let autoPrefixerMapOptions: any = false;
    if (sassConfig.sourceMap) {
      autoPrefixerMapOptions = {
        inline: false
      };
    }

    const postcssOptions: any = {
      to: basename(sassConfig.outFile),
      map: autoPrefixerMapOptions
    };

    Logger.debug(`sass, start postcss/autoprefixer`);

    return postcss([autoprefixer(sassConfig.autoprefixer)])
      .process(sassResult.css, postcssOptions).then((postCssResult: any) => {
        postCssResult.warnings().forEach((warn: any) => {
          Logger.warn(warn.toString());
        });

        let apMapResult: string = null;
        if (sassConfig.sourceMap && postCssResult.map) {
          Logger.debug(`sass, parse postCssResult.map`);
          apMapResult = JSON.parse(postCssResult.map.toString()).mappings;
        }

        Logger.debug(`sass: postcss/autoprefixer completed`);
        return writeOutput(sassConfig, postCssResult.css, apMapResult);
      });
  }

  // without autoprefixer
  generateSourceMaps(sassResult, sassConfig);

  let sassMapResult: string = null;
  if (sassResult.map) {
    sassMapResult = JSON.parse(sassResult.map.toString()).mappings;
  }

  return writeOutput(sassConfig, sassResult.css, sassMapResult);
}


function generateSourceMaps(sassResult: SassResult, sassConfig: SassConfig) {
  // this can be async and nothing needs to wait on it

  // build Source Maps!
  if (sassResult.map) {
    Logger.debug(`sass, generateSourceMaps`);

    // transform map into JSON
    const sassMap: SassMap = JSON.parse(sassResult.map.toString());

    // grab the stdout and transform it into stdin
    const sassMapFile = sassMap.file.replace(/^stdout$/, 'stdin');

    // grab the base file name that's being worked on
    const sassFileSrc = sassConfig.outFile;

    // grab the path portion of the file that's being worked on
    const sassFileSrcPath = dirname(sassFileSrc);
    if (sassFileSrcPath) {
      // prepend the path to all files in the sources array except the file that's being worked on
      const sourceFileIndex = sassMap.sources.indexOf(sassMapFile);
      sassMap.sources = sassMap.sources.map((source, index) => {
        return (index === sourceFileIndex) ? source : join(sassFileSrcPath, source);
      });
    }

    // remove 'stdin' from souces and replace with filenames!
    sassMap.sources = sassMap.sources.filter(src => {
      if (src !== 'stdin') {
        return src;
      }
    });

    // Replace the map file with the original file name (but new extension)
    // sassMap.file = gutil.replaceExtension(sassFileSrc, '.css');
    // Apply the map
    // applySourceMap(file, sassMap);
  }
}


function writeOutput(sassConfig: SassConfig, cssOutput: string, mappingsOutput: string) {
  return new Promise((resolve, reject) => {

    Logger.debug(`sass start write output: ${sassConfig.outFile}`);

    writeFile(sassConfig.outFile, cssOutput, (cssWriteErr: any) => {
      if (cssWriteErr) {
        reject(new Error(`Error writing css file, ${sassConfig.outFile}: ${cssWriteErr}`));

      } else {
        Logger.debug(`sass saved output: ${sassConfig.outFile}`);

        if (mappingsOutput) {
          // save the css map file too
          // this save completes async and does not hold up the resolve
          const sourceMapPath = join(dirname(sassConfig.outFile), basename(sassConfig.outFile) + '.map');

          Logger.debug(`sass start write css map: ${sourceMapPath}`);

          writeFile(sourceMapPath, mappingsOutput, (mapWriteErr: any) => {
            if (mapWriteErr) {
              Logger.error(`Error writing css map file, ${sourceMapPath}: ${mapWriteErr}`);

            } else {
              Logger.debug(`sass saved css map: ${sourceMapPath}`);
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


function defaultSortComponentPathsFn(a: any, b: any): number {
  const aIndexOfNodeModules = a.indexOf('node_modules');
  const bIndexOfNodeModules = b.indexOf('node_modules');

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


function defaultSortComponentFilesFn(a: any, b: any): number {
  const aPeriods = a.split('.').length;
  const bPeriods = b.split('.').length;
  const aDashes = a.split('-').length;
  const bDashes = b.split('-').length;

  if (aPeriods > bPeriods) {
    return 1;
  } else if (aPeriods < bPeriods) {
    return -1;
  }

  if (aDashes > bDashes) {
    return 1;
  } else if (aDashes < bDashes) {
    return -1;
  }

  return (a > b) ? 1 : -1;
}


function getRenderCacheKey(sassConfig: SassConfig) {
  return [
    sassConfig.data,
    sassConfig.file,
  ].join('|');
}


let lastRenderKey: string = null;


const SASS_TASK_INFO: TaskInfo = {
  fullArgConfig: '--sass',
  shortArgConfig: '-s',
  envConfig: 'ionic_sass',
  defaultConfigFilename: 'sass.config'
};


export interface SassConfig {
  // https://www.npmjs.com/package/node-sass
  outputFilename?: string;
  outFile?: string;
  file?: string;
  data?: string;
  includePaths?: string[];
  excludeModules?: string[];
  includeFiles?: RegExp[];
  excludeFiles?: RegExp[];
  directoryMaps?: {[key: string]: string};
  sortComponentPathsFn?: (a: any, b: any) => number;
  sortComponentFilesFn?: (a: any, b: any) => number;
  variableSassFiles?: string[];
  autoprefixer?: any;
  sourceMap?: string;
  omitSourceMapUrl?: boolean;
  sourceMapContents?: boolean;
}


export interface SassResult {
  css: string;
  map: SassMap;
}


export interface SassMap {
  file: string;
  sources: any[];
}
