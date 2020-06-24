class TabSignal {
    /**
     * Callback for signal
     *
     * @callback signalCallback
     * @param {object} data
     * @param {string} signal_name
     * @param {boolean} signalNotFromThisTab
     * @param {string} slot_name
     */

    /**
     * Constructor for TabSignal class
     *
     * @param {string} instanceId - Instances with the same id can exchange signals between different tabs
     */
    constructor(instanceId) {
        this.localStorageKey = `TabSignal_storage_emit_${instanceId}`;
        this.slotArray = [];
        this.sigId = 1000000;
        this.debug = false;

        window.addEventListener(
            'storage',
            (e) => {
                if (e.key && e.key === this.localStorageKey) {
                    try {
                        let data = JSON.parse(e.newValue);
                        if (data !== undefined && data.name !== undefined) {
                            if (this.debug) console.log(data);
                            this.emit(data.name, data.param, true);
                        }
                    } catch (failed) {
                        console.log(failed);
                    }
                }
            },
            false,
        );
    }

    /**
     * Subscribe to signal
     *
     * @param signal_name {string} - Name of the signal to subscribe.
     * @param slot_function {signalCallback} - Function called on every signal emit.
     * @param priority {number=} - Subscriber's priority.
     * @returns {string} Slot name.
     * @deprecated Use signals.on instead
     */
    connect(signal_name, slot_function, priority = undefined) {
        return this.on({
            signal: signal_name,
            slot: 'sig' + this.sigId++,
            callback: slot_function,
            priority: priority,
        });
    }

    /**
     * Method to subscribe callback to signal
     *
     * @example
     * signals.on({
     *      signal:'event-name',
     *      slot:'slot-ABC',
     *      function: (data, signalName) => { alert('ABC'); },
     *      priority:1,
     *      once: true
     * })
     *
     * @param {Object} callobj
     * @param {string} callobj.slot - Slot to subscribe.
     * @param {number} callobj.priority - Subscriber's priority.
     * @param {string} callobj.signal - Signal to subscribe.
     * @param {signalCallback} callobj.callback - Function called on every signal emit.
     * @param {boolean=false} callobj.once - If true callback will be called only once.
     * @returns {string} Slot name.
     */
    on({ slot, priority, signal, callback, once = false }) {
        if (!slot) {
            slot = 'sig' + this.sigId++;
        }

        if (priority === undefined) {
            priority = this.sigId;
        }

        if (this.slotArray[signal] === undefined) {
            this.slotArray[signal] = [];
        }

        this.slotArray[signal].push({
            function: callback,
            slot: slot,
            priority: priority,
            once: once,
        });

        if (this.slotArray[signal].length) {
            this.slotArray[signal].sort((a, b) => {
                let diff = a.priority - b.priority;

                return Number.isNaN(diff) ? 0 : diff;
            });
        }

        return slot;
    }

    /**
     * Subscribe to signal and call callback only once, same as
     *
     * @param {string} signal_name - Signal to subscribe.
     * @param {signalCallback} slot_function - Function called on signal emit.
     * @returns {string} Slot name.
     */
    once(signal_name, slot_function) {
        return this.on({
            signal: signal_name,
            slot: 'sig' + this.sigId++,
            callback: slot_function,
            priority: this.sigId++,
            once: true,
        });
    }

    /**
     * Unsubscribe slot from signal
     *
     * @param {string} slot_name - Name of slot.
     * @param {string} signal_name - Name of signal.
     * @returns {boolean} true if successfully unsubscribed, else false
     */
    disconnect(slot_name, signal_name) {
        const subscribers = this.slotArray[signal_name] || [];

        for (let [idx, val] of subscribers.entries()) {
            if (val.slot === slot_name) {
                this.slotArray[signal_name].splice(idx, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Calls subscribed on signal callbacks
     *
     * @param {string} signalName - Signal name.
     * @param {Object} param - Data to be passed to callback as first argument.
     * @param {boolean=false} signalNotFromThisTab - True value means that signal come from another tab.
     * @param {boolean=false} fail - Fail if one of subscribers will throw an error.
     */
    emit(signalName, param, signalNotFromThisTab = false, fail = false) {
        if (this.slotArray[signalName] === undefined) {
            if (this.debug) console.log(`На сигнал ${signalName} нет подписчиков`);
        } else {
            if (this.debug) console.log(`Сигнал ${signalName} подписаны слоты`);
            const subscribers = this.slotArray[signalName].slice();
            let onceIds = [];

            signalNotFromThisTab = signalNotFromThisTab === true;

            for (let [idx, subscriber] of subscribers.entries()) {
                if (subscriber === undefined) continue;

                if (subscriber.once) onceIds.push(idx);

                if (this.debug || fail) {
                    subscriber.function(param, signalName, signalNotFromThisTab, subscriber.slot);
                } else {
                    try {
                        subscriber.function(param, signalName, signalNotFromThisTab, subscriber.slot);
                    } catch (exception) {
                        console.warn('Error in emit signal ' + signalName, exception);
                    }
                }
            }

            for (let idx of onceIds) {
                this.slotArray[signalName].splice(onceIds[idx], 1);
            }
        }
    }

    generateRandomId() {
        return (
            Math.random() +
            '_' +
            Math.random() +
            '_' +
            Math.random() +
            '_' +
            Math.random() +
            '_' +
            Math.random()
        );
    }

    /**
     * Emit signal to all tabs using local storage
     *
     * @param signalName {string}
     * @param data {Object}
     * @return {boolean}
     */
    emitAll(signalName, data) {
        this.emit(signalName, data);

        try {
            if (window['localStorage'] !== undefined) {
                let current_custom_id = this.generateRandomId();

                window['localStorage'][this.localStorageKey] = JSON.stringify({
                    name: signalName,
                    custom_id: current_custom_id,
                    param: data,
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    }
}

const signals = new TabSignal('root');

export { TabSignal, signals };
