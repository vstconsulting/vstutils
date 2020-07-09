import QUnit from 'qunit';

QUnit.config.autostart = false;
QUnit.config.reorder = false;
QUnit.config.hidepassed = true;
QUnit.config.notrycatch = false;

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
     * Proxy method to QUnit.module
     * @param {string} name
     * @param {Object=} hooks
     * @param {function=} nested
     */
    module(name, hooks = undefined, nested = undefined) {
        QUnit.module(name, hooks, nested);
    }

    /**
     * Proxy method to QUnit.test that adds new test so total amount of tests can be counted
     * @param {string} name
     * @param testFunction
     */
    test(name, testFunction) {
        this.amount += 1;
        QUnit.test(name, testFunction);
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
        return this.amount === this.executed_tests.length;
    }

    /**
     * Method, that returns true if all executed tests were passed.
     * @return {boolean}
     */
    allTestsPassed() {
        return this.executed_tests.every((test) => test.passed);
    }

    /**
     * Method, that returns total runtime of executed tests.
     * @return {number} Time in milliseconds.
     */
    getTotalRuntime() {
        return this.executed_tests.reduce((counter, current) => {
            return (counter += current.runtime);
        }, 0);
    }

    /**
     * Method, that returns array with failed tests info objects.
     * @return {array}
     */
    getFailedTests() {
        return this.executed_tests.filter((test) => !test.passed);
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
        return this.executed_tests.reduce(
            (counter, current) => {
                counter.total++;
                counter[current.passed ? 'passed' : 'failed']++;
                return counter;
            },
            { total: 0, passed: 0, failed: 0 },
        );
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
        return this.executed_tests.reduce(
            (counter, current) => {
                ['total', 'passed', 'failed'].forEach((prop) => {
                    counter[prop] += current.assertions[prop];
                });
                return counter;
            },
            { total: 0, passed: 0, failed: 0 },
        );
    }

    /**
     * Method, that returns current tests status. One of the ['WAITING', 'RUNNING', 'EXECUTED].
     * @return {string}
     */
    getTestsStatus() {
        if (this.running) {
            return 'RUNNING';
        }

        if (!this.running && this.executed_tests.length > 0) {
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

        return (
            `Tests status: ${this.getTestsStatus()}. \n\n` +
            `Test execution runtime: ${this.getTotalRuntime() / 1000} seconds. \n\n` +
            `Total tests amount: ${this.amount}. \n\n` +
            'Executed tests info: \n' +
            `  - Total:  ${tests.total}. \n` +
            `  - Passed: ${tests.passed} . \n` +
            `  - Failed: ${tests.failed}. \n\n` +
            'Executed assertions info: \n' +
            `  - Total:  ${assertions.total}. \n` +
            `  - Passed: ${assertions.passed}. \n` +
            `  - Failed: ${assertions.failed}.`
        );
    }

    /**
     * Method, that loads qUnit lib files and runs tests execution.
     */
    runTests() {
        console.log('Tests status: ' + this.getTestsStatus() + '.');

        window.$('body').append('<div id="qunit"></div><div id="qunit-fixture"></div>');

        QUnit.testStart(({ module, name }) => {
            console.log(`Test "${module}::${name}" started`);
        });

        QUnit.testDone(({ module, name, total, passed, failed, skipped, runtime }) => {
            if (failed === 0) {
                console.log(`Test "${module}::${name}" passed`);
            } else {
                console.warn(`Test "${module}::${name}" failed (${passed}/${total})`);
            }

            let result = {
                module_name: module,
                test_name: name,
                assertions: {
                    total: total,
                    passed: passed,
                    failed: failed,
                },
                skipped: skipped,
                runtime: runtime,
                passed: total === passed,
            };

            this.addTestResult(result);

            window.spa.popUp.guiPopUp.warning(
                `Test ${module}::${name} done, ${this.amountOfRemainTests()} tests remain`,
            );
        });

        // eslint-disable-next-line no-unused-vars
        const promise = new Promise((resolve, reject) => {
            QUnit.done((details) => {
                console.log('Tests status: ' + this.getTestsStatus() + '.');
                console.log(this.getReport());
                resolve(details);
            });
        });

        QUnit.start();

        return promise;
    }
}

const runner = new TestsRunner();

export default runner;
