/**
 * Mixin for Vue templates with card-boxes, that could be collapsed.
 */
const CollapsibleCardMixin = {
    data() {
        return {
            /**
             * Boolean property, that is responsible for showing/hiding of card-box.
             */
            card_collapsed: false,
            /**
             * Boolean property, that is responsible for showing/hiding collapse-button.
             */
            card_collapsed_button: false,
        };
    },
    methods: {
        /**
         * Method, that toggles card_collapsed value.
         */
        toggleCardCollapsed() {
            this.card_collapsed = !this.card_collapsed;
        },
    },
};

export default CollapsibleCardMixin;
