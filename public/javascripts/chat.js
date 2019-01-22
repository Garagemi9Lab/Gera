var context = {}
var promotionLoaded = false
var waitForUserInput = false
var loggedUser = getSession('user')

function waitForUser() {
    if (!waitForUserInput) {
        var chat_footer = document.getElementById('chat_footer')
        var div_block = document.createElement('div')
        div_block.setAttribute('class', 'block_div')
        div_block.onclick = skipKitInputAlert
        div_block.setAttribute('id', 'block_div')
        chat_footer.append(div_block)
        waitForUserInput = true
    }
}

function userMessage(message, action, data) {
    console.log('/message invoked..')
    let params = {
        input: {
            text: message || ''
        },
        context: context,
        loggedUser
    };
    if (action && data) {
        params.input.data = data
        params.input.action = action
    }
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
        case 'checklists':
            let lists_div = document.createElement('div')
            lists_div.setAttribute('class', 'quick_reply_checklists_div')
            quick_reply.payload.lists.forEach(list => {
                let div = document.createElement('div')
                div.setAttribute('class', 'quick_reply_checklist_div')

                let checklist_header = document.createElement('div')
                checklist_header.setAttribute('class', 'quick_reply_checklist_header')
                if (list.checkable) {
                    let header_input = document.createElement('input')
                    header_input.setAttribute('type', 'checkbox')
                    header_input.setAttribute('id', list.payload.listCode)
                    header_input.setAttribute('hidden_value', list.payload.listCode)
                    let header_label = document.createElement('label')
                    header_label.setAttribute('for', list.payload.listCode)
                    header_label.setAttribute('class', 'quick_reply_title')
                    header_label.innerHTML = list.title
                    checklist_header.append(header_input)
                    checklist_header.append(header_label)
                } else {
                    let title = document.createElement('div')
                    title.setAttribute('class', 'quick_reply_title')
                    title.innerHTML = list.title
                    checklist_header.append(title)
                }

                div.append(checklist_header)

                let items_div = document.createElement('div')
                items_div.setAttribute('class', 'quick_reply_checklist_items')

                list.payload.listItems.forEach(item => {
                    let div = document.createElement('div')
                    div.setAttribute('class', 'quick_reply_checklist_item')
                    if (item.checkable) {
                        let input = document.createElement('input')
                        input.setAttribute('type', 'checkbox')
                        input.setAttribute('id', item.code)
                        input.setAttribute('hidden_value', list.payload.listCode + '-' + item.code)
                        let label = document.createElement('label')
                        label.setAttribute('for', item.code)
                        label.innerHTML = item.code + ' - ' + item.name
                        div.append(input)
                        div.append(label)
                    } else {
                        let item_title = document.createElement('div')
                        item_title.setAttribute('class', 'quick_reply_item_title')
                        item_title.innerHTML = item.code + ' - ' + item.name
                        div.append(item_title)
                    }
                    items_div.append(div)
                })
                div.append(items_div)
                lists_div.append(div)
            })
            let button_div = document.createElement('div')
            button_div.setAttribute('class', 'quick_reply_checklist_btn_div')
            let qr_button = document.createElement('button')
            qr_button.setAttribute('class', 'quick_reply_checklists_finish_btn')
            qr_button.onclick = quickRepliesFinish
            qr_button.innerHTML = 'Finalizar'
            button_div.append(qr_button)
            lists_div.append(button_div)
            return lists_div
        default:
            let button = document.createElement('button')
            button.setAttribute('class', 'quick_reply_btn')
            button.setAttribute('quick_reply_type', quick_reply.type)
            button.setAttribute('hidden_value', quick_reply.payload.value)
            button.innerHTML = quick_reply.title
            return button
    }
}

