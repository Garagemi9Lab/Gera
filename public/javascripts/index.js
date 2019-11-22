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

function logout() {
    let response = confirm('Tem certeza que deseja fazer o logout?')
    if (response) {
        deleteSession('user')
        window.location.href = '/'
    }
}