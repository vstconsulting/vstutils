import { BaseField } from '../base';
import BaseFieldMixin from '../base/BaseFieldMixin.vue';
import RelatedListFieldListView from './RelatedListFieldListView.vue';
import RelatedListFieldReadonlyView from './RelatedListFieldReadonlyView.vue';
import { addCssClassesToElement } from '../../utils';

/**
 * @vue/component
 */
export const RelatedListFieldMixin = {
    components: {
        field_content_readonly: RelatedListFieldReadonlyView,
        field_content_edit: RelatedListFieldReadonlyView,
        field_list_view: RelatedListFieldListView,
    },
    mixins: [BaseFieldMixin],
    data: function () {
        return {
            wrapper_classes_list: {
                base:
                    'form-group ' +
                    addCssClassesToElement('guiField', this.field.name, this.field.format || this.field.type),
                grid: 'col-lg-12 col-xs-12 col-sm-12 col-md-12',
            },
        };
    },
};

export class RelatedListField extends BaseField {
    constructor(options) {
        super(options);
        this.fields = options.additionalProperties.fields;
        this.viewType = options.additionalProperties.viewType;
    }

    static get mixins() {
        return [RelatedListFieldMixin];
    }
}
