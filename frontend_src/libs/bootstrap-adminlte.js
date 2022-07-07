const bootstrap = require('bootstrap/dist/js/bootstrap.js');

require('admin-lte/build/js/CardRefresh.js');
require('admin-lte/build/js/CardWidget.js');
require('admin-lte/build/js/Dropdown.js');
require('admin-lte/build/js/Layout.js');
require('admin-lte/build/js/PushMenu.js');
require('admin-lte/build/js/SidebarSearch.js');
require('admin-lte/build/js/NavbarSearch.js');
require('admin-lte/build/js/Toasts.js');
require('admin-lte/build/js/TodoList.js');
require('admin-lte/build/js/Treeview.js');

require('./bootstrap-adminlte.scss');

window.bootstrap = bootstrap;

export { bootstrap };
