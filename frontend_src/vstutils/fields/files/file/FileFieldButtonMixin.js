/**
 * Mixin for file field buttons (cleanValue, readFile, hideField).
 */
const FileFieldButtonMixin = {
    data() {
        return {
            wrapper_classes: [],
            wrapper_styles: {},
            span_classes: ['btn', 'btn-default', 'btn-right', 'textfile'],
            span_styles: { float: 'right', marginLeft: '10px', marginBottom: '10px' },
            icon_styles: {},
        };
    },
};

export default FileFieldButtonMixin;
