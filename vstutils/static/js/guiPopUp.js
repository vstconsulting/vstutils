
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

    question: function (message = "", answer_buttons = []) {
        var answer = new $.Deferred();
        var buttons = [];
        for(var i in answer_buttons)
        {
            buttons.push([
                '<button onclick="gui_pop_up_question_get_answer(this)">' + answer_buttons[i] + '</button>',
                function (instance, toast) {

                    instance.hide({ transitionOut: 'fadeOut' }, toast, window.question_answer);
                },
            ])
        }

        iziToast.question({
            timeout: false,
            close: true,
            overlay: true,
            displayMode: 'once',
            id: 'question',
            zindex: 2999,
            //maxWidth: 500,
            title: 'Question',
            message: message,
            position: 'center',
            buttons: buttons,
            onClosed: function(instance, toast, closedBy){
                answer.resolve(closedBy);
            }
        });

        return answer.promise();
    },
}


function gui_pop_up_question_get_answer(button) {

    return window.question_answer = button.innerText;
}