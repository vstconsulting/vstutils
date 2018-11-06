
window.qunitTestsArray['common'] = {
    test:function()
    {
        // openHelpModal

        // searchObjectsInListByJs
        // checkDataValidityForSearchQuery

        //  isCordova()
        // мультиэкшены

        // pmLicense
        // teams acl_member_callback
        // guiElements
    }
}

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


window.qunitTestsArray['guiPaths.profile'] = {
    test:function()
    {
        let path = "profile"
        guiTests.openPage(path)
        guiTests.hasElement(1, ".btn_save", path)
        guiTests.hasAddButton(0, path)

        syncQUnit.addTest("open profile for user window.my_user_id", function ( assert )
        {
            let done = assert.async();
            assert.ok( window.curentPageObject.model.guiFields.id.getValue() == window.my_user_id, 'open profile for user window.my_user_id');
            testdone(done)
        });

        guiTests.clickAndWaitRedirect(".sublink-btn-copy")
    }
}

window.qunitTestsArray['guiPaths.users'] = {
    test:function()
    {
        let path = '/user/'
        let pass = rundomString(6)
        let params = {
            create:[
                {
                    is_valid:false,
                    data:{
                        username:{
                            value:rundomString(6)
                        }
                    },
                },
                {
                    is_valid:true,
                    data:{
                        username:{value:rundomString(6)},
                        password:{value:pass, do_not_compare:true},
                        password2:{value:pass, do_not_compare:true},
                    },
                },
            ],
            update:[
                {
                    is_valid:true,
                    data:{
                        username : {value:rundomString(6)},
                    },
                },
            ]
        }
        guiTests.testForPath(path, params)

        let users_parts = 3
        let users_count = users_parts*2
        let users = []

        let curentTime = new Date()
        curentTime = curentTime.getTime()

        let usersrawdata = []
        for(let i = 0; i < users_count; i++)
        {
            // Проверка того что страница открывается
            guiTests.openPage(path+"new")

            let user = {
                username:{
                    value: "searchTest-"+i+"-"+rundomString(6),
                },
                first_name:{
                    value: "searchTest-"+curentTime,
                },
                last_name:{
                    value: "lastName"+(i % (users_count/users_parts) ),
                },
                password:{value:pass, do_not_compare:true},
                password2:{value:pass, do_not_compare:true},
            }
            usersrawdata.push(user)
            guiTests.setValuesAndCreate("newUser"+i, user, (data) => {
                users.push(data)
            }, true)
        }

        guiTests.openPage(path+"page/2")
        if(users_count > 20)
        {
            guiTests.hasElement(2, ".pagination-page2")
        }

        guiTests.openPage(path+"search/last_name=lastName1,is_active=true")
        guiTests.wait();

        guiTests.openPage(path+"search/id__not=1/page/2")
        guiTests.wait();

        syncQUnit.addTest("addSearchFilter", function ( assert )
        {
            let done = assert.async();
            window.curentPageObject.addSearchFilter("username__not", "unitTestNullResults")
            assert.ok(true, 'add search by username condition')
            testdone(done)
        });

        guiTests.hasElement(1, ".remove-token-id__not")
        guiTests.hasElement(1, ".remove-token-username__not")

        guiTests.actionAndWaitRedirect("addSearchFilter", () =>{
            $(".search-btn").trigger('click')
        })

        guiTests.hasElement(1, ".remove-token-id__not")
        guiTests.hasElement(1, ".remove-token-username__not")


        guiTests.openPage(path+"search/id__not=1,username__not=unitTestNullResults/page/2")

        guiTests.hasElement(1, ".remove-token-id__not")
        guiTests.clickAndWaitRedirect(".remove-token-id__not")
        guiTests.hasElement(0, ".remove-token-id__not")

        guiTests.hasElement(1, ".remove-token-username__not")
        guiTests.clickAndWaitRedirect(".remove-token-username__not")
        guiTests.hasElement(0, ".remove-token-username__not")


        guiTests.openPage(path+"search/username="+usersrawdata[0].username.value+"")
        syncQUnit.addTest("guiPaths['"+path+"search/username="+usersrawdata[0].username.value+"'] count results", function ( assert )
        {
            let done = assert.async();
            assert.ok($(".guiListSelections-toggle-btn").length == 1, 'search by username')
            testdone(done)
        });



        //guiTests.actionAndWaitRedirect(".highlight-tr", () =>{
        //    debugger;
        //    $(".highlight-tr:first").trigger('click')
        //})
        guiTests.clickAndWaitRedirect(".highlight-tr:first")
        guiTests.clickAndWaitRedirect(".sublink-btn-copy")

        guiTests.actionAndWaitRedirect("addSearchFilter", () =>{
            window.curentPageObject.model.guiFields.username.insertTestValue("copyFrom"+spajs.urlInfo.data.reg.api_pk)
            $(".btn_exec").trigger('click')
        })

        guiTests.deleteObject()

        guiTests.openPage(path+"search/first_name=searchTest-"+curentTime+",last_name=lastName0")

        //let results = 0;
        syncQUnit.addTest("guiPaths['"+path+"'] multiaction delete in search results", function ( assert )
        {
            let done = assert.async();
            $(".guiListSelections-toggle-btn").trigger('click')
            $(".multiaction-button_delete").trigger('click')

            setTimeout(() => {

                let btn = $(".iziToast-buttons button")[0]
                $(btn).trigger('click')
            }, 1000)

            tabSignal.once("guiList.deleted", () => {
                assert.ok(true, 'multiaction delete ok');
                testdone(done)
            })
        });

        guiTests.openPage(path+"search/first_name=searchTest-"+curentTime+",last_name=lastName0")

        syncQUnit.addTest("guiPaths['"+path+"'] count results (/first_name=searchTest-"+curentTime+",last_name=lastName0)", function ( assert )
        {
            let done = assert.async();
            assert.ok($(".guiListSelections-toggle-btn").length == 0, 'multiaction delete & search results = 0')
            testdone(done)
        });

        for(let i = 0; i< users_parts; i++)
        {
            guiTests.openPage(path+"search/first_name=searchTest-"+curentTime+"")
            syncQUnit.addTest("guiPaths['"+path+"'] multiaction delete (part="+i+" from "+users_parts+")", function ( assert )
            {
                let done = assert.async();
                $(".guiListSelections-toggle-btn").trigger('click')
                $(".multiaction-button_delete").trigger('click')

                setTimeout(() => {
                    let btn = $(".iziToast-buttons button")[0]
                    $(btn).trigger('click')
                }, 1000)

                tabSignal.once("guiList.deleted", () => {
                    assert.ok(true, 'multiaction delete ok');
                    testdone(done)
                })
            });
        }



        syncQUnit.addTest("toggleSelectEachItem in users", function ( assert )
        {
            let done = assert.async();

            $.when(window.curentPageObject.toggleSelectEachItem('testUsers', true)).done(()=>{
                assert.ok(true, 'toggleSelectEachItem ok');

                $(".unselect-all-btn").trigger('click')

                testdone(done)
            }).fail(()=>{
                assert.ok(false, 'toggleSelectEachItem fail');
                testdone(done)
            })
        });


    }
}