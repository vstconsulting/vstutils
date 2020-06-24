/**
 * File with test for signals.
 */

/**
 * Several tests for tabSignal lib.
 */
window.qunitTestsArray["tabSignal"] = {
    test: function() {
        let priorityArray = [];
        let prevSignalPrio = -Infinity;
        let signal_test_func = function(obj, signal_name, SignalNotFromThisTab, slot_name) {
            obj.assert.ok((Number(prevSignalPrio) <= Number(slot_name)), "call signal with prio=" + slot_name);
            prevSignalPrio = Number(slot_name);
        };

        for(let i = 0; i < 5; i++) {
            let priority_val = Math.floor(Math.random() * 101);
            priorityArray.push("" + priority_val);
            window.spa.signals.on({
                signal:"signals.test.function",
                slot:"" + priority_val,
                callback:signal_test_func,
                priority:priority_val,
            });
        }

        priorityArray.push("0");
        window.spa.signals.on({
                signal:"signals.test.function",
                slot:"0",
                callback:signal_test_func,
                priority: 0,
        });

        priorityArray.push("1000001");
        window.spa.signals.on({
                signal:"signals.test.function",
                slot:"1000001",
                callback:signal_test_func,
        });

        priorityArray.push("Infinity");
        window.spa.signals.on({
                signal:"signals.test.function",
                slot:"Infinity",
                callback:signal_test_func,
                priority:Infinity,
        });

        syncQUnit.addTest("tabSignal.ordered", function(assert) {
            let done = assert.async();
            window.spa.signals.emit("signals.test.function", {assert: assert});
            testdone(done);
        });

        syncQUnit.addTest("tabSignal.disconnected", function(assert) {
            let done = assert.async();
            let lastPrioValue = priorityArray.pop();
            prevSignalPrio = -Infinity;

            window.spa.signals.disconnect(String(lastPrioValue), "signals.test.function");
            window.spa.signals.emit("signals.test.function", {assert: assert});
            assert.ok((Number(prevSignalPrio) < Number(lastPrioValue)), "disconect signal with prio=" + lastPrioValue);

            for(let i in priorityArray) {
                window.spa.signals.disconnect(priorityArray[i], "signals.test.function");
            }
            prevSignalPrio = -Infinity;
            window.spa.signals.emit("signals.test.function", {assert: assert});
            assert.ok((prevSignalPrio == -Infinity), "check all signals was disconnect");
            testdone(done);
        });

        syncQUnit.addTest("tabSignal.once", function(assert) {
            let done = assert.async();
            let isCalled = 0;

            window.spa.signals.once("signals.test.once.function", () => {
                assert.ok(!isCalled, 'call once signal');
                isCalled++;
            });
            window.spa.signals.emit("signals.test.once.function");
            window.spa.signals.emit("signals.test.once.function");

            assert.ok(isCalled == 1, 'signal once called only once');

            testdone(done);
        });
    }
};