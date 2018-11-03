
window.qunitTestsArray['common'] = {
    test:function()
    {
        // openHelpModal
        // stringToBoolean
        // searchObjectsInListByJs
        // checkDataValidityForSearchQuery

        //  isCordova()
        // Экшены и мультиэкшены
        // spajs.errorPage
        // pmLicense
        // teams acl_member_callback
        // guiElements
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
        guiTests.wait(200);

        guiTests.openPage(path+"search/id__not=1/page/2")
        guiTests.wait(200);

        guiTests.actionAndWaitRedirect("addSearchFilter", () =>{
            window.curentPageObject.addSearchFilter("username__not", "unitTestNullResults")
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



        guiTests.openPage(path+"search/first_name=searchTest-"+curentTime+",last_name=lastName0")

        //let results = 0;
        syncQUnit.addTest("guiPaths['"+path+"'] multiaction delete in search results", function ( assert )
        {
            let done = assert.async();
            $(".guiListSelections-toggle-btn").trigger('click')
            //results = $(".guiListSelections-toggle-btn").length

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

        syncQUnit.addTest("guiPaths['"+path+"'] cound results (/first_name=searchTest-"+curentTime+",last_name=lastName0)", function ( assert )
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