<template>
    <div style="display: contents">
        <FieldLabel :value="value" :field="field" :data="data" />
        <div class="row">
            <template v-for="realField in realFields">
                <component
                    :is="realField.component"
                    :key="realField.name"
                    :field="realField"
                    :data="data"
                    :type="type"
                    @set-value="$emit('set-value', $event)"
                />
            </template>
        </div>
    </div>
</template>

<script>
    import { addCssClassesToElement } from '../../utils';
    import { BaseFieldMixin } from '../base';

    export default {
        mixins: [BaseFieldMixin],
        data() {
            return {
                wrapper_classes_list: {
                    base:
                        'form-group ' +
                        addCssClassesToElement(
                            'guiField',
                            this.field.name,
                            this.field.format || this.field.type,
                        ),
                    grid: 'col-lg-12 col-xs-12 col-sm-12 col-md-12',
                },
            };
        },
        computed: {
            /**
             * Property, that stores form's guiField objects.
             */
            realFields() {
                return this.field.generateRealFields();
            },
        },
    };
</script>
