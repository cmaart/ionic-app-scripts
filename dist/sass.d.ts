import { BuildContext, BuildOptions } from './util';
export declare function sass(context?: BuildContext, options?: BuildOptions, sassConfig?: SassConfig, useCache?: boolean): Promise<never>;
export declare function sassUpdate(event: string, path: string, context: BuildContext, options: BuildOptions, useCache?: boolean): Promise<never>;
export interface SassConfig {
    outputFilename?: string;
    outFile?: string;
    file?: string;
    data?: string;
    includePaths?: string[];
    excludeModules?: string[];
    includeFiles?: RegExp[];
    excludeFiles?: RegExp[];
    directoryMaps?: {
        [key: string]: string;
    };
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
