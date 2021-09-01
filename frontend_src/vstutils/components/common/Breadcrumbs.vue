<template>
    <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
            <li
                v-for="(item, idx) in items"
                :key="idx"
                class="breadcrumb-item"
                :class="{ active: !item.link }"
            >
                <template v-if="item.link">
                    <router-link :to="item.link">
                        <i v-if="item.iconClasses" :class="item.iconClasses" />
                        <span v-if="item.name">{{ $t(item.name) }}</span>
                    </router-link>
                </template>
                <template v-else>
                    <i v-if="item.iconClasses" :class="item.iconClasses" />
                    <span v-if="item.name">{{ $t(item.name) }}</span>
                </template>
            </li>
        </ol>
    </nav>
</template>

<script>
    /**
     * One breadcrumb item
     * @typedef {Object} BreadcrumbItem
     * @property {string} [name]
     * @property {string|string[]} [iconClasses]
     * @property {string|Object} [link]
     */

    /**
     * Component that renders list of breadcrumbs
     */
    export default {
        name: 'Breadcrumbs',
        props: {
            items: { type: Array, required: true },
        },
    };
</script>

<style scoped>
    nav {
        overflow: auto;
    }
    .breadcrumb {
        display: flex;
        flex-wrap: nowrap;
        font-size: 0.9rem;
        background-color: transparent;
        margin: 0;
        padding: 0;
    }
    .breadcrumb-item {
        white-space: nowrap;
        flex-shrink: 0;
    }
    .breadcrumb-item,
    .breadcrumb-item a {
        text-decoration: none;
    }
</style>
