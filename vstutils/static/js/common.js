function loadQUnitTests()
{

    $('body').append('<script src=\'' + window.pmStaticPath + 'js/tests/qUnitTest.js\'></script>');

    var intervaId = setInterval(function()
    {
        if(window.injectQunit !== undefined)
        {
            clearInterval(intervaId)
            injectQunit()
        }
    }, 1000)
}


function addslashes(string) {
    return string.replace(/\\/g, '\\\\').
    replace(/\u0008/g, '\\b').
    replace(/\t/g, '\\t').
    replace(/\n/g, '\\n').
    replace(/\f/g, '\\f').
    //replace(/\r/g, '\\r').
    //replace(/\a/g, '\\a').
    replace(/\v/g, '\\v').
    //replace(/\e/g, '\\e').
    replace(/'/g, '\\\'').
    replace(/"/g, '\\"');
}

function stripslashes (str) {
    //       discuss at: http://locutus.io/php/stripslashes/
    //      original by: Kevin van Zonneveld (http://kvz.io)
    //      improved by: Ates Goral (http://magnetiq.com)
    //      improved by: marrtins
    //      improved by: rezna
    //         fixed by: Mick@el
    //      bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    //      bugfixed by: Brett Zamir (http://brett-zamir.me)
    //         input by: Rick Waldron
    //         input by: Brant Messenger (http://www.brantmessenger.com/)
    // reimplemented by: Brett Zamir (http://brett-zamir.me)
    //        example 1: stripslashes('Kevin\'s code')
    //        returns 1: "Kevin's code"
    //        example 2: stripslashes('Kevin\\\'s code')
    //        returns 2: "Kevin\'s code"
    return (str + '')
        .replace(/\\(.?)/g, function (s, n1) {
            switch (n1) {
                case '\\':
                    return '\\'
                case '0':
                    return '\u0000'
                case 't':
                    return "\t"
                case 'n':
                    return "\n"
                case 'f':
                    return "\f"
                //case 'e':
                //  return "\e"
                case 'v':
                    return "\v"
                //case 'a':
                //  return "\a"
                case 'b':
                    return "\b"
                //case 'r':
                //  return "\r"
                case '':
                    return ''
                default:
                    return n1
            }
        })
}
/**
 * Тестовый тест, чтоб было видно что тесты вообще хоть как то работают.
 */
function trim(s)
{
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "")
    return '';
}


function inheritance(obj, constructor)
{
    var object = undefined;
    var item = function()
    {
        if(constructor)
        {
            return constructor.apply(jQuery.extend(true, item, object), arguments);
        }

        return jQuery.extend(true, item, object);
    }

    object = jQuery.extend(true, item, obj)

    return object
}

var pmLocalSettings = {
    __settings:{},
    get:function(name){
        return this.__settings[name];
    },
    set:function(name, value){
        this.__settings[name] = value;
        window.localStorage['pmLocalSettings'] = JSON.stringify(this.__settings)
        tabSignal.emit('pmLocalSettings.'+name, {type:'set', name:name, value:value})
    }
}


if(window.localStorage['pmLocalSettings'])
{
    try{
        pmLocalSettings.__settings = window.localStorage['pmLocalSettings'];
        pmLocalSettings.__settings = JSON.parse(pmLocalSettings.__settings)

    }catch (e)
    {

    }
}


if(pmLocalSettings.get('hideMenu'))
{
    if(window.innerWidth>767){
        $("body").addClass('sidebar-collapse');
    }
}


function toIdString(str)
{
    return str.replace(/[^A-z0-9\-]/img, "_").replace(/[\[\]]/gi, "_");
}

function hidemodal()
{
    var def= new $.Deferred();
    $(".modal.fade.in").on('hidden.bs.modal', function (e) {
        def.resolve();
    })
    $(".modal.fade.in").modal('hide');

    return def.promise();
}


function capitalizeString(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function isEmptyObject(obj) {
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            return false;
        }
    }
    return true;
}

window.onresize=function ()
{
    if(window.innerWidth>767)
    {
        if(pmLocalSettings.get('hideMenu'))
        {
            $("body").addClass('sidebar-collapse');
        }
        if ($("body").hasClass('sidebar-open'))
        {
            $("body").removeClass('sidebar-open');
        }
    }
    else
    {
        if ($("body").hasClass('sidebar-collapse')){
            $("body").removeClass('sidebar-collapse');
        }
    }
}

