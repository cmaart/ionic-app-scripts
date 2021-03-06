import { BuildContext, BuildOptions } from './util';
export declare function copy(context?: BuildContext, copyConfig?: CopyConfig): Promise<boolean>;
export declare function copyUpdate(event: string, path: string, context: BuildContext, options: BuildOptions): Promise<any[]>;
export interface CopyConfig {
    include: CopyOptions[];
}
export interface CopyOptions {
    src: string;
    dest: string;
    filter: any;
}
