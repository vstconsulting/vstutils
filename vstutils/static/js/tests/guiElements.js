/**
 * Тестирование guiElements.string
 */
window.qunitTestsArray['guiElements.string'] = {
    test:function()
    {
        syncQUnit.addTest('guiElements.string', function ( assert )
        {
            let done = assert.async();

            $("body").append("<div id='guiElementsTestForm'></div>")
            let element = new guiElements.string();

            $("#guiElementsTestForm").insertTpl(element.render())
            element.getValue()

            $("#guiElementsTestForm").remove();

            assert.ok(true, 'guiElements.string');
            testdone(done)
        });
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