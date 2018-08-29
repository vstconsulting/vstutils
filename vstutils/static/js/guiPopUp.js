
// iziToast | v1.4.0
// http://izitoast.marcelodolce.com/


guiPopUp = {
    success: function (message = "", title = "OK") {
        return iziToast.success({
            title: title,
            message: message,
            maxWidth: 500,
        });
    },

    warning: function (message = "", title = "Caution") {
        return iziToast.warning({
            title: title,
            message: message,
            maxWidth: 500,
        });
    },

    error: function (message = "", title = "Error") {
        return iziToast.error({
            title: title,
            message: message,
            maxWidth: 500,
        });

    },

}