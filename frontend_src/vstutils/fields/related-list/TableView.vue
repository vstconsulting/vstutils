<template>
    <table class="table table-sm">
        <thead>
            <tr>
                <th v-for="field in fields" :key="field">
                    {{ field }}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(obj, idx) in value" :key="idx">
                <td v-for="field in fields" :key="`${field}-${idx}`">
                    {{ obj[field] }}
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script>
    export default {
        name: 'TableView',
        props: {
            value: { type: Array, default: () => [] },
            fields: { type: Array, default: () => [] },
        },
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
