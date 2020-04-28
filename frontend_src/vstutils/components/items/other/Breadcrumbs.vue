<template>
    <ol class="breadcrumb float-sm-right">
        <li
            v-for="(breadcrumb, idx) in breadcrumbs"
            :key="idx"
            class="breadcrumb-item"
            :class="{ active: !breadcrumb.link }"
        >
            <template v-if="breadcrumb.link">
                <router-link :to="breadcrumb.link">
                    <!-- FIXME index not defined
                    <template v-if="index">
                        {{ $t(breadcrumb.name.toLowerCase()) }}
                    </template>
                    <template v-else>
                        {{ $t(breadcrumb.name.toLowerCase()) | capitalize }}
                    </template> -->
                    <template>
                        {{ $t(breadcrumb.name.toLowerCase()) | capitalize }}
                    </template>
                </router-link>
            </template>
            <template v-else>
                {{ $t(breadcrumb.name.toLowerCase()) }}
            </template>
        </li>
    </ol>
</template>

<script>
    export default {
        name: 'breadcrumbs',
        props: ['breadcrumbs'],
    };
</script>

<style scoped>
    .breadcrumb {
        font-size: 12px;
    }

    breadcrumb > li.active > a {
        color: #777;
    }

    .breadcrumb > li.breadcrumb-item > a {
        color: #444;
        text-decoration: none;
        display: inline-block;
    }

    .breadcrumb > li.breadcrumb-item.active > a {
        color: #777;
    }

    .breadcrumb > li.breadcrumb-item > a {
        color: var(--text-header-color);
    }

    @media (max-width: 991px) {
        .breadcrumb {
            margin-top: 0;
            width: 100%;
            background-color: var(--breadcrumb-bg-color) !important;
            padding: 5px 10px !important;
        }
    }
</style>
