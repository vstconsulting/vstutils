<template>
    <nav>
        <ul v-if="pagesAmount > 1" class="pagination">
            <li
                v-for="(item, idx) in items"
                :key="idx"
                class="page-item"
                :class="{ disabled: item.number === pageNumber }"
            >
                <a
                    class="page-link"
                    @click.stop.prevent="$emit('open-page', item.number)"
                    v-text="item.text"
                />
            </li>
        </ul>
    </nav>
</template>

<script>
    export default {
        name: 'Pagination',
        props: {
            count: { type: Number, required: true },
            pageSize: { type: Number, required: true },
            pageNumber: { type: Number, required: true },
        },
        computed: {
            pagesAmount() {
                const amount = Math.ceil(this.count / this.pageSize);
                return Number.isFinite(amount) ? amount : 1;
            },

            items() {
                const arr = [];
                const dots = '...';
                const no_dots_limit = 10;

                for (let number = 1; number <= this.pagesAmount; number++) {
                    if (this.pagesAmount <= no_dots_limit) {
                        arr.push({ number: number, text: number });
                        continue;
                    }

                    if (this.hideItemOrNot(number)) {
                        if (arr.last && arr.last.text !== dots) {
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
            styles(number) {
                if (number === this.pageNumber) {
                    return 'background-color: #d2d6de;';
                }
                return '';
            },

            hideItemOrNot(number) {
                return Math.abs(number - this.pageNumber) > 2 && number > 3 && this.pagesAmount - number > 3;
            },
        },
    };
</script>

<style scoped>
    .page-item {
        cursor: pointer;
    }
</style>
