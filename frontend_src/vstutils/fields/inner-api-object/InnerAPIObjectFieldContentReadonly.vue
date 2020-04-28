<template>
    <div class="row" :aria-labelledby="label_id" :aria-label="aria_label">
        <template v-for="(item, itemIdx) in field.options.realFields">
            <template v-if="!more_than_one_field(item)">
                <component
                    v-for="(real_field, idx) in item"
                    :key="`${itemIdx}-${idx}`"
                    :is="'field_' + real_field.options.format"
                    :field="real_field"
                    :prop_data="realFieldValue(itemIdx)"
                    :wrapper_opt="{ readOnly: true, use_prop_data: true }"
                ></component>
            </template>
            <template v-else>
                <div class="col-lg-12 col-xs-12 col-sm-12 col-md-12" :key="itemIdx">
                    <label class="control-label">{{ $t(itemIdx.toLowerCase()) | capitalize | split }}</label>
                    <div class="row">
                        <component
                            v-for="(real_field, idx) in item"
                            :key="`${itemIdx}-${idx}`"
                            :is="'field_' + real_field.options.format"
                            :field="real_field"
                            :prop_data="realFieldValue(itemIdx)"
                            :wrapper_opt="{ readOnly: true, use_prop_data: true }"
                        ></component>
                    </div>
                </div>
            </template>
        </template>
    </div>
</template>

<script>
    import InnerAPIObjectFieldContent from './InnerAPIObjectFieldContent.js';
    import { BaseFieldContentReadonlyMixin } from '../base';
    export default {
        mixins: [BaseFieldContentReadonlyMixin, InnerAPIObjectFieldContent],
    };
</script>

<style scoped></style>
