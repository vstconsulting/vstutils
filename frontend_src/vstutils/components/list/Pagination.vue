<template>
    <nav>
        <ul v-if="items && items.length > 1" class="pagination">
            <li
                v-for="(item, idx) in items"
                :key="`${idx}-${item.page}`"
                class="page-item"
                :class="{ disabled: item.disabled }"
            >
                <router-link v-if="!useEmits && item.page" class="page-link" :to="location(item.page)">
                    <span v-if="item.icon"><i :class="item.icon" /></span>
                    {{ item.text }}
                </router-link>
                <a v-else class="page-link" href="#" @click.prevent="clickHandler(item)">
                    <span v-if="item.icon"><i :class="item.icon" /></span>
                    {{ item.text }}
                </a>
            </li>
        </ul>
    </nav>
</template>

<script setup lang="ts">
    import type { RawLocation } from 'vue-router';
    import { useRoute } from 'vue-router/composables';
    import type { PaginationItem } from '#vstutils/store';

    defineProps<{
        useEmits?: boolean;
        items?: {
            page?: number;
            text?: string;
            disabled?: boolean;
            icon?: string | string[];
            onClick?: () => void;
        }[];
    }>();
    const emit = defineEmits<{
        (e: 'open-page', page: number): void;
    }>();

    const route = useRoute();

    function clickHandler(item: PaginationItem) {
        if (item.onClick) {
            item.onClick();
        }
        if (item.page) {
            emit('open-page', item.page);
        }
    }

    function location(page: number): RawLocation {
        return {
            path: route.path,
            query: { ...route.query, page: page.toString() },
        };
    }
</script>

<style scoped>
    .page-item {
        cursor: pointer;
    }
    .item-dots {
        width: 22px;
        padding-left: 2px;
        padding-right: 2px;
    }
    @media (max-width: 600px) {
        .page-link {
            font-size: 0.875rem;
            padding: 0.25rem 0.5rem;
            line-height: 1.5;
        }
    }
</style>
