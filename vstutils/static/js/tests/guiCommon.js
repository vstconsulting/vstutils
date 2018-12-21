
window.qunitTestsArray['stringToBoolean'] = {
    test:function()
    {
        syncQUnit.addTest("stringToBoolean", function ( assert )
        {
            let done = assert.async();

            assert.ok( stringToBoolean("true"), 'stringToBoolean');
            assert.ok( stringToBoolean("True"), 'stringToBoolean');
            assert.ok( stringToBoolean("TRUE"), 'stringToBoolean');
            assert.ok( stringToBoolean("yes"), 'stringToBoolean');
            assert.ok( stringToBoolean("Yes"), 'stringToBoolean');
            assert.ok( stringToBoolean("YES"), 'stringToBoolean');
            assert.ok( stringToBoolean("1"), 'stringToBoolean');

            assert.ok( stringToBoolean("false") == false, 'stringToBoolean');
            assert.ok( stringToBoolean("False") == false, 'stringToBoolean');
            assert.ok( stringToBoolean("FALSE") == false, 'stringToBoolean');
            assert.ok( stringToBoolean("no") == false, 'stringToBoolean');
            assert.ok( stringToBoolean("No") == false, 'stringToBoolean');
            assert.ok( stringToBoolean("NO") == false, 'stringToBoolean');
            assert.ok( stringToBoolean("0") == false, 'stringToBoolean');
            assert.ok( stringToBoolean(null) == false, 'stringToBoolean');

            testdone(done)
        });
    }
}

window.qunitTestsArray['spajs.errorPage'] = {
    test:function()
    {
        syncQUnit.addTest("spajs.errorPage", function ( assert )
        {
            let done = assert.async();
            let html = spajs.errorPage(".nontexists")
            assert.ok( html.indexOf("Unknown error") != -1, 'spajs.errorPage');


            html = spajs.errorPage(".nontexists", undefined, undefined, {status:9999888, responseJSON:{detail:77776666}})
            assert.ok( html.indexOf("9999888") != -1, 'spajs.errorPage.status');
            assert.ok( html.indexOf("77776666") != -1, 'spajs.errorPage.detail');


            testdone(done)
        });
    }
}

window.qunitTestsArray['webGui.showErrors'] = {
    test:function()
    {
        syncQUnit.addTest("webGui.showErrors", function ( assert )
        {
            let done = assert.async();
            let res = webGui.showErrors("ABC")
            assert.ok(res, 'spajs.showErrors 1');

            res = webGui.showErrors({error:"error", message:"error message"})
            if(!res) debugger;
            assert.ok(res, 'spajs.showErrors 2');

            res = webGui.showErrors([{error:"error", message:"error message"}])
            if(!res) debugger;
            assert.ok(res, 'spajs.showErrors 3');

            res = webGui.showErrors([{a:{error:"error", message:"error message"}}])
            if(!res) debugger;
            assert.ok(res, 'spajs.showErrors 4');

            res = webGui.showErrors([{detail:"error detail"}])
            if(!res) debugger;
            assert.ok(res, 'spajs.showErrors 5');

            res = webGui.showErrors({arr:{detail:"error detail"}})
            if(!res) debugger;
            assert.ok(res, 'spajs.showErrors 6');

            testdone(done)
        });
    }
}

window.qunitTestsArray['guiLocalSettings'] = {
    test:function()
    {
        syncQUnit.addTest("guiLocalSettings", function ( assert )
        {
            let done = assert.async();

            let test_settings = {
                test_1: true,
                test_2: 'string',
                test_3: 1,
                test_4: {
                    prop_1: 1,
                    prop_2: false,
                    prop_3: 'str',
                    prop_4: ['sdf', 'fdgs', true, 12, {abc:'123'}],
                }
            };

            let test_tmp_settings_existing = {
                test_1: false,
                test_2: '',
                test_3: 0,
            };

            let test_tmp_settings_unexisting = {
                test_8: true,
                test_9: 'qwerty',
            }

            // checks setting and getting of value to guiLocalSettings
            for(let key in test_settings)
            {
                guiLocalSettings.set(key, test_settings[key]);
                assert.ok(deepEqual(guiLocalSettings.get(key), test_settings[key]), 'guiLocalSettings.set & guiLocalSettings.get');
            }

            // checks setting as tmp values of existing before settings
            for(let key in test_tmp_settings_existing)
            {
                guiLocalSettings.setAsTmp(key, test_tmp_settings_existing[key]);
                assert.ok(deepEqual(guiLocalSettings.get(key), test_tmp_settings_existing[key]), 'guiLocalSettings.setAsTmp (existing settings) & guiLocalSettings.get');
            }

            // checks setting as tmp values of unexisting before settings
            for(let key in test_tmp_settings_unexisting)
            {
                guiLocalSettings.setAsTmp(key, test_tmp_settings_unexisting[key]);
                assert.ok(deepEqual(guiLocalSettings.get(key), test_tmp_settings_unexisting[key]), 'guiLocalSettings.setAsTmp (unexisting settings) & guiLocalSettings.get');
            }

            guiLocalSettings.set('test_1',test_settings['test_1']);

            // checks that after guiLocalSettings.set() call non tmp values of settings were saved to local storage
            for(let key in test_settings)
            {
                assert.ok(deepEqual(guiLocalSettings.get(key), test_settings[key]), 'existing tmp settings were not added to LocalStorage after guiLocalSettings.set');
            }

            // checks that after guiLocalSettings.set() call tmp values of unexisting before settings were not saved to local storage
            for(let key in test_tmp_settings_unexisting)
            {
                assert.ok(guiLocalSettings.get(key) === undefined, 'tmp unexisting wetting were not added to LocalStorage after guiLocalSettings.set');
            }

            // checks guiLocalSettings.delete
            for(let key in test_settings)
            {
                guiLocalSettings.delete(key);
                assert.ok(guiLocalSettings.get(key) === undefined, 'delete settings');
            }

            for(let key in test_tmp_settings_unexisting)
            {
                delete guiLocalSettings.__tmpSettings[key];
            }

            // checks guiLocalSettings.setIfNotExists for a new key
            guiLocalSettings.setIfNotExists('q1w2e3r4t5y6', true);
            assert.ok(guiLocalSettings.get('q1w2e3r4t5y6') === true, 'setIfNotExists - unexisting key');

            // checks guiLocalSettings.setIfNotExists for existing key
            guiLocalSettings.setIfNotExists('q1w2e3r4t5y6', false);
            assert.ok(guiLocalSettings.get('q1w2e3r4t5y6') === true, 'setIfNotExists - existing key');

            guiLocalSettings.delete('q1w2e3r4t5y6');

            testdone(done)
        });
    }
}

