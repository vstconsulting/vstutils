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
 * Function adds report about tests execution to the page.
 */
function saveReport() {
    $("body").html('<div id="qunit-saveReport"></div><div id="qunit">'+$("#qunit").html()+'</div>');
    $("body").append('<link rel="stylesheet" href="' + hostname + window.guiStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.css">');
    console.log("saveReport()  was called.");
}

/**
 * Array, that stores qUnit tests of application.
 */
window.qunitTestsArray = {};

/**
 * Function adds qUnit to the page and starts tests execution.
 */
function injectQunit() {
    $("body").append('<link rel="stylesheet" href="' + hostname + window.guiStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.css">');
    $("body").append('<script src="' + hostname + window.guiStaticPath + 'js/tests/phantomjs/qunit/qunit-2.2.1.js"></script>');
    $("body").append('<div id="qunit"></div><div id="qunit-fixture"></div>');

    let intervalId = setInterval(function() {
        if(!window.QUnit) {
            return;
        }

        console.log("Start of qUnit tests.");
        clearInterval(intervalId);

        QUnit.done(function( details ) {
            console.log( "Total: "+ details.total+ " Failed: "+ details.failed+ " Passed: "+ details.passed+ " Runtime: "+ details.runtime );
        });

        QUnit.testDone(function(details) {
            let result = {
                "Module name": details.module,
                "Test name": details.name,
                "Assertions": {
                    "Total": details.total,
                    "Passed": details.passed,
                    "Failed": details.failed,
                },
                "Skipped": details.skipped,
                "Runtime": details.runtime,
            };

            if(!syncQUnit.nextTest()) {
                saveReport();
                testdone("ok-done", window.close);
            }
        });

        for(let i in window.qunitTestsArray) {
            window.qunitTestsArray[i].test.call();
        }

        syncQUnit.nextTest();

    }, 1000);
}


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
