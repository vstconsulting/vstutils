<template>
    <div>
        <ul v-for="(obj, idx) in value" :key="idx">
            <li v-for="field in fields" :key="field">
                <b>{{ field }}:</b>
                {{ obj[field] }}
            </li>
        </ul>
    </div>
</template>

<script>
    export default {
        name: 'ListView',
        props: {
            value: { type: Array, default: () => [] },
            fields: { type: Array, default: () => [] },
        },
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