window.qunitTestsArray['capitalizeString'] = {
    test:function()
    {
        syncQUnit.addTest("capitalizeString", function ( assert )
        {
            let done = assert.async();

            let strings = ['hello', 'Hello', 'HELLO', 'hELLO'];

            let answer = 'Hello';

            assert.ok(capitalizeString() == "", 'empty call of capitalizeString');

            strings.forEach(function(item){assert.ok(capitalizeString(item) == answer, 'capitalizeString()')})

            testdone(done)
        });
    }
}

window.qunitTestsArray['sliceLongString'] = {
    test:function()
    {
        syncQUnit.addTest("sliceLongString", function ( assert )
        {
            let done = assert.async();

            let short_string = 'string';
            let long_string = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
            let arguments = [false, short_string, long_string];
            let answer = ['false','string', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore ...'];

            for(let i in arguments)
            {
                assert.ok(sliceLongString(arguments[i]) == answer[i], 'sliceLongString');
            }

            assert.ok(sliceLongString(short_string, 6) == short_string);
            assert.ok(sliceLongString(short_string, 5) == 'strin...');

            testdone(done)
        });
    }
}

window.qunitTestsArray['isEmptyObject'] = {
    test:function()
    {
        syncQUnit.addTest("isEmptyObject", function ( assert )
        {
            let done = assert.async();

            let obj = {
                a: 1,
                b: true,
                c: ['string', 2],
            }

            assert.ok(isEmptyObject({}) == true);
            assert.ok(isEmptyObject(obj) == false);

            for(let i in obj)
            {
                delete obj[i];
            }

            assert.ok(isEmptyObject(obj) == true);

            testdone(done)
        });
    }
}

window.qunitTestsArray['addCssClassesToElement'] = {
    test:function()
    {
        syncQUnit.addTest("addCssClassesToElement", function ( assert )
        {
            let done = assert.async();

            assert.ok(addCssClassesToElement('td'), 'td');
            assert.ok(addCssClassesToElement('td', 'user'), 'td_user');
            assert.ok(addCssClassesToElement('td', 'user', 'username'), 'td_user_username');

            testdone(done)
        });
    }
}

window.qunitTestsArray['groupButtonsOrNot'] = {
    test:function()
    {
        syncQUnit.addTest("groupButtonsOrNot", function ( assert )
        {
            let done = assert.async();

            let window_width = [480, 992, 1200, 1620];

            let buttons_number = [[{}], '3', 6, 9];

            let answer = [
                [false, true, true, true],
                [false, false, true, true],
                [false, false, false, true],
                [false, false, false, false],
            ];

            for(let i in window_width)
            {
                let width = window_width[i];
                for(let j in buttons_number)
                {
                    let button = buttons_number[j];
                    assert.ok(groupButtonsOrNot(width, button) == answer[i][j]);
                }
            }

            let button_obj = {
                button1: {hidden: true},
                button2: {},
            }

            let button_obj_1 = {
                button1: {},
                button2: {},
            }

            assert.ok(groupButtonsOrNot(480, button_obj) == false);
            assert.ok(groupButtonsOrNot(480, button_obj_1) == true);

            testdone(done)
        });
    }
}

window.qunitTestsArray['allPropertiesIsObjects'] = {
    test:function()
    {
        syncQUnit.addTest("allPropertiesIsObjects", function ( assert )
        {
            let done = assert.async();

            let obj = {
                a: 'string',
                b: [1,2],
                c: {},
            };

            assert.ok(allPropertiesIsObjects(obj) == false, 'allPropertiesIsObjects');

            obj['a'] = {d:5};
            assert.ok(allPropertiesIsObjects(obj) == false, 'allPropertiesIsObjects');

            obj['b'] = {};
            assert.ok(allPropertiesIsObjects(obj) == true, 'allPropertiesIsObjects');

            assert.ok(allPropertiesIsObjects({}) == true, 'allPropertiesIsObjects');

            testdone(done)
        });
    }
}

window.qunitTestsArray['hexToRgbA'] = {
    test:function()
    {
        syncQUnit.addTest("hexToRgbA", function ( assert )
        {
            let done = assert.async();

            let test_values = [
                {hex:"ffffff", alpha:undefined, rgba: undefined },
                {hex:"#ffffff", alpha:undefined, rgba: "rgba(255,255,255,1)" },
                {hex:"#ffffff", alpha:0.8, rgba: "rgba(255,255,255,0.8)" },
                {hex:"#fDac03", alpha:-1, rgba: "rgba(253,172,3,1)" },
                {hex:"#fDac03", alpha:2, rgba: "rgba(253,172,3,1)" },
            ]

            test_values.forEach((obj) => {
                assert.ok(hexToRgbA(obj.hex, obj.alpha) == obj.rgba, 'hexToRgbA()');
            })

            testdone(done);
        });
    }
}