import { BuildContext, BuildOptions } from './util';
export declare function bundle(context?: BuildContext, options?: BuildOptions, rollupConfig?: RollupConfig, useCache?: boolean): Promise<boolean>;
export declare function bundleUpdate(event: string, path: string, context: BuildContext, options: BuildOptions, useCache?: boolean): Promise<boolean>;
export declare function getModulePathsCache(): string[];
export declare function clearCachedModule(id: string): boolean;
export interface RollupConfig {
    entry?: string;
    sourceMap?: boolean;
    plugins?: any[];
    format?: string;
    dest?: string;
    cache?: RollupBundle;
    onwarn?: Function;
}
export interface RollupBundle {
    write: Function;
    modules: {
        id: string;
    }[];
}
