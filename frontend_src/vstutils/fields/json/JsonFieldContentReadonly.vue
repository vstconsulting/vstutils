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
                return JSON.parse(this.value);
            },
        },
    };
</script>

<style scoped></style>
