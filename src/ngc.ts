import { basename, join } from 'path';
import { BuildContext, BuildOptions, TaskInfo, fillConfigDefaults, generateContext, generateBuildOptions, getNodeBinExecutable, isTsFilename, Logger } from './util';
import { copy as fsCopy, emptyDirSync, outputJsonSync, statSync } from 'fs-extra';
import { getSrcTsConfig } from './tsc';


export function ngc(context?: BuildContext, options?: BuildOptions, ngcConfig?: NgcConfig) {
  context = generateContext(context);
  options = generateBuildOptions(options);
  ngcConfig = fillConfigDefaults(context, ngcConfig, NGC_TASK_INFO);

  const logger = new Logger('ngc');

  // first make a copy of src TS files
  // and copy them into the tmp directory
  return copySrcTsToTmpDir(context).then(() => {
    // ts files have finishe being copied to the tmp directory
    // now compile the copied TS files with NGC
    return runNgc(context, options, ngcConfig);

  }).then(() => {
    return logger.finish();
  }).catch((err: Error) => {
    logger.fail(err);
    return Promise.reject(err);
  });
}


export function ngcUpdate(event: string, path: string, context: BuildContext, options: BuildOptions) {
  Logger.debug(`ngcUpdate, event: ${event}, path: ${path}`);

  const ngcConfig = fillConfigDefaults(context, null, NGC_TASK_INFO);
  return runNgc(context, options, ngcConfig);
}


function runNgc(context: BuildContext, options: BuildOptions, ngcConfig: NgcConfig) {
  return new Promise((resolve, reject) => {
    // make a copy of the users src tsconfig file
    // and save the modified copy into the tmp directory
    createTmpTsConfig(context, ngcConfig);

    const ngcCmd = getNodeBinExecutable(context, 'ngc');
    if (!ngcCmd) {
      reject(new Error(`Unable to find Angular Compiler "ngc" command: ${ngcCmd}`));
      return;
    }

    // let's kick off the actual ngc command on our copied TS files
    // use the user's ngc in their node_modules to ensure ngc
    // versioned and working along with the user's ng2 version
    const spawn = require('cross-spawn');
    const ngcCmdArgs = [
      '--project', getTmpTsConfigPath(context)
    ];
    let hadAnError = false;

    // would love to not use spawn here but import and run ngc directly
    const cp = spawn(ngcCmd, ngcCmdArgs);

    cp.stdout.on('data', (data: string) => {
      Logger.info(data);
    });

    cp.stderr.on('data', (data: string) => {
      Logger.error(`ngc error: ${data}`);
      hadAnError = true;
    });

    cp.on('close', (code: string) => {
      if (hadAnError) {
        reject(new Error(`NGC encountered an error`));
      } else {
        resolve();
      }
    });
  });
}


function createTmpTsConfig(context: BuildContext, ngcConfig: NgcConfig) {
  // create the tsconfig from the original src
  const tsConfig = getSrcTsConfig(context);

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
  outputJsonSync(getTmpTsConfigPath(context), tsConfig);
}


function copySrcTsToTmpDir(context: BuildContext) {
  return new Promise((resolve, reject) => {

    // ensure the tmp directory is ready to go
    try {
      emptyDirSync(context.tmpDir);
    } catch (e) {
      throw new Error(`tmpDir error: ${e}`);
    }

    const copyOpts: any = {
      filter: filterCopyFiles
    };

    Logger.debug(`copySrcTsToTmpDir, src: ${context.srcDir}, src: ${context.tmpDir}`);

    fsCopy(context.srcDir, context.tmpDir, copyOpts, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


function filterCopyFiles(filePath: any, hoop: any) {
  let shouldInclude = false;

  try {
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      shouldInclude = (EXCLUDE_DIRS.indexOf(basename(filePath)) < 0);

    } else {
      if (isTsFilename(filePath)) {
        shouldInclude = true;
      }

      if (filePath.substr(filePath.length - 5) === '.html') {
        shouldInclude = true;
      }
    }

  } catch (e) {}

  return shouldInclude;
}

export function getTmpTsConfigPath(context: BuildContext) {
  return join(context.tmpDir, 'tsconfig.json');
}


const EXCLUDE_DIRS = ['assets', 'theme'];


const NGC_TASK_INFO: TaskInfo = {
  fullArgConfig: '--ngc',
  shortArgConfig: '-n',
  envConfig: 'ionic_ngc',
  defaultConfigFilename: 'ngc.config'
};


export interface NgcConfig {
  include: string[];
}
