var context = {}
var promotionLoaded = false
var waitForUserInput = false
var loggedUser = getSession('user')

function userMessage(message) {
    console.log('/message invoked..')
    let params = {
        input: {
            text: message || ''
        },
        context: context,
        loggedUser
    };
    showTyping()

    xhrPost('/message', params, function (data) {
        removeTyping()
        console.log(JSON.stringify(data, null, 2))
        if (!promotionLoaded && data.context.userPayload.token && data.context.userPayload.order) {
            getPromotions(data);
            promotionLoaded = true
        }
        displayMessages(data.output)
        context = data.context;

        if (data.output.action && data.output.action == 'waitForUserInput') {
            waitForUser()
        }

    }, function (err) {
        removeTyping()
        displayMessage('Um erro ocorreu, tente mais tarde', 'watson');
        console.log(err)
    });
}

function waitForUser() {
    if (!waitForUserInput) {
        var chat_footer = document.getElementById('chat_footer')
        var div_block = document.createElement('div')
        div_block.setAttribute('class', 'block_div')
        div_block.onclick = skipKitInputAlert
        div_block.setAttribute('id', 'block_div')
        chat_footer.append(div_block)
    }
}

function skipKitInputAlert() {
    alert('Favor informe os dados necessarios.')
}

function sendToBot(event, inputBox) {
    if (event.keyCode === 13 || event.type === 'click') {
        if (inputBox.value && inputBox.value.trim().length > 0) {
            let message = inputBox.value.trim()
            displayMessage(message, 'user')
            userMessage(message)
            // Clear input box for further messages
            inputBox.value = '';
            inputBox.focus()
        }
    }
}

function displayMessages(output) {
    let texts = output.text
    for (let text in texts) {
        displayMessage(texts[text], 'watson');
    }
    if (output && output.quick_replies) {
        displayQuickReplies(output.quick_replies)
    }
}

function displayMessage(message, user, type) {
    var chatBox = document.getElementById('chatlogs')
    var bubble = new Bubble(message, user, type)
    chatBox.appendChild(bubble)
    chatBox.scrollTop = chatBox.scrollHeight
}

function Bubble(message, user, type) {
    let userClass = (user == 'watson') ? 'bot' : 'self'
    let userImg = (user === 'watson') ? 'img/bots.png' : 'img/user.svg'
    var bubble = document.createElement('div')
    bubble.setAttribute('class', 'segments')
    var div_top = document.createElement('div')
    div_top.setAttribute('class', 'chat top ' + userClass)
    var div_out = document.createElement('div')
    div_out.setAttribute('class', 'out')
    var div_photo = document.createElement('div')
    div_photo.setAttribute('class', 'user-photo')
    var img = document.createElement('img')
    img.setAttribute('src', userImg)
    img.setAttribute('alt', 'img')
    div_photo.append(img)
    div_out.append(div_photo)
    var div_time = document.createElement('div')
    div_time.setAttribute('class', 'time')
    div_time.innerHTML = new Date().toLocaleTimeString().substr(0, 5)
    div_out.append(div_time)
    var div_chat = document.createElement('div')
    div_chat.setAttribute('class', 'chat-message')
    if (!type || type === 'typing')
        div_chat.innerHTML = message
    else
        div_chat.append(message)
    if (type === 'quick_reply') {
        bubble.setAttribute('class', 'segments quick_reply_bubble')
    }

    if (type === 'typing') {
        bubble.setAttribute('class', 'segments typing_bubble')
    }
    div_top.append(div_out)
    div_top.append(div_chat)

    bubble.append(div_top)
    return bubble
}

function displayQuickReplies(quick_replies) {
    if (quick_replies.length > 0) {
        let div_quick_replies = document.createElement('div')
        div_quick_replies.setAttribute('class', 'quick_replies_div')
        quick_replies.forEach((quick_reply) => {
            div_quick_replies.append(new QuickReplyElement(quick_reply))
        })
        displayMessage(div_quick_replies, 'watson', 'quick_reply')
        addClickListenerEvent('quick_reply_btn')
    }
}

