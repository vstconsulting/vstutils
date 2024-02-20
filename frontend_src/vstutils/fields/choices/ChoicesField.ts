import type { Model } from '@/vstutils/models';
import type { CustomMatcher, TemplateResult, TemplateSelection } from '@/vstutils/select2';
import { i18n } from '@/vstutils/translation';
import type { FieldOptions, FieldXOptions } from '../base';
import { StringField } from '../text';
import ChoicesFieldMixin from './ChoicesFieldMixin.js';
import type { RepresentData } from '@/vstutils/utils';
import { ChoicesArrayFieldMixin } from './array';

export type RawEnumItem = string | [string, string] | { value: string; prefetch_value: string } | Model;

export interface EnumItem {
    id: string;
    text: string;
}

interface ChoicesFieldXOptions extends FieldXOptions {
    fieldForEnum?: string;

    templateResult?: TemplateResult;
    templateSelection?: TemplateSelection;
    customMatcher?: CustomMatcher;
}

export class ChoicesField extends StringField<ChoicesFieldXOptions> {
    enum: string[] | null = null;
    fieldForEnum?: string;

    templateResult?: TemplateResult;
    templateSelection?: TemplateSelection;
    customMatcher?: CustomMatcher;

    constructor(options: FieldOptions<ChoicesFieldXOptions, string>) {
        super(options);
        this.enum = options.enum ?? null;
        this.fieldForEnum = this.props.fieldForEnum;

        this.templateResult = this.props.templateResult;
        this.templateSelection = this.props.templateSelection;
        this.customMatcher = this.props.customMatcher;
    }

    translateValue(value: string) {
        const key = `:model:${this.model?.translateModel || ''}:${this.translateFieldName}:${value}`;
        if (i18n.te(key)) {
            return i18n.ts(key);
        }
        return value;
    }

    getEmptyValue() {
        if (this.enum) {
            return this.enum[0];
        }
        return null;
    }

    prepareEnumItem(item?: RawEnumItem): EnumItem | undefined {
        if (typeof item === 'string') {
            return { id: item, text: item };
        }
        if (Array.isArray(item)) {
            // Example: [['val1', 'Val 1'], ['val2', 'Val 2']]
            return { id: item[0], text: item[1] };
        }
        if (typeof item === 'object') {
            if ('getViewFieldString' in item) {
                const val = item.getViewFieldString();
                if (val) {
                    return { id: val, text: val };
                }
                return;
            }
            if (item.value && item.prefetch_value) {
                // Legacy object format (value and prefetchValue properties)
                return { id: item.value, text: item.prefetch_value };
            }
        }

        this.warn(`Can not handle option "${JSON.stringify(item)}"`);
        return undefined;
    }

    prepareEnumData(data: RawEnumItem[] | string | null = this.enum): EnumItem[] {
        if (typeof data === 'string' && data.length > 0) {
            // Example: 'val1,val2'
            return data.split(',').map((val) => ({ id: val, text: val }));
        }
        if (Array.isArray(data)) {
            return data.map((item) => this.prepareEnumItem(item)).filter(Boolean) as EnumItem[];
        }
        return [];
    }

    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return [ChoicesFieldMixin];
    }

    override getArrayComponent() {
        return ChoicesArrayFieldMixin;
    }

    getContainerCssClasses(data: RepresentData) {
        const value = this.getValue(data);
        if (value) {
            return [this.formatContainerCssClass(value)];
        }
        return [];
    }
}
