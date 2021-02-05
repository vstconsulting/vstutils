export default class ResolutionValidatorConfig {
    constructor(minWidth, maxWidth, minHeight, maxHeight) {
        this.minWidth = minWidth;
        this.maxWidth = maxWidth;
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
    }
    static createIfNeeded({ additionalProperties: { min_width, max_width, min_height, max_height } }) {
        if ([min_width, max_width, min_height, max_height].includes(undefined)) {
            return null;
        }
        return new ResolutionValidatorConfig(min_width, max_width, min_height, max_height);
    }
}
