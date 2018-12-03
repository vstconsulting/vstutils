/**
 * Тестирование guiElements.string
 */
window.qunitTestsArray['guiElements.baseTest'] = {
    test:function()
    {
        let guiElementsArray = {
            'string':{
                values:['ABC', 'null', 12, true]
            },
            'password':{},
            'file':{},
            'secretfile':{},
            'boolean':{},
            'textarea':{},
            'text_paragraph':{},
            'hidden':{},
            'null':{},
            'integer':{                 values:[1, 0 ] },
            'date':{                    values:[1941554845000, 0],},
            'date_time':{               values:[1441554840000],},
            'time_interval':{           values:[100]},
            //'autocomplete':{},
            //'hybrid_autocomplete':{},
            //'select2':{},
            'apiObject':{ init:[{definition:guiSchema.path["/user/"]}, {id:1}]},
            'apiData':{                   values:['ABC', 'null', 12, true]},
            //'inner_api_object':{},
            'json':{                      values:[{'ABC':"CDE"}, {'A2':'1'}, {'A3':'false'}], init:[undefined, {'ABCtt':"CDErer"}]},
            'dynamic':{},
            'enum':{},
            //'prefetch':{},
            'html':{}
        };
        for(let i in guiElementsArray)
        {
            guiElementTestFunction(i, guiElementsArray[i])
        }
    }
}

function guiElementTestFunction(elementName, opt){
    syncQUnit.addTest('guiElements.'+elementName, function ( assert )
    {
        let done = assert.async();
        $("body").append("<div id='guiElementsTestForm'></div>")

        if(!opt.init)
        {
            opt.init = []
        }

        let element = new guiElements[elementName](opt.init[0], opt.init[1]);

        $("#guiElementsTestForm").insertTpl(element.render())

        if(opt && opt.values)
        {
            for(let i in opt.values)
            {
                let val = opt.values[i]
                let res = element.insertTestValue(val)
                let value = element.getValue()
                if(res !== value)
                {
                    if(deepEqual(res, value))
                    {
                        assert.ok(true, 'guiElements.'+elementName);
                    }
                    else
                    {
                        debugger;
                        assert.ok(value === res, 'guiElements.'+elementName);
                    }
                }
                else
                {
                    assert.ok(value === res, 'guiElements.'+elementName);
                }

                assert.ok(element.isHidden() == false, 'guiElements.'+elementName+" isHidden");
                element.setHidden(true)
                assert.ok(element.isHidden() == true, 'guiElements.'+elementName+" isHidden true");


                assert.ok(element.getValue() === undefined, 'guiElements.'+elementName+" get value when field hidden");
                element.setHidden(false)
                assert.ok(element.isHidden() == false, 'guiElements.'+elementName+" isHidden false");

                assert.ok(deepEqual(element.getValue(), value), 'guiElements.'+elementName+" value after hidden");

            }
        }
        else
        {
            assert.ok(element.insertTestValue(rundomString(6)) === element.getValue(), 'guiElements.string');
        }

        $("#guiElementsTestForm").remove();
        testdone(done)
    });
}

window.qunitTestsArray['guiElements.uptime'] = {
    test:function()
    {
        syncQUnit.addTest('guiElements.uptime', function ( assert )
        {
            let uptime = new guiElements.uptime()
            assert.ok(uptime.getTimeInUptimeFormat(120) == "00:02:00", 'uptime 120s');
            assert.ok(uptime.getTimeInUptimeFormat(0) == "00:00:00", 'uptime 0s');
        })
    }
}
/**
 * Тестирование guiElements.crontab
 */
