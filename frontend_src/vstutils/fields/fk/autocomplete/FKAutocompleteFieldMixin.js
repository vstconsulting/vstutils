import $ from 'jquery';
import { BaseFieldContentEdit } from '../../base';
import { escapeHtml, getDependenceValueAsString, guiLocalSettings, RequestTypes } from '../../../utils';
import { AutocompleteFieldContentEditMixin } from '../../autocomplete';
import { FKFieldContent, FKFieldMixin } from '../fk';
import FKAutocompleteFieldContentEdit from './FKAutocompleteFieldContentEdit.js';
import signals from '../../../signals.js';

/**
 * @vue/component
 */
const FKAutocompleteFieldMixin = {
    components: {
        field_content_edit: {
            mixins: [
                BaseFieldContentEdit,
                AutocompleteFieldContentEditMixin,
                FKFieldContent,
                FKAutocompleteFieldContentEdit,
            ],
            methods: {
                /**
                 * Redefinition of '_renderItem' method
                 * of autocomplete_field_content_edit_mixin.
                 */
                // eslint-disable-next-line no-unused-vars
                _renderItem({ value_field, view_field }, search) {
                    return `<div class="autocomplete-suggestion"
                                 data-value="${escapeHtml(String(value_field))}"
                            >
                                ${escapeHtml(String(view_field))}
                            </div>`;
                },
                /**
                 * Redefinition of '_getAutocompleteValue' method
                 * of autocomplete_field_content_edit_mixin.
                 */
                _getAutocompleteValue(item) {
                    let value = $(item).attr('data-value');
                    let prefetch_value = $(item).text();
                    return {
                        value: value,
                        prefetch_value: prefetch_value,
                    };
                },
                /**
                 * Redefinition of '_filterAutocompleteData' method
                 * of autocomplete_field_content_edit_mixin.
                 */
                async _filterAutocompleteData(search_input, response) {
                    let filters = {
                        limit: guiLocalSettings.get('page_size') || 20,
                        [this.field.viewField]: search_input,
                    };

                    let field_dependence_data = getDependenceValueAsString(
                        this.data,
                        this.props.field_dependence_name,
                    );
                    // TODO Make dependence like in fk
                    let format_data = {
                        fieldType: this.field.options.format,
                        modelName: this.queryset.getModelClass(RequestTypes.LIST).name,
                        fieldName: this.field.options.name,
                    };

                    let all = this.querysets.map((qs) => {
                        let signal_obj = {
                            qs: qs,
                            filters: filters,
                        };
                        if (field_dependence_data !== undefined) {
                            signal_obj.field_dependence_name = this.props.field_dependence_name;
                            signal_obj.filter_name = this.props.filter_name;
                            signal_obj[this.props.field_dependence_name] = field_dependence_data;
                        }
                        signals.emit(
                            'filter.{fieldType}.{modelName}.{fieldName}'.format(format_data),
                            signal_obj,
                        );
                        if (!Object.prototype.hasOwnProperty.call(signal_obj, 'nest_prom')) {
                            return qs.filter(filters).items();
                        } else {
                            return signal_obj.nest_prom;
                        }
                    });

                    try {
                        const results = await Promise.all(all);

                        let matches = [];

                        if (this.field.options.default !== undefined) {
                            if (typeof this.field.options.default !== 'object') {
                                matches.push({
                                    value_field: this.field.options.default,
                                    view_field: this.field.options.default,
                                });
                            } else {
                                matches.push(this.field.options.default);
                            }
                        }

                        results.forEach((instances) => {
                            instances.forEach((instance) => {
                                matches.push({
                                    value_field: this.field.getValueFieldValue(instance),
                                    view_field: this.field.getViewFieldValue(instance),
                                });
                            });
                        });

                        response(matches);
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        },
    },
    mixins: [FKFieldMixin],
};

export default FKAutocompleteFieldMixin;
