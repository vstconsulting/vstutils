/**
 * File, that will be added to the application page before tests start.
 */

//////////////////////////////////////////////////////////////////////////////////////////
// Functions, used during test process.
//////////////////////////////////////////////////////////////////////////////////////////
/**
 * Function, that finishes test execution.
 * @param name
 * @param callback
 * @return {Promise<any>}
 */
function testdone(name, callback) {
    if(callback === undefined) {
        callback =  name;
        name = "render";
    }

    let time = 50;
    let promise_callbacks = {
        resolve: undefined,
        reject: undefined,
    };

    let promise = new Promise((resolve, reject) => {
        promise_callbacks.resolve = resolve;
        promise_callbacks.reject = reject;
    });

    setTimeout((name) => {
        setTimeout(() => {

            if(callback) {
                callback(name);
            }

            promise_callbacks.resolve();
        }, time)
    }, time, name, 0);

    return promise;
}

/**
 * Array, that stores qUnit tests of application.
 */
window.qunitTestsArray = {};

/**
 * Class that stores data connected with test execution status.
 */
class TestsRunner {
    /**
     * Constructor of 'TestsRunner' class.
     */
    constructor() {
        /**
         * Total amount of tests, that should be executed.
         * @type {number}
         */
        this.amount = 0;
        /**
         * Array, that stores objects with info about test execution.
         * One test - one object.
         * @type {Array}
         */
        this.executed_tests = [];
        /**
         * Property, that means, that are tests running right now or not.
         * @type {boolean}
         */
        this.running = false;
    }

    /**
     * Method, that saves total amount of tests, that should be executed.
     * @param {number} amount.
     */
    setAmount(amount) {
        this.amount = amount;
    }

    /**
     * Method, that saves test execution info.
     * @param {object} result Object with info about test execution.
     */
    addTestResult(result) {
        this.executed_tests.push(result);
    }

    /**
     * Method, that sets running value.
     * @param {boolean} value.
     */
    setRunning(value) {
        this.running = value;
    }

    /**
     * Method, that returns number of running test.
     * @return {number}
     */
    numberOfRunningTest() {
        return this.executed_tests.length;
    }

    /**
     * Method, that returns amount of remain tests.
     * @return {number}
     */
    amountOfRemainTests() {
        return this.amount - this.executed_tests.length;
    }

    /**
     * Method, that returns true if all tests were executed.
     * @return {boolean}
     */
    allTestsRun() {
        return this.amount == this.executed_tests.length;
    }

    /**
     * Method, that returns true if all executed tests were passed.
     * @return {boolean}
     */
    allTestsPassed() {
        return !this.executed_tests.some(test => test.passed == false);
    }

    /**
     * Method, that returns total runtime of executed tests.
     * @return {number} Time in milliseconds.
     */
    getTotalRuntime() {
        return this.executed_tests.reduce((counter, current) => {
            return counter += current.runtime;
        }, 0);
    }

    /**
     * Method, that returns array with failed tests info objects.
     * @return {array}
     */
    getFailedTests() {
        return this.executed_tests.filter(test => !test.passed);
    }

    /**
     * Method, that returns object with amount info about executed tests.
     * returns following object {
     *   total: {number},
     *   passed: {number},
     *   failed: {number},
     * }.
     */
    getTestsAmountInfo() {
        return this.executed_tests.reduce((counter, current) => {
            counter.total ++;
            counter[current.passed ? 'passed' : 'failed'] ++;
            return counter;
        }, {total: 0, passed: 0, failed: 0});
    }

    /**
     * Method, that returns object with amount info about assertions made during executed tests.
     * returns following object {
     *   total: {number},
     *   passed: {number},
     *   failed: {number},
     * }.
     */
    getAssertionsAmountInfo() {
        return this.executed_tests.reduce((counter, current) => {
            ['total', 'passed', 'failed'].forEach(prop => {counter[prop] += current.assertions[prop]});
            return counter;
        }, {total: 0, passed: 0, failed: 0});
    }

    /**
     * Method, that returns current tests status. One of the ['WAITING', 'RUNNING', 'EXECUTED].
     * @return {string}
     */
    getTestsStatus() {
        if(this.running) {
            return 'RUNNING';
        }

        if(!this.running && this.executed_tests.length > 0) {
            return 'EXECUTED';
        }

        return 'WAITING';
    }

