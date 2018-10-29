
window.qunitTestsArray['guiPaths.New'] = {
    test:function()
    {
        for(let path in guiSchema.path)
        {
            let api_obj = guiSchema.path[path]
            if(api_obj.type != 'list')
            {
                continue;
            }

            if(api_obj.level >= 3)
            {
                continue;
            }

            // Проверка того что страница открывается
            syncQUnit.addTest("guiPaths['"+path+"'].List", function ( assert )
            {
                console.log("guiPaths['"+path+"'].List")

                $.when(vstGO(path)).done(() => {

                    assert.ok(true, 'guiPaths["'+path+'"].List');

                }).fail(() => {
                    debugger;
                    assert.ok(false, 'guiPaths["'+path+'"].List fail');
                })
            });

            if(!api_obj.canCreate)
            {
                // Проверка того что страница с флагом api_obj.canCreate != true не открывается
                syncQUnit.addTest("guiPaths['"+path+"new']", function ( assert )
                {
                    try{
                        $.when(vstGO(path+"new")).done(() => {
                            debugger;
                            assert.ok(false, 'guiPaths["'+path+'new"] !canCreate');
                        }).fail(() => {
                            assert.ok(true, 'guiPaths["'+path+'new"] !canCreate');
                        })
                    }catch (ex)
                    {
                        assert.ok(true, 'guiPaths["'+path+'new"] !canCreate');
                    }
                });
                continue;
            }
            else
            {
                // Проверка того что страница с флагом api_obj.canCreate == true открывается
                syncQUnit.addTest("guiPaths['"+path+"'new]", function ( assert )
                {
                    console.log("guiPaths['"+path+"new']")

                    $.when(vstGO(path+"new")).done(() => {

                        assert.ok(true, 'guiPaths["'+path+'new"]');

                    }).fail(() => {
                        debugger;
                        assert.ok(false, 'guiPaths["'+path+'new"] fail');
                    })
                });

                // Проверка того что страница открывается
                /*syncQUnit.addTest("guiPaths['"+path+"'].List", function ( assert )
                {
                    console.log("guiPaths['"+path+"'].List")

                    $.when(vstGO(path)).done(() => {

                        assert.ok(true, 'guiPaths["'+path+'"].List');

                    }).fail(() => {
                        debugger;
                        assert.ok(false, 'guiPaths["'+path+'"].List fail');
                    })
                });*/
            }

        }
    }
}

//if(0)
window.qunitTestsArray['guiPaths.Actions'] = {
    test:function()
    {
        for(let path in guiSchema.path)
        {
            let api_obj = guiSchema.path[path]
            if(api_obj.type != 'action')
            {
                continue;
            }

            syncQUnit.addTest("guiPaths['"+path+"']", function ( assert )
            {
                console.log("guiPaths['"+path+"']")
                let done = assert.async();

                let pageItem = new guiObjectFactory(api_obj)
                assert.ok(pageItem, 'guiPaths["'+path+'"], pageItem != false');

                var def = new $.Deferred();
                spajs.wait_result("#spajs-right-area", def)
                def.resolve(pageItem.renderAsPage())

                $.when(def).always(() => {
                    assert.ok(pageItem, 'guiPaths["'+path+'"], renderAsPage != false');
                    setTimeout(()=>{
                        pageItem.stopUpdates();
                        assert.ok(pageItem, 'guiPaths["'+path+'"], stopUpdates');
                        testdone(done)
                    }, 1000)
                })

            });
        }

    }
}