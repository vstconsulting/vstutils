
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

            if(path != "/inventory/")
            {
                continue;
            }


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
            });
            */
            if(!api_obj.canCreate)
            {
                // Проверка того что страница с флагом api_obj.canCreate != true не открывается
                syncQUnit.addTest("guiPaths['"+path+"new']", function ( assert )
                {
                    let done = assert.async();
                    try{
                        $.when(vstGO(path+"new")).done(() => {
                            debugger;
                            assert.ok(false, 'guiPaths["'+path+'new"] !canCreate');
                            testdone(done)
                        }).fail(() => {
                            assert.ok(true, 'guiPaths["'+path+'new"] !canCreate');
                            testdone(done)
                        })
                    }catch (ex)
                    {
                        assert.ok(true, 'guiPaths["'+path+'new"] !canCreate');
                        testdone(done)
                    }
                });
                continue;
            }
            else
            {
                // Проверка того что страница с флагом api_obj.canCreate == true открывается
                syncQUnit.addTest("guiPaths['"+path+"'new]", function ( assert )
                {
                    let done = assert.async();
                    console.log("guiPaths['"+path+"new']")

                    $.when(vstGO(path+"new")).done(() => {

                        assert.ok(true, 'guiPaths["'+path+'new"]');

                        window.curentPageObject;
                        window.curentPageObject.model.guiFields.name.insertTestValue("ABC")
                        window.curentPageObject.model.guiFields.notes.insertTestValue("note ABC")

                        $.when(window.curentPageObject.createAndGoEdit()).done(() => {
                            
                            assert.ok(window.curentPageObject.model.guiFields.name.getValue() == "ABC", 'test name of new object');
                            testdone(done)
                        }).fail(() => {
                            debugger;
                            assert.ok(false, 'guiPaths["'+path+'new"] fail');
                            testdone(done)
                        })
                    }).fail(() => {
                        debugger;
                        assert.ok(false, 'guiPaths["'+path+'new"] fail');
                        testdone(done)
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

if(0)
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