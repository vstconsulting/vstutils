import { BaseField, BaseFieldMixin } from '@/vstutils/fields/base';
import { onSchemaModelsCreated } from '@/vstutils/signals';
import RelatedListFieldListView from './RelatedListFieldListView.vue';
import RelatedListFieldReadonlyView from './RelatedListFieldReadonlyView.vue';

import type { FieldOptions, FieldXOptions } from '@/vstutils/fields/base';
import type { ModelDefinition } from '@/vstutils/AppConfiguration';
import type { ModelConstructor } from '@/vstutils/models';
import type { InnerData } from '@/vstutils/utils';

export const RelatedListFieldMixin = {
    components: {
        field_content_readonly: RelatedListFieldReadonlyView,
        field_content_edit: RelatedListFieldReadonlyView,
        field_list_view: RelatedListFieldListView,
    },
    mixins: [BaseFieldMixin],
};

type Inner = InnerData[];
type Represent = InnerData[];
type ViewType = 'list' | 'table';

interface RelatedListFieldOptions extends Omit<FieldOptions<FieldXOptions, Inner>, 'format'> {
    format?: ViewType;
}

/**
 * Field shows selected fields values of related objects. On list view shows modal window.
 */
export class RelatedListField extends BaseField<Inner, Represent> {
    static fkLinkable = false;

    viewType: ViewType;
    itemsModel?: ModelConstructor;

    constructor(options: RelatedListFieldOptions) {
        super(options);
        this.viewType = options.format ?? 'list';
        this.format = 'related_list';
        onSchemaModelsCreated(() => {
            this.itemsModel = this.app.modelsResolver.bySchemaObject(this.options.items as ModelDefinition);
        });
    }

    static get mixins() {
        return [RelatedListFieldMixin];
    }

    prepareFieldForView(path: string) {
        for (const field of this.itemsModel!.fields.values()) {
            field.prepareFieldForView(path);
        }
    }
}
