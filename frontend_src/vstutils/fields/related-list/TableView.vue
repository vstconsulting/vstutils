<template>
    <table class="table table-sm">
        <thead>
            <tr>
                <th v-for="field in fields" :key="field.name">
                    {{ $t(field.title) }}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, idx) in value" :key="idx">
                <td v-for="field in fields" :key="`${field.name}-${idx}`">
                    <component
                        :is="field.component"
                        :field="field"
                        :data="item"
                        hide-title
                        type="list"
                        style="display: inline"
                    />
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script>
    import { RelatedListInnerComponentMixin } from './RelatedListInnerComponentMixin.js';

    export default {
        name: 'TableView',
        mixins: [RelatedListInnerComponentMixin],
    };
</script>

<style scoped>
    table tr:first-of-type th {
        border-top: none;
    }

    table tr th:first-of-type,
    table tr td:first-of-type {
        border-left: none;
    }

    table tr th:last-of-type,
    td:last-of-type {
        border-right: none;
    }

    table tr:last-of-type td {
        border-bottom: none;
    }
</style>
