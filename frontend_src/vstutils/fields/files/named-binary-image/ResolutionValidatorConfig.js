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
    static createIfNeeded({ min_width, max_width, min_height, max_height }) {
        if ([min_width, max_width, min_height, max_height].includes(undefined)) {
            return null;
        }
        return new ResolutionValidatorConfig(min_width, max_width, min_height, max_height);
    }
}
