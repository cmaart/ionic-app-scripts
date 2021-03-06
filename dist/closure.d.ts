import { BuildContext } from './util';
export declare function closure(context?: BuildContext, closureConfig?: ClosureConfig): Promise<boolean>;
export declare function isClosureSupported(context: BuildContext): boolean;
export interface ClosureConfig {
    executable: string;
}
