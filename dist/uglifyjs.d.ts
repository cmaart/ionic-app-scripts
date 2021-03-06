import { BuildContext } from './util';
export declare function uglifyjs(context?: BuildContext, uglifyJsConfig?: UglifyJsConfig): Promise<boolean>;
export interface UglifyJsConfig {
    sourceFile: string;
    destFileName: string;
    inSourceMap: string;
    outSourceMap: string;
    mangle: boolean;
    compress: boolean;
    comments: boolean;
}
