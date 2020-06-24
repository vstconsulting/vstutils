<template>
    <div class="row" :aria-labelledby="label_id" :aria-label="aria_label">
        <template v-for="(item, itemIdx) in field.options.realFields">
            <template v-if="!more_than_one_field(item)">
                <component
                    :is="'field_' + real_field.options.format"
                    v-for="(real_field, idx) in item"
                    :key="`${itemIdx}-${idx}`"
                    :field="real_field"
                    :prop_data="realFieldValue(itemIdx)"
                    :wrapper_opt="{ use_prop_data: true }"
                    @setValueInStore="setValueInStore($event, itemIdx, real_field.options.name)"
                />
            </template>
            <template v-else>
                <div :key="itemIdx" class="col-lg-12 col-xs-12 col-sm-12 col-md-12">
                    <label class="control-label">{{ $t(itemIdx.toLowerCase()) | capitalize }}</label>
                    <div class="row">
                        <component
                            :is="'field_' + real_field.options.format"
                            v-for="(real_field, idx) in item"
                            :key="`${itemIdx}-${idx}`"
                            :field="real_field"
                            :prop_data="realFieldValue(itemIdx)"
                            :wrapper_opt="{ use_prop_data: true }"
                            @setValueInStore="setValueInStore($event, itemIdx, real_field.options.name)"
                        />
                    </div>
                </div>
            </template>
        </template>
    </div>
</template>

<script>
    import $ from 'jquery';
    import { BaseFieldContentEdit } from '../base';
    import InnerAPIObjectFieldContent from './InnerAPIObjectFieldContent.js';

    export default {
        mixins: [BaseFieldContentEdit, InnerAPIObjectFieldContent],
        methods: {
            setValueInStore(value, item, field) {
                let new_value = $.extend(true, {}, this.value);
                if (!new_value[item]) {
                    new_value[item] = {};
                }

                new_value[item][field] = value;
                this.$emit('proxyEvent', 'setValueInStore', new_value);
            },
        },
    };
</script>

<style scoped></style>