    /**
     * Method, that return reports about tests execution.
     * @return {string}
     */
    getReport() {
        let tests = this.getTestsAmountInfo();
        let assertions = this.getAssertionsAmountInfo();

        return 'Tests status: ' + this.getTestsStatus() + '. \n \n' +
            'Test execution runtime: ' + this.getTotalRuntime() / 1000 + ' seconds. \n \n' +
            'Total tests amount: ' + this.amount + '. \n \n' +
            'Executed tests info: \n' +
            '  - Total:  '  + tests.total + '. \n' +
            '  - Passed: '  + tests.passed + '. \n' +
            '  - Failed: '  + tests.failed + '. \n \n' +
            'Executed assertions info: \n' +
            '  - Total:  '  + assertions.total + '. \n' +
            '  - Passed: '  + assertions.passed + '. \n' +
            '  - Failed: '  + assertions.failed + '.';
    }

    /**
     * Method, that loads qUnit lib files and runs tests execution.
     */
    runTests() {
        console.log('Tests status: ' + this.getTestsStatus() + '.');

        $("body").append('<link rel="stylesheet" href="' + app.api.getHostUrl() + app.api.getStaticPath() + 'js/tests/phantomjs/qunit/qunit-2.2.1.css">');
        $("body").append('<script src="' + app.api.getHostUrl() + app.api.getStaticPath() + 'js/tests/phantomjs/qunit/qunit-2.2.1.js"></script>');
        $("body").append('<div id="qunit"></div><div id="qunit-fixture"></div>');

        let intervalId = setInterval(() => {
            if(!window.QUnit) {
                return;
            }

            console.log("Start of qUnit tests.");
            clearInterval(intervalId);

            QUnit.done(details => {
                this.setRunning(false);
                console.log(this.getReport());
            });

            QUnit.testDone(details => {
                let result = {
                    module_name: details.module,
                    test_name: details.name,
                    assertions: {
                        total: details.total,
                        passed: details.passed,
                        failed: details.failed,
                    },
                    skipped: details.skipped,
                    runtime: details.runtime,
                    passed: details.total == details.passed,
                };

                this.addTestResult(result);

                if(!syncQUnit.nextTest()) {
                    this.showReport();
                    testdone("ok-done", window.close);
                }
            });

            for(let i in window.qunitTestsArray) {
                window.qunitTestsArray[i].test.call();
            }

            this.setAmount(syncQUnit.testsArray.length);

            this.setRunning(true);

            syncQUnit.nextTest();

            console.log('Tests status: ' + this.getTestsStatus()+ '.');

        }, 1000);
    }

    /**
     * Method, that adds report about tests execution to the page.
     */
    showReport() {
        $("body").html('<div id="qunit-saveReport"></div><div id="qunit">'+$("#qunit").html()+'</div>');
        $("body").append('<link rel="stylesheet" href="' + app.api.getHostUrl() + app.api.getStaticPath() + 'js/tests/phantomjs/qunit/qunit-2.2.1.css">');
        document.getElementById("qunit-urlconfig-hidepassed").onclick = function() {
            let elements = Array.from(document.getElementById('qunit-tests').getElementsByClassName('pass'));
            elements.forEach(el => {el.hidden = this.checked});
        }
    }
}

var _guiTestsRunner = new TestsRunner();


//////////////////////////////////////////////////////////////////////////////////////////
// qUnit wrapper - makes consistent tests execution possible.
//////////////////////////////////////////////////////////////////////////////////////////
syncQUnit = {};
syncQUnit.testsArray = [];
syncQUnit.addTest = function(name, test) {
    syncQUnit.testsArray.push({name:name, test:test})
};

syncQUnit.nextTest = function() {
    if(!syncQUnit.testsArray.length) {
        return false;
    }


    let test = syncQUnit.testsArray.shift();

    guiPopUp.warning("Test " + test.name + ", " + syncQUnit.testsArray.length + " tests remain");

    QUnit.test(test.name, test.test);

    return true;
};

//////////////////////////////////////////////////////////////////////////////////////////
// Tests block
//////////////////////////////////////////////////////////////////////////////////////////
/**
 * Test example - test of trim function.
 */
window.qunitTestsArray['trim'] = {
    test: function() {
        syncQUnit.addTest('trim', function(assert) {
            let done = assert.async();
            assert.equal(trim(''), '', 'Empty string');
            assert.ok(trim('   ') === '', 'String with spaces symbols');
            assert.equal(trim(), '', 'No argument was passed');

            assert.equal(trim(' x'), 'x', 'Spaces at the beginning of string');
            assert.equal(trim('x '), 'x', 'Spaces at the end of string');
            assert.equal(trim(' x '), 'x', 'Spaces at the beginning and at the end of string');
            assert.equal(trim('    x  '), 'x', 'Tabs');
            assert.equal(trim('    x   y  '), 'x   y', 'Tabs and strings inside string');

            testdone(done);
        });
    }
};
