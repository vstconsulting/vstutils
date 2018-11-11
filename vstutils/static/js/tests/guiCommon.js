
window.qunitTestsArray['stringToBoolean'] = {
    test:function()
    {
        syncQUnit.addTest("spajs.errorPage", function ( assert )
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
        syncQUnit.addTest("spajs.showErrors", function ( assert )
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