function quickRepliesFinish() {
    var checklists_div = document.getElementsByClassName('quick_reply_checklist_div')
    var selected_list = []
    for (var i = 0; i < checklists_div.length; i++) {
        let min_checked = false;
        var hidden_value
        var checklist = checklists_div[i]
        var checklist_header_elements = checklist.firstChild.childNodes
        var checklist_title = ''
        if (checklist_header_elements.length > 1) {
            let input = checklist_header_elements[0]
            checklist_title = checklist_header_elements[1].innerHTML
            if (input.checked) {
                min_checked = true
                hidden_value = input.getAttribute('hidden_value')
                selected_list.push({
                    listCode: parseInt(hidden_value),
                    listTitle: checklist_title
                })
            }
        } else {
            checklist_title = checklist_header_elements[0].innerHTML
            var items = checklist.lastChild.childNodes
            for (var j = 0; j < items.length; j++) {
                let input = items[i].firstChild
                let name = items[i].lastChild.innerHTML
                if (input.checked) {
                    min_checked = true
                    var hidden_value = input.getAttribute('hidden_value')
                    selected_list.push({
                        listCode: parseInt(hidden_value.split('-')[0]),
                        itemCode: parseInt(hidden_value.split('-')[1]),
                        itemName: name,
                        listTitle: checklist_title
                    })
                }
            }
        }

        if (!min_checked) {
            alert('Favor selecione pelo menos um item e clique em finalizar.')
            return;
        }
    }
    if (selected_list.length > 0) {
        disableQuickReplyCheckLists()
        showUserQuickReplyMessage(selected_list)
        removeDisableBlock()
    }
}

function disableQuickReplyCheckLists() {
    var lists_div = document.getElementsByClassName('quick_reply_checklist_header')
    for (var i = 0; i < lists_div.length; i++) {
        // let input = lists_div[i].childNodes[0]
        // if (!input.disabled) input.disabled = true
        for (var j = 0; j < items.length; j++) {
            let input = items[i].firstChild
            if (!input.disabled) input.disabled = true
        }
    }

    let finishButtons = document.getElementsByClassName('quick_reply_checklists_finish_btn')
    for (var k = 0; k < finishButtons.length; k++) {
        if (!finishButtons[k].disabled) finishButtons[k].disabled = true
    }
}

function showUserQuickReplyMessage(selected_list) {
    let lists = selected_list.reduce((acc, curr) => {
        if (!acc[curr.listCode]) {
            acc[curr.listCode] = { title: curr.listTitle }
        }
        return acc
    }, {})

    let div = document.createElement('div')
    div.setAttribute('class', 'checklists_reply_div')

    Object.keys(lists).forEach((listCode) => {
        let list_div = document.createElement('div')
        list_div.setAttribute('class', 'checklist_reply_div')

        let list = lists[listCode]
        let list_title = document.createElement('div')
        list_title.setAttribute('class', 'checklist_reply_title_div')
        list_title.innerHTML = list.title
        list_div.append(list_title)

        let list_items = document.createElement('div')
        list_items.setAttribute('class', 'checklist_reply_items')

        list.items.forEach((item) => {
            let item_div = document.createElement('div')
            item_div.setAttribute('class', 'checklist_reply_item')
            item_div.innerHTML = item.name
            list_items.append(item_div)
        })

        list_div.append(list_items)

        div.append(list_div)

    })

    displayMessage(div, 'user', 'htmlElement')
    userMessage('', 'selectKit', selected_list)

}

function removeDisableBlock() {
    var block_div = document.getElementById('block_div')
    if (block_div) {
        block_div.remove()
        waitForUserInput = false
    }
}

function onQuickReplyClick(e) {
    // Remove quick replies bubble.
    if (waitForUserInput) removeDisableBlock()
    console.log(e.target)
    let bubble = e.target.parentElement.parentElement.parentElement.parentElement
    let text = e.target.innerHTML
    let value = e.target.getAttribute('hidden_value')
    let type = e.target.getAttribute('quick_reply_type')
    bubble.parentElement.removeChild(bubble)
    displayMessage(text, 'user')
    // switch (type) {
    // default:
    // continue;
    // }
    // text = text + '<code>' + value
    userMessage(value)

}

function addClickListenerEvent(className) {
    let elements = document.getElementsByClassName(className)
    for (let i = 0; i < elements.length; i++)
        elements[i].addEventListener('click', onQuickReplyClick)

}

function getPromotions(watsonData) {
    xhrPost('/api/getPromotions', watsonData, (result) => {

        if (result.input.hasPromotions) {
            let promotion_div = document.getElementById('promotions_div')
            let promotions = ''
            result.userPayload.promotions.forEach((promotion) => {
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