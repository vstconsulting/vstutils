import { BaseField } from './base';

const HiddenFieldMixin = {
    render: function (createElement) {
        return createElement('div');
    },
};

/**
 * Hidden guiField class.
 */
class HiddenField extends BaseField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(HiddenFieldMixin);
    }
}

export { HiddenField, HiddenFieldMixin };
