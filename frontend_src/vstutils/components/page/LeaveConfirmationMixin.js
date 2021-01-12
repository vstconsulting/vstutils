/**
 * Mixin that asks user for confirmation before leave
 * @vue/component
 */
export const LeaveConfirmationMixin = {
    beforeRouteUpdate(to, from, next) {
        if (this.askForLeaveConfirmation()) {
            this.isPageChanged = false;
            next();
        } else {
            next(false);
        }
    },
    beforeRouteLeave(to, from, next) {
        if (this.askForLeaveConfirmation()) {
            next();
        } else {
            next(false);
        }
    },
    data() {
        return {
            isPageChanged: false,
            leaveConfirmationMessage: 'Changes you made may not be saved.',
        };
    },
    computed: {
        shouldAskForLeaveConfirmation() {
            return this.isPageChanged;
        },
    },
    created() {
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    },
    beforeDestroy() {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    },
    methods: {
        beforeUnloadHandler(event) {
            // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload#example
            if (this.shouldAskForLeaveConfirmation) {
                event.preventDefault();
                event.returnValue = '';
            } else {
                delete event['returnValue'];
            }
        },
        /**
         * Method that asks if user really wants to leave page.
         * Returns true if user is agree or confirmation is not needed.
         * @return {boolean}
         */
        askForLeaveConfirmation() {
            if (this.shouldAskForLeaveConfirmation) {
                return window.confirm(this.leaveConfirmationMessage);
            }
            return true;
        },
    },
};
