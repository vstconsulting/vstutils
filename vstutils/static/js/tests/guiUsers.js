
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
        let users_count = users_parts*7
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
    }
}