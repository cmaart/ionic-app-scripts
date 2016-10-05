import { BuildContext, BuildOptions } from './util';
export declare function tsc(context?: BuildContext, options?: BuildOptions): Promise<boolean>;
export declare function getSrcTsConfig(context: BuildContext): TsConfig;
export interface TsConfig {
    compilerOptions: {
        module: string;
        noEmitOnError: boolean;
        outDir: string;
        removeComments: boolean;
        target: string;
    };
    include: string[];
    exclude: string[];
}
