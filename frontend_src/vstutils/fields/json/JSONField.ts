import { defineComponent } from 'vue';
import JsonFieldContentReadonly from './JsonFieldContentReadonly.vue';
import type { DefaultXOptions, FieldOptions, FieldPropsDefType } from '../base';
import { BaseField, BaseFieldMixin, FieldPropsDef } from '@/vstutils/fields/base';
import JsonMapper from './JsonMapper.js';
import type { InnerData } from '@/vstutils/utils';
import TextAreaFieldContentEdit from '@/vstutils/fields/text/TextAreaFieldContentEdit.vue';

const JSONFieldComponent = defineComponent({
    components: {
        field_content_readonly: JsonFieldContentReadonly,
        field_content_edit: TextAreaFieldContentEdit,
    },
    mixins: [BaseFieldMixin],
    provide() {
        return {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            jsonMapper: (this.field as JSONField).jsonMapper,
        };
    },
    props: FieldPropsDef as FieldPropsDefType<JSONField>,
});

class JSONField extends BaseField<string | number | object, string | number | object> {
    static fkLinkable = false;
    allowedMediaTypes = ['application/json'];
    jsonMapper: JsonMapper;

    constructor(options: FieldOptions<DefaultXOptions, string | number | object>, jsonMapper?: JsonMapper) {
        super(options);
        this.jsonMapper = jsonMapper ?? new JsonMapper();
    }

    override getEmptyValue() {
        return null;
    }

    override toRepresent(data: InnerData) {
        const represent = super.toRepresent(data);
        if (typeof represent === 'object') {
            return JSON.stringify(represent, undefined, 2);
        }
        return represent;
    }

    static get mixins() {
        return [JSONFieldComponent];
    }
}

export default JSONField;
