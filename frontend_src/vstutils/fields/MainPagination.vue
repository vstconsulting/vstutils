<template>
    <ul class="pagination pagination-sm no-margin pull-right" v-if="pages_amount > 1">
        <li class="page-item pagination-page" v-for="(item, idx) in items" :key="idx">
            <a class="page-link" :style="styles(item.number)" @click.stop.prevent="goToPage(item.number)">
                {{ item.text }}
            </a>
        </li>
    </ul>
</template>

<script>
    import $ from 'jquery';

    /**
     * Main mixin for pagination components.
     */
    export default {
        props: ['options'],
        computed: {
            pages_amount() {
                let num = this.options.count / this.options.page_size;

                if (num % 1 == 0) {
                    return num;
                }

                return Math.floor(num) + 1;
            },

            current_page() {
                return this.options.page_number;
            },

            items() {
                let arr = [];
                let dots = '...';
                let no_dots_limit = 10;

                for (let number = 1; number <= this.pages_amount; number++) {
                    if (this.pages_amount <= no_dots_limit) {
                        arr.push({ number: number, text: number });
                        continue;
                    }

                    if (this.hideItemOrNot(number)) {
                        if (arr.last && arr.last.text != dots) {
                            arr.push({ number: number, text: dots });
                        }
                        continue;
                    }

                    arr.push({ number: number, text: number });
                }

                return arr;
            },
        },
        methods: {
            goToPage(page_number) {
                this.$router.push({
                    name: this.$route.name,
                    params: this.$route.params,
                    query: $.extend(true, {}, this.$route.query, { page: page_number }),
                });
            },

            styles(number) {
                if (number == this.current_page) {
                    return 'background-color: #d2d6de;';
                }
                return '';
            },

            hideItemOrNot(number) {
                return (
                    Math.abs(number - this.current_page) > 2 && number > 3 && this.pages_amount - number > 3
                );
            },
        },
    };
</script>

<style scoped>
    .pagination {
        margin-bottom: 2px;
        margin-top: 2px;
        float: right;
    }

    .pagination .page-link {
        padding: 6px 8px;
    }

    .pagination a {
        color: #444 !important;
    }

    .pagination a:hover {
        color: #0056b3 !important;
    }
</style>

<style>
    .card-info:not(.card-outline) .card-header .pagination a {
        color: #444 !important;
    }
    .card-info:not(.card-outline) .card-header .pagination a:hover {
        color: #0056b3 !important;
    }
</style>
