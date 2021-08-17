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
                    :wrapper_opt="{ readOnly: true, use_prop_data: true }"
                />
            </template>
            <template v-else>
                <div :key="itemIdx" class="col-lg-12 col-xs-12 col-sm-12 col-md-12">
                    <label class="control-label">{{ $t(itemIdx.toLowerCase()) | capitalize | split }}</label>
                    <div class="row">
                        <component
                            :is="'field_' + real_field.options.format"
                            v-for="(real_field, idx) in item"
                            :key="`${itemIdx}-${idx}`"
                            :field="real_field"
                            :prop_data="realFieldValue(itemIdx)"
                            :wrapper_opt="{ readOnly: true, use_prop_data: true }"
                        />
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
