
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
    }
}