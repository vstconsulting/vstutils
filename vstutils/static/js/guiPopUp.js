
// iziToast | v1.4.0
// http://izitoast.marcelodolce.com/


guiPopUp = {
    success: function (message = "", title = "OK") {
        return iziToast.success({
            title: title,
            message: message,
            maxWidth: 500,
            position: "topRight",
        });
    },

    warning: function (message = "", title = "Caution") {
        return iziToast.warning({
            title: title,
            message: message,
            maxWidth: 500,
            position: "topRight",
        });
    },

    error: function (message = "", title = "Error") {
        return iziToast.error({
            title: title,
            message: message,
            maxWidth: 500,
            position: "topRight",
        });

    },

}