/*
 * Функция была немного модифицирована.
 * по идее, в таком виде нужна только для полемарча.
 */
function setActiveMenuLiBase()
{
    if(/\?projects/.test(window.location.href) || /\?project/.test(window.location.href) ||
        /\?new-project/.test(window.location.href))
    {
        $("#menu-projects").addClass("pm-treeview-active active active-li active-bold");
        $("#menu-projects-projects").addClass("active-bold");
        $("#menu-projects").removeClass("pm-treeview");
        openSubmenuFunc("#menu-projects");
    }
    else if(/\?templates/.test(window.location.href) ||
        /\?template/.test(window.location.href))
    {
        $("#menu-projects").addClass("pm-treeview-active active active-li");
        $("#menu-projects-templates").addClass("active-bold");
        $("#menu-projects").removeClass("pm-treeview");
        openSubmenuFunc("#menu-projects");
    }
    else if(/\?hosts/.test(window.location.href) || /\?host/.test(window.location.href) ||
        /\?new-host/.test(window.location.href))
    {
        $("#menu-inventories").addClass("pm-treeview-active active active-li");
        $("#menu-inventories-hosts").addClass("active-bold");
        $("#menu-inventories").removeClass("pm-treeview");
        openSubmenuFunc("#menu-inventories");
    }
    else if(/\?new-group/.test(window.location.href) || /\?groups/.test(window.location.href) ||
        /\?group/.test(window.location.href))
    {
        $("#menu-inventories").addClass("pm-treeview-active active active-li");
        $("#menu-inventories-groups").addClass("active-bold");
        $("#menu-inventories").removeClass("pm-treeview");
        openSubmenuFunc("#menu-inventories");
    }
    else if(/\?inventories/.test(window.location.href) || /\?inventory/.test(window.location.href) ||
        /\?new-inventory/.test(window.location.href))
    {
        $("#menu-inventories").addClass("pm-treeview-active active active-li active-bold");
        $("#menu-inventories-inventories").addClass("active-bold");
        $("#menu-inventories").removeClass("pm-treeview");
        openSubmenuFunc("#menu-inventories");
    }
    else if(/\?history/.test(window.location.href)){

        $("#menu-history").addClass("active active-li active-bold");
    }
    else if(/\?hooks/.test(window.location.href) || /\?hook/.test(window.location.href) ||
        /\?new-hook/.test(window.location.href))
    {
        $("#menu-system").addClass("pm-treeview-active active active-li");
        $("#menu-system-hooks").addClass("active-bold");
        $("#menu-system").removeClass("pm-treeview");
        openSubmenuFunc("#menu-system");
    }
    else if(/\?users/.test(window.location.href) || /\?user/.test(window.location.href) ||
        /\?new-user/.test(window.location.href) || /\?profile/.test(window.location.href))
    {
        $("#menu-system").addClass("pm-treeview-active active active-li");
        $("#menu-system-users").addClass("active-bold");
        $("#menu-system").removeClass("pm-treeview");
        openSubmenuFunc("#menu-system");
    }
    else
    {
        $("#menu-home").addClass("active active-li active-bold");
    }
}

// по идее, в таком виде, нужно только для полемарча.
function setActiveMenuLi()
{
    if($('li').is('.pm-treeview-active'))
    {
        var t=$(".pm-treeview-active");
        $(t).addClass("pm-treeview");
        $(t).removeClass("pm-treeview-active");
    }

    if($('li').is('.active-li'))
    {
        var t=$(".active-li");
        $(t).removeClass("active");
        $(t).removeClass("active-li");
    }

    if($('li').is('.active-bold'))
    {
        var g=$(".active-bold");
        $(g).removeClass("active-bold");
    }

    if($('li').is('.open-pm-treeview-menu'))
    {
        var h=$(".open-pm-treeview-menu");
        $(h).removeClass("open-pm-treeview-menu");
        $($(".open-pm-treeview-button").children("i")).removeClass("fa-angle-down");
        $($(".open-pm-treeview-button").children("i")).addClass("fa-angle-left");
    }

    return setActiveMenuLiBase();
}

/*
 * Функция добавляет элементу меню (при наведении на него)
 * css-класс hover-li, который добавляет необходимые стили.
 * Добавление класса происходит не сразу, а после небольшой паузы.
 * Это необходимо для того, чтобы выпавшее подменю быстро не пропадало
 * при попытке навести курсор на него.
 */
