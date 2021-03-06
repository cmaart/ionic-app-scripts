import { BuildContext, BuildOptions } from './util';
export declare function ngc(context?: BuildContext, options?: BuildOptions, ngcConfig?: NgcConfig): Promise<boolean>;
export declare function ngcUpdate(event: string, path: string, context: BuildContext, options: BuildOptions): Promise<{}>;
export declare function getTmpTsConfigPath(context: BuildContext): string;
export interface NgcConfig {
    include: string[];
}
