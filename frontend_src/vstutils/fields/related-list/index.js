import { BaseField } from '../base';
import BaseFieldMixin from '../base/BaseFieldMixin.vue';
import RelatedListFieldListView from './RelatedListFieldListView.vue';
import RelatedListFieldReadonlyView from './RelatedListFieldReadonlyView.vue';
import { addCssClassesToElement, registerHook } from '../../utils';

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
    data() {
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

/**
 * Field shows selected fields values of related objects. On list view shows modal window.
 */
export class RelatedListField extends BaseField {
    constructor(options) {
        super(options);
        this.viewType = this.format;
        this.format = 'related_list';
        registerHook('allModels.created', () => {
            this.itemsModel = this.constructor.app.modelsResolver.bySchemaObject(this.options.items);
        });
    }

    static get mixins() {
        return [RelatedListFieldMixin];
    }

    prepareFieldForView(path) {
        for (const field of this.itemsModel.fields.values()) {
            field.prepareFieldForView(path);
        }
    }

    afterInstancesFetched(instances, queryset) {
        for (const instance of instances) {
            const value = this._getValueFromData(instance._data) || [];
            instance._setFieldValue(
                this.name,
                value.map((item) => new this.itemsModel(item)),
                true,
            );
        }
        const allInstances = instances.flatMap((instance) => this._getValueFromData(instance._data));

        const fields = Array.from(this.itemsModel.fields.values());
        return Promise.all(fields.map((field) => field.afterInstancesFetched(allInstances, queryset)));
    }
}
