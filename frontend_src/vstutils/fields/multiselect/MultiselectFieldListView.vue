<template>
    <div :class="classes" :style="styles">
        <template v-if="with_link">
            <router-link :to="href">{{ text }}</router-link>
        </template>
        <template v-else>
            {{ text }}
        </template>
    </div>
</template>

<script>
    import { BaseFieldListView } from '../base';
    import { FKFieldContent } from '../fk/fk';

    export default {
        mixins: [BaseFieldListView, FKFieldContent],
        computed: {
            with_link() {
                return false;
            },
            text() {
                return this.field.toRepresent(this.data);
            },
        },
    };
</script>

<style scoped></style>
