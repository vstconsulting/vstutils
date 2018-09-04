


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