<template>
    <div class="in-loading" v-if="show">
        <div class="loader-wrapper">
            <div class="loader"></div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'preloader',
        props: ['show'],
    };
</script>

<style scoped>
    /**
    * http://codepen.io/thomasgrant/pen/DgEFd
    * Animation for waiting
    *
    * http://codepen.io/elbitapmoC/pen/ryVXNw
    * http://codepen.io/thomasgrant/pen/DgEFd
    */
    #loader-wrapper,
    .loader-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        /*z-index: 1000;*/
        z-index: 10000;
        background-color: rgba(0, 0, 0, 0.35);
        display: none;
        opacity: 0;
    }

    .in-loading #loader-wrapper,
    .in-loading .loader-wrapper {
        display: block;
        opacity: 1;
        animation: appchat_load_success 0.1s;
    }

    .in-starting #loader-wrapper,
    .in-loading .loader-wrapper {
        display: block;
        opacity: 1;
        animation: appchat_load_start 0.3s;
    }

    .in-starting #loader-wrapper {
        background-color: rgb(255, 255, 255);
    }

    /*
.in-start-success #loader-wrapper {
    opacity: 1;
    animation: appchat_load_success 0.5s;
}*/

    @keyframes appchat_load_start {
        from {
            opacity: 0;
        }
        to {
            opacity: 0.35;
        }
    }

    @keyframes appchat_load_success {
        from {
            opacity: 0;
        }
        to {
            opacity: 0.35;
        }
    }

    #loader,
    .loader {
        border: 3px solid transparent;
        border-top-color: #3498db;
        border-radius: 50%;
        display: block;
        margin: -75px 0 0 -75px;
        width: 150px;
        height: 150px;
        position: relative;
        top: 50%;
        left: 50%;
        -webkit-animation: spin 2s linear infinite;
        -moz-animation: spin 2s linear infinite;
        -o-animation: spin 2s linear infinite;
        -ms-animation: spin 2s linear infinite;
        animation: spin 2s linear infinite;
    }
    #loader:before,
    .loader:before {
        border: 3px solid transparent;
        border-top-color: #e74c3c;
        border-radius: 50%;
        content: '';
        position: absolute;
        top: 5px;
        right: 5px;
        bottom: 5px;
        left: 5px;
        -webkit-animation: spin 3s linear infinite;
        -moz-animation: spin 3s linear infinite;
        -o-animation: spin 3s linear infinite;
        -ms-animation: spin 3s linear infinite;
        animation: spin 3s linear infinite;
    }
    #loader:after,
    .loader:after {
        border: 3px solid transparent;
        border-top-color: #f9c922;
        border-radius: 50%;
        content: '';
        position: absolute;
        top: 15px;
        left: 15px;
        bottom: 15px;
        right: 15px;
        -webkit-animation: spin 1.5s linear infinite;
        -moz-animation: spin 1.5s linear infinite;
        -o-animation: spin 1.5s linear infinite;
        -ms-animation: spin 1.5s linear infinite;
        animation: spin 1.5s linear infinite;
    }

    @-webkit-keyframes spin {
        0% {
            -webkit-transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            transform: rotate(0deg);
        }
        100% {
            -webkit-transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            transform: rotate(360deg);
        }
    }
    @-moz-keyframes spin {
        0% {
            -webkit-transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            transform: rotate(0deg);
        }
        100% {
            -webkit-transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            transform: rotate(360deg);
        }
    }
    @-o-keyframes spin {
        0% {
            -webkit-transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            transform: rotate(0deg);
        }
        100% {
            -webkit-transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            transform: rotate(360deg);
        }
    }
    @-ms-keyframes spin {
        0% {
            -webkit-transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            transform: rotate(0deg);
        }
        100% {
            -webkit-transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            transform: rotate(360deg);
        }
    }
    @keyframes spin {
        0% {
            -webkit-transform: rotate(0deg);
            -ms-transform: rotate(0deg);
            transform: rotate(0deg);
        }
        100% {
            -webkit-transform: rotate(360deg);
            -ms-transform: rotate(360deg);
            transform: rotate(360deg);
        }
    }
</style>
