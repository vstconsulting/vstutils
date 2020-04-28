/**
 * Mixin for vue components, that have modal window and button, that opens it.
 */
const ModalWindowAndButtonMixin = {
    data() {
        return {
            /**
             * Property, that is responsible
             * for modal showing/hiding.
             */
            show_modal: false,
        };
    },
    methods: {
        /**
         * Method, that opens modal window.
         */
        open() {
            this.show_modal = true;

            this.onOpen();
        },
        /**
         * Method, that closes modal window.
         */
        close() {
            this.show_modal = false;

            this.onClose();
        },
        /**
         * Method - callback for 'open' method.
         */
        onOpen() {},
        /**
         * Method - callback for 'close' method.
         */
        onClose() {},
    },
};

export default ModalWindowAndButtonMixin;
