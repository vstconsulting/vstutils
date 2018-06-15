
function inAppLogout()
{
    return spajs.ajax.Call({
        url: gui_logout_url,
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify({next:"/login"}),
        success: function (data)
        {
            inAppClose();
        },
        error: function (e)
        {
            inAppClose();
        }
    });
}

function inAppClose()
{
    window.parent.inAppClose();
}