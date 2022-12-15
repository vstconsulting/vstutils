interface Options {
    'x-validators'?: {
        min_width?: number;
        max_width?: number;
        min_height?: number;
        max_height?: number;
    };
}

export default class ResolutionValidatorConfig {
    width: { min: number; max: number };
    height: { min: number; max: number };

    constructor(minWidth: number, maxWidth: number, minHeight: number, maxHeight: number) {
        this.width = {
            min: minWidth,
            max: maxWidth,
        };
        this.height = {
            min: minHeight,
            max: maxHeight,
        };
    }
    static createIfNeeded(options: Options) {
        const { min_width, max_width, min_height, max_height } = options['x-validators'] || {};
        if ([min_width, max_width, min_height, max_height].some((param) => typeof param === 'number')) {
            return new ResolutionValidatorConfig(
                min_width || Number.NEGATIVE_INFINITY,
                max_width || Number.POSITIVE_INFINITY,
                min_height || Number.NEGATIVE_INFINITY,
                max_height || Number.POSITIVE_INFINITY,
            );
        }
        return null;
    }
}
