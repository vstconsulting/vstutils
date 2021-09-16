<template>
    <div>
        <ul v-for="(item, idx) in value" :key="idx">
            <li v-for="field in fields" :key="`${field.name}-${idx}`">
                <b>{{ field.title }}:</b>
                <component
                    :is="field.component"
                    :field="field"
                    :data="item"
                    hide-title
                    type="list"
                    style="display: inline"
                />
            </li>
        </ul>
    </div>
</template>

<script>
    import { RelatedListInnerComponentMixin } from './RelatedListInnerComponentMixin.js';

    export default {
        name: 'ListView',
        mixins: [RelatedListInnerComponentMixin],
    };
</script>

<style scoped>
    ul {
        margin: 0;
        padding: 5px 0;
        border-bottom: 1px rgba(0, 0, 0, 0.2) solid;
        text-align: left;
        list-style: none;
    }

    ul:first-of-type {
        padding-top: 0;
    }

    ul:last-of-type {
        padding-bottom: 0;
        border-bottom: none;
    }
</style>