function QuickReplyElement(quick_reply) {
    switch (quick_reply.type) {
        case 'button':
            let button = document.createElement('button')
            button.setAttribute('class', 'quick_reply_btn')
            button.setAttribute('hidden_value', quick_reply.payload.value)
            button.innerHTML = quick_reply.title
            return button
        case 'checklists':
            let lists_div = document.createElement('div')
            lists_div.setAttribute('class', 'quick_reply_checklists_div')
            quick_reply.payload.lists.forEach(list => {
                let div = document.createElement('div')
                div.setAttribute('class', 'quick_reply_checklist_div')
                let title = document.createElement('div')
                title.setAttribute('class', 'quick_reply_title')
                title.innerHTML = list.title
                div.append(title)

                let products_div = document.createElement('div')
                products_div.setAttribute('class', 'quick_reply_checklist_products')

                list.payload.listProducts.forEach(product => {
                    let div = document.createElement('div')
                    div.setAttribute('class', 'quick_reply_checklist_product')
                    let input = document.createElement('input')
                    input.setAttribute('type', 'checkbox')
                    input.setAttribute('id', product.code)
                    input.setAttribute('hidden_value', list.payload.listCode + '-' + product.code)
                    let label = document.createElement('label')
                    label.setAttribute('for', product.code)
                    label.innerHTML = product.code + ' - ' + product.name
                    div.append(input)
                    div.append(label)
                    products_div.append(div)
                })
                div.append(products_div)
                lists_div.append(div)
            })
            let button_div = document.createElement('div')
            button_div.setAttribute('class', 'quick_reply_checklist_btn_div')
            let qr_button = document.createElement('button')
            qr_button.onclick = quickReplyKitFinish
            qr_button.innerHTML = 'Finalizar'
            button_div.append(qr_button)
            lists_div.append(button_div)
            return lists_div
    }
}

function quickReplyKitFinish() {
    var kits_div = document.getElementsByClassName('quick_reply_checklist_products')
    var selected_products = []
    // for all browser
    for (var i = 0; i < kits_div.length; i++) {
        let products = kits_div[i].childNodes
        let min_checked = false;
        for (var j = 0; j < products.length; j++) {
            let input = products[i].firstChild
            if (input.checked) {
                min_checked = true
                var hidden_value = input.getAttribute('hidden_value')
                selected_products.push({
                    kitCode: parseInt(hidden_value.split('-')[0]),
                    produceCode: parseInt(hidden_value.split('-')[1]),
                })
            }
        }
        if (!min_checked) {
            alert('Favor selecione pelo menos um produto de cada KIT e clique em finalizar.')
            return;
        }
    }

    console.log(JSON.stringify(selected_products, null, 2))


}

function onQuickReplyClick(e) {
    // Remove quick replies bubble.
    let bubble = e.target.parentElement.parentElement.parentElement.parentElement
    let text = e.target.innerHTML
    let value = e.target.getAttribute('hidden_value')
    bubble.parentElement.removeChild(bubble)
    displayMessage(text, 'user')
    text = text + '<code>' + value
    userMessage(text)
}

function addClickListenerEvent(className) {
    let elements = document.getElementsByClassName(className)
    for (let i = 0; i < elements.length; i++)
        elements[i].addEventListener('click', onQuickReplyClick)

}

function getPromotions(watsonData) {
    xhrPost('/api/getPromotions', watsonData, (result) => {
        if (result.hasPromotions) {
            let promotion_div = document.getElementById('promotions_div')
            let promotions = ''
            result.promotions.forEach((promotion) => {
                promotions += '<div class="d-flex linha-promocao">' +
                    '<div class="col-2 d-flex ico-promocao align-center justify-center" >' +
                    '<i class="material-icons">local_offer</i>' +
                    '</div >' +
                    '<div class="col-7 align-center">' +
                    '<div class="titulo-promocao">' + promotion.title + '</div>' +
                    '<div class="desc-promocao">' + promotion.description + '</div>' +
                    '</div>' +
                    '<div class="col-3 botao-promocao align-center justify-center">' +
                    '<div class="valor-promocao"><strong>Ver</strong></div>' +
                    '</div>' +
                    '</div>'
            })
            promotion_div.innerHTML = promotions
            $("#tabs").tabs();
        } else {
            // No promotions found
        }
    }, (err) => {
        console.log(err)
    })
}

function showTyping() {
    var chatBox = document.getElementById('chatlogs')
    let message = '<img src="/img/typing.gif" class="typing-gif" id="typing_img"/>'
    var bubble = new Bubble(message, 'watson', 'typing')
    chatBox.appendChild(bubble)
    chatBox.scrollTop = chatBox.scrollHeight
}

function removeTyping() {
    var chatBox = document.getElementById('chatlogs')
    if (document.getElementById('typing_img')) {

        let typingBubble = document.getElementById('typing_img').parentElement.parentElement.parentElement
        chatBox.removeChild(typingBubble)
    }
}

userMessage('');