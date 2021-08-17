<template>
    <i :class="classes" :style="styles" />
</template>

<script>
    import { BaseFieldListView } from '../base';

    export default {
        mixins: [BaseFieldListView],
        computed: {
            classes() {
                if (this.value) {
                    return 'boolean-true fa fa-check';
                }

                return 'boolean-false fa fa-times';
            },
        },
    };
</script>
