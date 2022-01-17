const libs = Promise.all([
    import('./adminlte.js').then(() => import('../gui.css')),
    import('../libs/fontawesome.js'),
]);

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('hideMenuInDocs') === 'true') {
        document.body.classList.add('sidebar-collapse');
    }
});

// eslint-disable-next-line no-unused-vars
window.saveHideMenuSettings = function () {
    if (window.innerWidth > 991) {
        if (window.$('body').hasClass('sidebar-collapse')) {
            localStorage.setItem('hideMenuInDocs', 'false');
        } else {
            localStorage.setItem('hideMenuInDocs', 'true');
        }
    }
};

libs.then(function () {
    const $ = window.$;
    function changeRootLink() {
        if (!window.READTHEDOCS) {
            $('#root_link').attr('href', '/');
        }
    }

    $(document).ready(function () {
        let headings = $('.sidebar-menu .toctree-l1');

        for (let i = 0; i < headings.length; i++) {
            let t = headings[i].children[0].innerText;
            $(headings[i].children[0]).empty();
            $(headings[i].children[0]).prepend('<i class="nav-icon fa fa-book"></i>');

            if (headings[i].children[1]) {
                $(headings[i].children[0]).append(
                    '<p><span class="li-header-span "><i class=" li-header-span-i menu-text-data" style="white-space: break-spaces;">' +
                        t +
                        '</i></span><i class="fa fa-angle-left ico-menu" style="margin-left: 10px;"></i></p>',
                );
            } else {
                $(headings[i].children[0]).append(
                    '<p><span class="li-header-span "><i class=" li-header-span-i menu-text-data" style="white-space: break-spaces;">' +
                        t +
                        '</i></span></p>',
                );
            }

            $(headings[i].children[0]).addClass('nav-link');
            $(headings[i]).addClass('nav-item');

            if (headings[i].children[1]) {
                let child_ul = headings[i].children[1];

                $(child_ul).addClass('menu-treeview-menu nav nav-treeview');
            }
        }

        changeRootLink();
    });
});
