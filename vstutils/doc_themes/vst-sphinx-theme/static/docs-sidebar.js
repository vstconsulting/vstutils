function saveHideMenuSettings()
{
    if(window.innerWidth > 991)
    {
        if($('body').hasClass('sidebar-collapse'))
        {
            localStorage.setItem('hideMenuInDocs', false);
        }
        else
        {
            localStorage.setItem('hideMenuInDocs', true);
        }
    }
}

function changeRootLink()
{
    let http = new XMLHttpRequest();
    http.open('HEAD', window.location.href);

    http.onload = function()
    {
        let header = this.getResponseHeader("vstutils-version");

        if(header)
        {
            $('#root_link').attr('href', '/');
        }
    }

    http.send();
}


$(document).ready(function() {

    let headings = $('.sidebar-menu .toctree-l1');

    for(let i=0; i<headings.length; i++)
    {
        let t = headings[i].children[0].innerText;
        $(headings[i].children[0]).empty();
        $(headings[i].children[0]).prepend('<i class="nav-icon fa fa-book"></i>');

        if(headings[i].children[1])
        {
            $(headings[i].children[0]).append('<p><span class="li-header-span "><i class=" li-header-span-i menu-text-data">' + t + '</i></span><i class="right fa fa-angle-left ico-menu"></i></p>');
        }
        else
        {
            $(headings[i].children[0]).append('<p><span class="li-header-span "><i class=" li-header-span-i menu-text-data">' + t + '</i></span></p>');
        }

        $(headings[i].children[0]).addClass("nav-link");
        $(headings[i]).addClass("nav-item");

        if(headings[i].children[1])
        {
            let child_ul = headings[i].children[1];

            $(child_ul).addClass("menu-treeview-menu nav nav-treeview");
        }
    }

    let hide_menu = localStorage.getItem('hideMenuInDocs');

    if(hide_menu && hide_menu == 'true')
    {
        $('body').addClass('sidebar-collapse')
    }

    changeRootLink();
});
