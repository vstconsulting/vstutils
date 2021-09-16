export default class ResolutionValidatorConfig {
    constructor(minWidth, maxWidth, minHeight, maxHeight) {
        this.width = {
            min: minWidth,
            max: maxWidth,
        };
        this.height = {
            min: minHeight,
            max: maxHeight,
        };
    }
    static createIfNeeded(options) {
        const { min_width, max_width, min_height, max_height } = options?.['x-validators'] || {};
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
