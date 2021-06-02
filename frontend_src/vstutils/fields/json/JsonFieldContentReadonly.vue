<template>
    <div class="json-field-readonly">
        <component
            :is="jsonMapper.getComponent(parsedValue)"
            :value="parsedValue"
            :levels="[0]"
            :title="field.description"
        />
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';

    export default {
        mixins: [BaseFieldContentReadonlyMixin],
        inject: ['jsonMapper'],
        computed: {
            parsedValue() {
                return typeof this.value === 'string' ? JSON.parse(this.value) : this.value;
            },
        },
    };
</script>
