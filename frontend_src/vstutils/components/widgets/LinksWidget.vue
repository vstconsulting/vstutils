<template>
    <ul class="list-group list-group-flush">
        <li v-for="(item, idx) in items" :key="idx" class="list-group-item" @click.self="clickHandler">
            <a :href="item.href">
                <i v-if="item.iconClasses" :class="item.iconClasses" />
                {{ item.text }}
            </a>
        </li>
    </ul>
</template>

<script>
    export default {
        name: 'LinksWidget',
        props: {
            items: { type: Array, required: true },
        },
        methods: {
            clickHandler(event) {
                event.target.firstElementChild.click();
            },
        },
    };
</script>

<style scoped>
    li {
        cursor: pointer;
    }
    li::after {
        content: '\f105';
        font-family: 'Font Awesome 5 Free';
        font-weight: 900;
        font-style: normal;
        margin: 0px 0px 0px 10px;
        text-decoration: none;
        position: absolute;
        right: 7px;
        color: #333;
        transition: right 250ms ease-out;
    }
    li:hover::after {
        right: 0;
    }
    li a {
        color: var(--text-color);
    }
</style>
