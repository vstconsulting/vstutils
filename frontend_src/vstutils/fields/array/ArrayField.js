import { BaseField } from '../base';
import { createPropertyProxy, getProp, registerHook } from '../../utils';
import { ArrayFieldMixin } from './mixins.js';
import { FKField } from '../fk/fk';
import { FKArrayFieldMixin } from './custom/fk.js';
import { StringField } from '../text';
import { StringArrayFieldMixin } from './custom/string.js';
import { ChoicesField } from '../choices';
import { ChoicesArrayFieldMixin } from './custom/choices.js';
import { NumberField, integer } from '../numbers';
import { NumberArrayFieldMixin } from './custom/number.js';

export default class ArrayField extends BaseField {
    static SEPARATORS = new Map([
        ['csv', ','],
        ['ssv', ' '],
        ['tsv', '\t'],
        ['pipes', '|'],
    ]);

    static CUSTOM_COMPONENTS = new Map([
        [ChoicesField, ChoicesArrayFieldMixin],
        [FKField, FKArrayFieldMixin],
        [StringField, StringArrayFieldMixin],
        [NumberField, NumberArrayFieldMixin],
        [integer.IntegerField, NumberArrayFieldMixin],
    ]);

    constructor(options) {
        super(options);
        this.collectionFormat = options.collectionFormat || options['x-collectionFormat'];
        this.separator = this.constructor.SEPARATORS.get(this.collectionFormat);
        this.minItems = getProp(options, 'minItems', 0);
        this.maxItems = getProp(options, 'maxItems', Number.POSITIVE_INFINITY);
        this.uniqueItems = getProp(options, 'uniqueItems', false);

        if (!options.items) {
            this._error('"items" attribute is required for array field');
        }
        /** @type {BaseField} */
        this.itemField = null;
        registerHook('app.beforeInit', this.resolveItemField.bind(this));
    }

    static get mixins() {
        return [ArrayFieldMixin];
    }

    getEmptyValue() {
        return [];
    }

    prepareFieldForView(path) {
        this.itemField.prepareFieldForView(path);
    }

    resolveItemField() {
        this.itemField = this.constructor.app.fieldsResolver.resolveField(this.options.items, this.name);
        this.itemField.model = this.model;

        const customComponent = this.constructor.CUSTOM_COMPONENTS.get(this.itemField.constructor);
        if (customComponent) {
            this.component.mixins = [customComponent];
        }
    }

    toInner(data) {
        let value = super.toInner(data);
        if (value) {
            if (value.length === 0) {
                return this.separator ? '' : value;
            }
            const dataCopy = Object.assign({}, data);
            value = value.map((item) => {
                dataCopy[this.name] = item;
                return String(this.itemField.toInner(dataCopy));
            });
            return this.separator ? value.join(this.separator) : value;
        }
        return value;
    }

    _deserializeValue(data) {
        const value = this._getValueFromData(data);
        if (!value) {
            return [];
        }
        // If string array format is used and value was not fetched from api
        if (this.separator && !Array.isArray(value)) {
            return value.split(this.separator);
        }
        return value;
    }

    toRepresent(data) {
        const value = this._deserializeValue(data);
        if (value) {
            const dataCopy = Object.assign({}, data);
            return value.map((item) => {
                dataCopy[this.name] = item;
                return this.itemField.toRepresent(dataCopy);
            });
        }
        return value;
    }

    /**
     * Calls afterInstancesFetched hook of item field for all items in all provided instances.
     * @param {Model[]} instances - Instances of Model class which have this field
     * @param {QuerySet} queryset - Queryset used to request instances
     * @return {Promise<void>}
     */
    async afterInstancesFetched(instances, queryset) {
        // Keys are original instances
        // Values are array of instances for each item in original instance's value
        const itemInstancesMap = new Map();
        for (const instance of instances) {
            const items = this._deserializeValue(instance._data);
            // Create new instance for each item and replace array value with value of one item
            const itemInstances = items.map(
                (item) =>
                    new instance.constructor(
                        createPropertyProxy(instance._data, this.name, item),
                        instance._queryset,
                        instance._parentInstance,
                    ),
            );
            itemInstancesMap.set(instance, itemInstances);
        }

        const allItemInstances = Array.from(itemInstancesMap.values()).flat();
        await this.itemField.afterInstancesFetched(allItemInstances, queryset);

        // Put processed items back into original instances
        for (const [instance, itemInstances] of itemInstancesMap) {
            instance._setFieldValue(
                this.name,
                itemInstances.map((itemInstance) => this._getValueFromData(itemInstance._data)),
                true,
            );
        }
    }
}
