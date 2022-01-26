import './style.scss';
import './auth.css';

import('../libs/fontawesome.js');

window.baseBundlePromise = Promise.all([
    import('../libs/jquery.js'),
    import('../libs/bootstrap-adminlte.js'),
    import('../libs/vue.js'),
]);