$(".sidebar-menu > li").mouseenter(function () {
    if(!($('body').hasClass('sidebar-open')))
    {
        var thisEl = this;
        setTimeout(function () {
            var pmTreeviewMenues = $(".pm-treeview-menu");
            var bool = false;
            for (var i = 0; i < pmTreeviewMenues.length; i++) {
                if ($(pmTreeviewMenues[i]).is(':hover')) {
                    bool = true;
                }
            }

            if (bool == false) {
                $(".hover-li").removeClass("hover-li");
                $(thisEl).addClass("hover-li");
            }
        }, 200);
    }
})

/*
 * Два обработчика событий, удаляющих класс hover-li у элементов меню, после того
 * как с меню убрали курсор.
 */
$(".content-wrapper").hover(function () {
    if(!($('body').hasClass('sidebar-open')))
    {
        $('.hover-li').removeClass('hover-li');
    }
})

$('.navbar').hover(function () {
    if(!($('body').hasClass('sidebar-open')))
    {
        $('.hover-li').removeClass('hover-li');
    }
})

/*обработчик на это событие есть еще и в файле app.js на 352 строке,
  они идентичны, только здесь вызывается еще функция setActiveMenuLi,
  которая определена в этом файле. Вызывать ее из app.js не охото, потому что
  вдруг будет подключен только app.js в каком-либо проекте, без common.js
  */
$(".content-wrapper").click(function ()
{
    if (window.innerWidth < 767 && $("body").hasClass("sidebar-open")) {
        setActiveMenuLi();
        $("body").removeClass('sidebar-open');
    }
});

/*обработчик на это событие есть еще и в файле app.js на 352 строке,
  они идентичны, только здесь вызывается еще функция setActiveMenuLi,
  которая определена в этом файле. Вызывать ее из app.js не охото, потому что
  вдруг будет подключен только app.js в каком-либо проекте, без common.js
  */
$(".sidebar-menu li a").click(function ()
{
    if (window.innerWidth < 767 && $("body").hasClass("sidebar-open")) {
        setActiveMenuLi();
        $("body").removeClass('sidebar-open');
    }
});

// по идее, в таком виде, нужно только для полемарча.
$($(".sidebar-toggle")[0]).click(function ()
{
    if (window.innerWidth < 767) {
        setActiveMenuLi();
    }
})

/*
* функция раскрывает вложенное подменю на устройствах с маленьким экраном.
* Вызывается из setActiveMenuLiBase()
* по идее, в таком виде, нужно только для полемарча.
* */
openSubmenuFunc = function (el_id)
{
    if(window.innerWidth<767)
    {
        $(".open-pm-treeview-menu").removeClass("open-pm-treeview-menu");
        $($(".open-pm-treeview-button").children("i")).removeClass("fa-angle-down");
        $($(".open-pm-treeview-button").children("i")).addClass("fa-angle-left");
        $(el_id).addClass("open-pm-treeview-menu");
        $($(el_id).children(".open-pm-treeview-button").children("i")).removeClass("fa-angle-left");
        $($(el_id).children(".open-pm-treeview-button").children("i")).addClass("fa-angle-down");
    }
}

/*
* обработчик события - нажатия на иконку раскрытия подменю на устройствах с маленьким экраном.
* по идее, в таком виде, нужно только для полемарча.
* */
$(".open-pm-treeview-button").click(function()
{
    if($($(this).parent()).hasClass("open-pm-treeview-menu"))
    {
        $($(this).parent()).removeClass("open-pm-treeview-menu");
        $($(this).children("i")).removeClass("fa-angle-down");
        $($(this).children("i")).addClass("fa-angle-left");
    }
    else
    {
        $(".open-pm-treeview-menu").removeClass("open-pm-treeview-menu");
        $($(".open-pm-treeview-button").children("i")).removeClass("fa-angle-down");
        $($(".open-pm-treeview-button").children("i")).addClass("fa-angle-left");
        $($(this).parent()).addClass("open-pm-treeview-menu");
        $($(this).children("i")).removeClass("fa-angle-left");
        $($(this).children("i")).addClass("fa-angle-down");
    }

})

tabSignal.connect("loading.completed", function()
{
    setActiveMenuLiBase();
})

//remove this string, when android app code be ready and after that check correct work on PC
setActiveMenuLiBase();