import { BuildContext, generateContext, Logger } from './util';
import { emptyDirSync } from 'fs-extra';


export function clean(context?: BuildContext) {
  context = generateContext(context);

  const logger = new Logger('clean');

  try {
    Logger.debug(`clean ${context.wwwDir}`);

    emptyDirSync(context.wwwDir);
    logger.finish();

  } catch (e) {
    logger.fail(e, `Error cleaning ${context.wwwDir}, ${e}`);
    throw e;
  }
}
