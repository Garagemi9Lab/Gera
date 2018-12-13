$(document).on("click", ".chat-button", function () {
    $(".chatbox").toggle('slide', { direction: 'down' }, 700, function () {
        if (icon.hasClass('fa-times')) {
            $('#textInput').focus()
        }
    })

    var icon = $(this).children()
    icon.toggleClass('fa-comments')
    icon.toggleClass('fa-times')
})

$(document).on('click', '#sendBtn', function (e) {
    var el = $('#textInput')[0]
    sendToBot(e, el)
})

$(document).on('input', '#textInput', function (e) {
    if ($(this).val().length > 0) {
        $('#sendBtn').removeAttr('disabled')
    } else {
        $('#sendBtn').attr('disabled', true)
    }
})

$(document).on("click", ".head", function () {
    $(this).toggleClass("barra");
    $(".hora").toggle();
    $(".medico").toggle();
    if ($(this).hasClass('barra')) {
        $(".chatlogs").css("height", "calc(100% - 113px)")
    } else {
        $(".chatlogs").css("height", "calc(100% - 133px)")
    }
})


$(function () {
    $("#tabs").tabs();
});