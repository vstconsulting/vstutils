/*
 * Registers 'profile' url.
 */
tabSignal.connect("openapi.completed", function()
{
    var page = new guiPage();

    page.blocks.push({
        id:'itemOne',
        render:(menuInfo, data)=>
        {
            var pageItem = new guiObjectFactory("/user/{pk}/", {
                page:'user/'+ my_user_id,
                api_pk:my_user_id
            })

            var def = new $.Deferred();
            $.when(pageItem.load(my_user_id)).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            return def.promise();
        }
    })

    page.registerURL([/^profile$/], "profile");
})


/*
 * Registers 'profile/settings' url.
 */
tabSignal.connect("openapi.completed", function()
{
    var page = new guiPage();

    page.blocks.push({
        id:'itemOne',
        render:(menuInfo, data)=>
        {
            var pageItem = new guiObjectFactory("/user/{pk}/settings/", {
                page:'user/'+ my_user_id +'/settings',
                api_pk:my_user_id
            })


            var def = new $.Deferred();
            $.when(pageItem.load(my_user_id)).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            return def.promise();
        }
    })

    page.registerURL([/^profile\/settings$/], "profile_settings");
})


/*
 * Registers 'profile/copy' url.
 */
tabSignal.connect("openapi.completed", function()
{
    var page = new guiPage();

    page.blocks.push({
        id:'itemOne',
        render:(menuInfo, data)=>
        {
            var pageItem = new guiObjectFactory("/user/{pk}/copy/", {
                page:'user/'+ my_user_id +'/copy',
                api_pk:my_user_id
            })

            return pageItem.renderAsPage();
        }
    })

    page.registerURL([/^profile\/copy/], "profile_copy");
})