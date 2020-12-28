/**
 * Mixin with common methods of different table_row components.
 */
const TableRowMixin = {
    inject: {
        /**
         * Handler of type function can be provided to do custom action on click.
         * If handler returns true default handler (goToTrLink) will continue its execution
         */
        customRowClickHandler: {
            default: undefined,
        },
    },
    computed: {
        rowLink() {
            if (this.view.pageView) {
                return this.base_url + '/' + this.instance.getPkValue();
            }
        },
    },
    methods: {
        /**
         * Method handles click on table row (`<tr>`),
         * and depending to the place of user's click
         * it redirects user to `<tr>` link or to `<td>` link.
         * @param {object} event Click event.
         * @param {boolean=} blank If true, function opens link in new window.
         */
        goToTrLink(event, blank = false) {
            debugger;
            if (
                typeof this.customRowClickHandler === 'function' &&
                !this.customRowClickHandler({ event, blank, link: this.rowLink })
            ) {
                return;
            }

            if (!this.blockTrLink(event.target, 'tr', 'highlight-tr-none')) {
                let href;
                if (event.target.hasAttribute('href')) {
                    event.preventDefault();
                    return;
                } else if (event.currentTarget) {
                    href = event.currentTarget.getAttribute('data-href');
                } else {
                    href = event.target.getAttribute('data-href');
                }

                if (!href) {
                    return;
                }

                if (blank) {
                    window.open('#' + href);
                } else {
                    this.$router.push(href);
                }
            }
        },
        /**
         * Method makes recursive search through DOM tree
         * and tries to find a search_class in the classList of DOM elements.
         * If function finds this search_class, it returns true.
         * Otherwise, it returns false.
         * @param {object} element DOM tree element.
         * @param {string} stop_element_name Name of DOM tree element
         * on which function stops search.
         * @param {string} search_class Name of CSS class, which function tries to find.
         */
        blockTrLink(element, stop_element_name, search_class) {
            if (!element) {
                return false;
            }

            if (element.classList.contains(search_class)) {
                return true;
            }

            if (element.parentElement && element.parentElement.localName != stop_element_name) {
                return this.blockTrLink(element.parentElement, stop_element_name, search_class);
            }

            return false;
        },
        /**
         * Method, that handles mousedown event.
         * This method opens link in new window.
         * @param {object} event Event object.
         */
        onMouseDownHandler(event) {
            if (event && event.which && event.which == 2) {
                this.goToTrLink(event, true);
            }
        },
    },
};

export default TableRowMixin;
