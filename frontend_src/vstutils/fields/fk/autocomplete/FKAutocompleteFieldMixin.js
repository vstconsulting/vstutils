import $ from 'jquery';
import { BaseFieldContentEdit } from '../../base';
import { guiLocalSettings } from '../../../utils';
import { AutocompleteFieldContentEditMixin } from '../../autocomplete';
import { FKFieldContent } from '../fk';
import FKAutocompleteFieldContentEdit from './FKAutocompleteFieldContentEdit.js';

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
                _renderItem(item, search) {
                    /* jshint unused: false */
                    return (
                        '<div class="autocomplete-suggestion" data-value="' +
                        item.value_field +
                        '" >' +
                        item.view_field +
                        '</div>'
                    );
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
                _filterAutocompleteData(search_input, response) {
                    let props = this.field.options.additionalProperties;
                    let filters = {
                        limit: guiLocalSettings.get('page_size') || 20,
                        [this.field.getAutocompleteFilterName(this.data)]: search_input,
                    };

                    function getDependenceValueAsString(parent_data_object, field_name) {
                        if (!field_name || !parent_data_object.hasOwnProperty(field_name)) {
                            return undefined;
                        }
                        let field_dependence_name_array = [];
                        let filds_data_obj = parent_data_object[field_name];
                        for (let index = 0; index < filds_data_obj.length; index++) {
                            field_dependence_name_array.push(filds_data_obj[index].value);
                        }
                        return field_dependence_name_array.join(',');
                    }

                    let field_dependence_data = getDependenceValueAsString(
                        this.$parent.data,
                        props.field_dependence_name,
                    );
                    let format_data = {
                        fieldType: this.field.options.format,
                        modelName: this.queryset.model.name,
                        fieldName: this.field.options.name,
                    };

                    let all = this.querysets.map((qs) => {
                        let signal_obj = {
                            qs: qs,
                            filters: filters,
                        };
                        if (field_dependence_data !== undefined) {
                            signal_obj.field_dependence_name = props.field_dependence_name;
                            signal_obj.filter_name = props.filter_name;
                            signal_obj[props.field_dependence_name] = field_dependence_data;
                        }
                        window.tabSignal.emit(
                            'filter.{fieldType}.{modelName}.{fieldName}'.format(format_data),
                            signal_obj,
                        );
                        if (!signal_obj.hasOwnProperty('nest_prom')) {
                            return qs.filter(filters).items();
                        } else {
                            return signal_obj.nest_prom;
                        }
                    });

                    Promise.all(all)
                        .then((results) => {
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
                                    matches.push(this.field.getAutocompleteValue(this.data, instance.data));
                                });
                            });

                            response(matches);
                        })
                        .catch((error) => {
                            debugger;
                            console.error(error);
                        });
                },
            },
        },
    },
};

export default FKAutocompleteFieldMixin;
