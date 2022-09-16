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
                if (this.value && typeof this.value === 'string') {
                    return JSON.parse(this.value);
                }
                return this.value;
            },
        },
    };
</script>

<style scoped lang="scss">
    .json-field-readonly::v-deep {
        .card {
            margin: 10px 0;
        }
        .card-header {
            height: 30px;
            padding: 7px;
        }
        .card-title {
            font-size: 1rem;
            line-height: 1rem;
        }
        .btn-tool {
            margin: -0.45rem 0 0 0;
        }
        .card-body {
            padding: 10px 0 0 20px;
        }
    }
</style>