window.qunitTestsArray['guiElements.crontab'] = {
    test:function()
    {
        syncQUnit.addTest('guiElements.crontab', function ( assert )
        {
            let done = assert.async();

            let cronString = "1 * * * *"

            $("body").append("<div id='guiElementsTestForm'></div>")
            let element = new guiElements.crontab();

            $("#guiElementsTestForm").insertTpl(element.render())
            element.getValue()

            element.parseCronString(undefined)
            assert.ok(cronString != element.getValue(), 'getValue');

            element.parseCronString("1 5")
            assert.ok(cronString != element.getValue(), 'getValue');

            element.parseCronString(cronString)
            assert.ok(cronString == element.getValue(), 'getValue');

            cronString = "1 1 1 1 1"
            element.parseCronString(cronString)
            assert.ok("1 1 1 1 1" == element.getValue(), 'getValue');

            element.setDaysOfWeek("1-2")
            assert.ok("1 1 1 1 1,2" == element.getValue(), 'getValue');

            element.setMonths("1-2")
            assert.ok("1 1 1 1,2 1,2" == element.getValue(), 'getValue');

            element.setDayOfMonth("1-2")
            assert.ok("1 1 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setHours("1-2")
            assert.ok("1 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1-2")
            assert.ok("1,2 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1,2,7")
            assert.ok("1,2,7 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1,2,*/7")
            assert.ok("*/7,1,2 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1,2,3,4,*/7")
            assert.ok("*/7,1-4 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1,2,3,4,*/7,45-51")
            assert.ok("*/7,1-4,45-48,50,51 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1,2,3,4,*/7,45-51,17-30/2")
            assert.ok("*/7,*/23,*/25,1-4,17,19,27,29,45,47,48,51 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1,2,3,4,*/7,45-51,17-380/2")
            assert.ok("0-4,7,14,17,19,21,23,25,27-29,31,33,35,37,39,41-43,45-51,53,55-57,59 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1,2,3,4,*/7,45-51,170-38/2")
            assert.ok("*/7,*/12,*/16,1-4,6,8,10,18,20,22,26,30,34,38,45-47,50,51 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            element.setMinutes("1,2,3,4,5/5,45-51,170-38/2")
            assert.ok("*/5,*/12,*/16,1-4,6,8,14,18,22,26,28,34,38,46,47,49,51 1,2 1,2 1,2 1,2" == element.getValue(), 'getValue');

            $("#guiElementsTestForm").remove();

            testdone(done)
        });
    }
}

/**
 * Тестирование guiElements.form
 */
window.qunitTestsArray['guiElements.form'] = {
    test:function()
    {
        syncQUnit.addTest('guiElements.form', function ( assert )
        {
            let done = assert.async();

            $("body").append("<div id='guiElementsTestForm'></div>")

            let options = {
                form: {
                    button:{
                        title:'Save',
                        text:'Save',
                        format:'formButton',
                        type: "string",
                        priority: 3,
                        onclick:() => {
                            return false;
                        },
                    },
                    string:{
                        title:'String',
                        type: 'string',
                        default: 'default_value',
                        priority: 2,
                    },
                    enum:{
                        type: 'string',
                        enum: ['choice1', 'choice2'],
                        title: 'Enum field',
                        text: 'Enum field',
                        priority: 1,
                        onclick:() => {
                            return false;
                        }
                    },

                },
            }

            let el_names = ['button', 'string', 'enum'];
            let sorted_el_names = ['enum', 'string', 'button'];

            let element = new guiElements.form(undefined, options);

            let elements_arr = element.getArrayOfRealElementsForSort();

            assert.ok(elements_arr.length == el_names.length)

            for(let i in elements_arr)
            {
                assert.ok(elements_arr[i].name == el_names[i], 'getArrayOfRealElementsForSort');
            }

            elements_arr.sort(element.sortRealElements);

            for(let i in elements_arr)
            {
                assert.ok(elements_arr[i].name == sorted_el_names[i], 'sortRealElements');
            }

            $("#guiElementsTestForm").insertTpl(element.render());

            let form_value = {
                enum: 'choice1',
                string: 'default_value',
                button: undefined,
            }

            if(deepEqual(form_value, element.getValue()))
            {
                assert.ok(true, 'getValue');
            }
            else
            {
                assert.ok(false, 'getValue');
            }

            $("#guiElementsTestForm").remove();

            testdone(done)
        });
    }
}