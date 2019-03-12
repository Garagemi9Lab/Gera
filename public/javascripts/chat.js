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
        if (!promotionLoaded && data.context.userPayload.tokens
            && data.context.userPayload.tokens.order && data.context.userPayload.tokens.order.valid
            && data.context.userPayload.order) {
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
        if (texts[text] != '')
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

        case 'checklist':
            let checklist_div = document.createElement('div')
            checklist_div.setAttribute('class', 'quick_reply_checklist_items')
            quick_reply.payload.listItems.forEach(item => {
                let div = document.createElement('div')
                div.setAttribute('class', 'quick_reply_checklist_item_holder')

                let checkbox_div = document.createElement('div')
                checkbox_div.setAttribute('class', 'quick_reply_checklist_item_checkbox')
                let input = document.createElement('input')
                input.setAttribute('type', 'checkbox')
                input.setAttribute('id', item.code)
                input.setAttribute('hidden_value', quick_reply.payload.listCode + '-' + item.code)
                let label = document.createElement('label')
                label.setAttribute('for', item.code)
                label.innerHTML = item.name
                checkbox_div.append(input)
                checkbox_div.append(label)

                let qty_div = document.createElement('div')
                qty_div.setAttribute('class', 'quick_reply_checklist_qty')

                let input_qty = document.createElement('input')
                input_qty.setAttribute('type', 'number')
                input_qty.setAttribute('id', 'qty' + item.code)
                input_qty.setAttribute('min', '0')
                input_qty.setAttribute('max', item.maxQuantity)

                let label_qty = document.createElement('label')
                label_qty.setAttribute('for', 'qty' + item.code)
                label_qty.innerHTML = 'Qtd: '
                qty_div.append(label_qty)
                qty_div.append(input_qty)

                let price_div = document.createElement('div')
                price_div.innerHTML = 'Valor: ' + item.price

                div.append(checkbox_div)
                div.append(qty_div)
                div.append(price_div)
                checklist_div.append(div)
            })

            let btn_div = document.createElement('div')
            btn_div.setAttribute('class', 'quick_reply_checklist_btn_div')
            let qr_btn = document.createElement('button')
            qr_btn.setAttribute('class', 'quick_reply_checklists_finish_btn')
            qr_btn.onclick = quickRepliesChecklistFinish
            qr_btn.innerHTML = 'Selecionar'
            btn_div.append(qr_btn)
            checklist_div.append(btn_div)
            return checklist_div

        case "Collapsible-list":
            let collapsible_holder = document.createElement('div')
            collapsible_holder.setAttribute('class', 'collapsible-holder')
            let disabled = false
            let disabledBtn = true
            quick_reply.payload.forEach((collapsible_item) => {
                if (collapsible_item.type == 'Collapsible-item') {
                    console.log(collapsible_item)
                    disabled = collapsible_item.enabled ? false : true
                    if (collapsible_item.enabled) disabledBtn = false
                    let collapsible_item_div = document.createElement('div')
                    collapsible_item_div.setAttribute('class', 'collapsible-item')
                    collapsible_item_div.setAttribute('id', collapsible_item.listCode)
                    collapsible_item_div.setAttribute('open', false)

                    // Header
                    let collapsible_header = document.createElement('div')
                    collapsible_header.setAttribute('class', 'collapsible-header')
                    let collapsible_title_holder = document.createElement('div')
                    collapsible_title_holder.setAttribute('class', 'collapsible-title-holder')
                    let collapsible_title = document.createElement('div')
                    collapsible_title.setAttribute('class', 'collapsible-title')
                    collapsible_title.innerHTML = collapsible_item.title
                    let collapsible_status = document.createElement('div')
                    collapsible_status.setAttribute('class', collapsible_item.enabled ? 'status-enabled' : 'status-disabled')
                    collapsible_status.innerHTML = collapsible_item.status
                    let collapsible_arrow_holder = document.createElement('div')
                    collapsible_arrow_holder.setAttribute('class', 'collapsible-arrow-holder')
                    let collapsible_arrow_div = document.createElement('div')
                    collapsible_arrow_div.setAttribute('class', 'collapsible-arrow-div')
                    collapsible_arrow_div.onclick = function () { collapsibleToggle(collapsible_item.listCode) }
                    let arrow_img = document.createElement('img')
                    arrow_img.setAttribute('src', '/img/down-arrow.png')
                    arrow_img.setAttribute('class', 'arrow-icon')
                    collapsible_arrow_div.append(arrow_img)
                    collapsible_arrow_holder.append(collapsible_arrow_div)
                    collapsible_title_holder.append(collapsible_title)
                    collapsible_title_holder.append(collapsible_status)
                    collapsible_header.append(collapsible_title_holder)
                    collapsible_header.append(collapsible_arrow_holder)
                    collapsible_item_div.append(collapsible_header)

                    // Content
                    let collapsible_body = document.createElement('div')
                    collapsible_body.setAttribute('class', 'collapsible-body')

                    collapsible_item.listItems.forEach((item) => {

                        let collapsible_subitem = document.createElement('div')
                        collapsible_subitem.setAttribute('class', 'collapsible-subitem')
                        collapsible_subitem.setAttribute('id', collapsible_item.listCode + '-' + item.code)

                        let subitem_title = document.createElement('div')
                        subitem_title.setAttribute('class', 'collapsible-subitem-title')
                        subitem_title.innerHTML = 'Produto: ' + item.name

                        let subitem_code = document.createElement('div')
                        subitem_code.setAttribute('class', 'collapsible-subitem-code')
                        subitem_code.innerHTML = 'Cod: ' + item.code

                        let subitem_quantity_holder = document.createElement('div')
                        subitem_quantity_holder.setAttribute('class', 'collapsible-subitem-quantity-holder')

                        let quantity_label = document.createElement('div')
                        quantity_label.setAttribute('class', 'collapsible-subitem-quantity-label')
                        quantity_label.innerHTML = 'Quantidade: '

                        let remove_quantity_btn = document.createElement('button')
                        remove_quantity_btn.setAttribute('class', 'collapsible-subitem-remove-quantity-btn')
                        if (disabled)
                            remove_quantity_btn.setAttribute('disabled', disabled)
                        remove_quantity_btn.onclick = function () { removeQuantityToItem('input-' + collapsible_item.listCode + '-' + item.code) }

                        let quantity_input = document.createElement('input')
                        quantity_input.setAttribute('type', 'number')
                        quantity_input.setAttribute('class', 'collapsible-subitem-quantity-input')
                        quantity_input.setAttribute('id', 'input-' + collapsible_item.listCode + '-' + item.code)
                        quantity_input.setAttribute('max', item.maximumQuantity)
                        quantity_input.setAttribute('min', 0)
                        quantity_input.setAttribute('value', 0)
                        if (disabled)
                            quantity_input.setAttribute('disabled', disabled)

                        let add_quantity_btn = document.createElement('button')
                        add_quantity_btn.setAttribute('class', 'collapsible-subitem-add-quantity-btn')
                        if (disabled)
                            add_quantity_btn.setAttribute('disabled', disabled)
                        add_quantity_btn.onclick = function () { addQuantityToItem('input-' + collapsible_item.listCode + '-' + item.code) }

                        subitem_quantity_holder.append(quantity_label)
                        subitem_quantity_holder.append(remove_quantity_btn)
                        subitem_quantity_holder.append(quantity_input)
                        subitem_quantity_holder.append(add_quantity_btn)

                        let subitem_unit_price = document.createElement('div')
                        subitem_unit_price.setAttribute('class', 'collapsible-subitem-unit-price')
                        subitem_unit_price.innerHTML = 'Valor unitário: ' + item.unitPrice

                        collapsible_subitem.append(subitem_title)
                        collapsible_subitem.append(subitem_code)
                        collapsible_subitem.append(subitem_quantity_holder)
                        collapsible_subitem.append(subitem_unit_price)

                        collapsible_body.append(collapsible_subitem)
                    })

                    collapsible_item_div.append(collapsible_body)
                    collapsible_holder.append(collapsible_item_div)
                    let divider = document.createElement('hr')
                    divider.setAttribute('class', 'collapsible-divider')
                    collapsible_holder.append(divider)
                }
            })

            let collapsible_btns_holder = document.createElement('div')
            collapsible_btns_holder.setAttribute('class', 'collapsible-btns-holder')
            let collapsible_cancel_btn = document.createElement('button')
            collapsible_cancel_btn.setAttribute('class', 'collapsible-cancel-btn')
            collapsible_cancel_btn.onclick = cancelCollapsibleOptions
            collapsible_cancel_btn.innerHTML = 'Cancelar'

            let collapsible_addCart_btn = document.createElement('button')
            collapsible_addCart_btn.setAttribute('class', 'collapsible-addCart-btn')
            if (disabledBtn)
                collapsible_addCart_btn.setAttribute('disabled', disabledBtn)
            collapsible_addCart_btn.onclick = addCollapsibleOptions
            collapsible_addCart_btn.innerHTML = 'Incluir itens'

            collapsible_btns_holder.append(collapsible_cancel_btn)
            collapsible_btns_holder.append(collapsible_addCart_btn)

            collapsible_holder.append(collapsible_btns_holder)


            return collapsible_holder

        case "postback_list_button":
            let button_list = document.createElement('div')
            button_list.setAttribute('class', 'quick_reply_btn postback_list_item')
            button_list.setAttribute('quick_reply_type', quick_reply.type)
            button_list.setAttribute('hidden_value', quick_reply.payload.value)
            let message = quick_reply.title + '<br>'
            quick_reply.payload.items.forEach((item) => {
                let date = item.issueDate.split('T')[0].split('-').reverse().join('/')
                message += 'Data do pedido: ' + date + '<br>'
                date = item.expirationDate.split('T')[0].split('-').reverse().join('/')
                message += 'Total: R$ ' + item.openBalance + ' / Venc. ' + date + '<br>'


            })
            button_list.innerHTML = message
            return button_list

        case 'accept-text':
            let accept_div = document.createElement('div')
            accept_div.setAttribute('class', 'accept_text_div')

            let content_div = document.createElement('div')
            content_div.setAttribute('class', 'accept_text_content_div')
            content_div.innerHTML = quick_reply.payload.text

            accept_div.append(content_div)

            let buttons_div = document.createElement('div')
            buttons_div.setAttribute('class', 'accept_text_buttons_div')
            quick_reply.payload.buttons.forEach((button) => {
                let btn_element = document.createElement('button')
                btn_element.setAttribute('class', 'accept_text_button')
                btn_element.innerHTML = button.title
                btn_element.onclick = function () { replyFromButton() }
                buttons_div.append(btn_element)
            })

            accept_div.append(buttons_div)
            return accept_div

        case 'SAC_DATE':
            let dates_div = document.createElement('div')
            dates_div.setAttribute('class', 'dates_div')

            let dates_content = document.createElement('div')
            dates_content.setAttribute('class', 'dates_content_div')
            quick_reply.payload.items.forEach(item => {
                let date_item = document.createElement('div')
                date_item.setAttribute('class', 'date_item')

                let date_label = document.createElement('div')
                date_label.innerHTML = item.title

                let date_input = document.createElement('input')
                date_input.setAttribute('type', 'date')
                date_input.setAttribute('hidden-value', item.key)
                date_input.setAttribute('class', 'date_input')

                date_item.append(date_label)
                date_item.append(date_input)
                dates_content.append(date_item)
            })

            let dates_footer = document.createElement('div')
            dates_footer.setAttribute('class', 'dates_footer_div')
            let dates_continue_btn = document.createElement('button')
            dates_continue_btn.setAttribute('class', 'dates_continue_btn')
            dates_continue_btn.innerHTML = 'Continuar'
            dates_continue_btn.onclick = function () { continueSACDateBtn() }
            let dates_cancel_btn = document.createElement('button')
            dates_cancel_btn.setAttribute('class', 'dates_continue_btn')
            dates_cancel_btn.innerHTML = 'Cancelar'
            dates_cancel_btn.onclick = function () { cancelSACDateBtn() }
            dates_footer.append(dates_cancel_btn)
            dates_footer.append(dates_continue_btn)

            dates_div.append(dates_content)
            dates_div.append(dates_footer)

            return dates_div



        default:
            let button = document.createElement('button')
            button.setAttribute('class', 'quick_reply_btn')
            button.setAttribute('quick_reply_type', quick_reply.type)
            button.setAttribute('hidden_value', quick_reply.payload.value)
            button.innerHTML = quick_reply.title
            return button
    }
}

function continueSACDateBtn() {
    let dates_items = document.getElementsByClassName('date_item')
    let dates_selected = true
    let dates = []
    for (var i = 0; i < dates_items.length; i++) {
        let input = dates_items[i].childNodes[1]
        let label = dates_items[i].childNodes[0].innerHTML
        if (!input.disabled)
            if (!input.value) dates_selected = false
            else {
                dates.push({
                    key: input.getAttribute('hidden-value'),
                    value: input.value,
                    label
                })
            }
    }
    if (dates_selected) {
        disableElementsByClassName('date_input')
        disableElementsByClassName('dates_continue_btn')
        let text = ''
        // dates.forEach(date => text += date.label + ' : ' + date.value + '<br>')
        // displayMessage(text, 'user')
        userMessage('', 'selectSACNotificationDate', dates)
        removeDisableBlock()

    } else {
        alert('Favor selecione as datas.')
    }
}

function cancelSACDateBtn() {
    disableElementsByClassName('date_input')
    disableElementsByClassName('dates_continue_btn')
    displayMessage('Cancelar', 'user')
    userMessage('Cancelar')
    removeDisableBlock()
}

function disableDatesSACInput() {

}

function replyFromButton(event) {
    if (!event) event = window.event
    if (event) {
        let button = event.target
        let text = button.innerHTML
        disableElementsByClassName(button.getAttribute('class'))
        displayMessage(text, 'user')
        userMessage(text)
    }
}

function disableElementsByClassName(className) {
    let elements = document.getElementsByClassName(className)
    for (var i = 0; i < elements.length; i++) {
        if (!elements[i].disabled) elements[i].disabled = true
    }
}

function disableCollapsibleItems() {
    let collapsible_items = document.getElementsByClassName('collapsible-item')
    for (var i = 0; i < collapsible_items.length; i++) {
        let collapsible_item = collapsible_items[i]
        collapsible_item.removeAttribute('id')
        let collapsible_body = collapsible_item.childNodes[1]
        if (collapsible_body)
            collapsible_body.remove()
        let collapsible_header = collapsible_item.childNodes[0]
        let arrow_div = collapsible_header.childNodes[1]
        if (arrow_div)
            arrow_div.remove()
    }

    // remove btns
    let collapsible_btns = document.getElementsByClassName('collapsible-btns-holder')
    for (var i = 0; i < collapsible_btns.length; i++) {
        if (collapsible_btns[i]) collapsible_btns[i].remove()
    }
}

function cancelCollapsibleOptions() {
    disableCollapsibleItems()
    displayMessage('Cancelar', 'user')
    userMessage('Cancelar')
    removeDisableBlock()
}

function addCollapsibleOptions() {
    let subitems = document.getElementsByClassName('collapsible-subitem')
    let min_selected = false
    let selected_items = []

    for (var i = 0; i < subitems.length; i++) {
        let name = subitems[i].childNodes[0].innerHTML
        let input = subitems[i].childNodes[2].childNodes[2]
        if (!input.disabled) {
            min_selected = true
            let quantity = parseInt(input.value)
            if (quantity > 0) {
                let id = input.getAttribute('id')
                let code = id.split('-')[2]
                selected_items.push({
                    code,
                    name,
                    quantity
                })
            }
        }
    }

    if (min_selected && selected_items.length > 0) {
        disableCollapsibleItems()
        showSelectedCollapsibleItems(selected_items)
        removeDisableBlock()
    } else {
        alert('Favor adicione pelo menos um item.')
    }
}

function showSelectedCollapsibleItems(selected_items) {

    let div = document.createElement('div')
    div.setAttribute('class', 'collapsible_reply_div')
    selected_items.forEach((item) => {
        let list_div = document.createElement('div')
        list_div.setAttribute('class', 'collapsible_reply_div_item')
        let list_title = document.createElement('div')
        list_title.innerHTML = item.name + '<br>Qtd: ' + item.quantity + '<br>'
        list_div.append(list_title)
        div.append(list_div)

    })
    displayMessage(div, 'user', 'htmlElement')
    userMessage('', 'selectConditionalSalesItems', selected_items)
}

function collapsibleToggle(collapsible_item_id) {
    let collapsible_item = document.getElementById(collapsible_item_id)
    let open = collapsible_item.getAttribute('open')
    if (collapsible_item) {
        let collapsible_body = collapsible_item.childNodes[1]
        open = open == 'true' ? true : false
        if (open) {
            collapsible_body.style.display = 'none'
        } else {
            collapsible_body.style.display = 'flex'
        }
        collapsible_item.setAttribute('open', !open)
    }
}

function addQuantityToItem(input_id) {
    let input = document.getElementById(input_id)
    let max = input.getAttribute('max')
    if (parseInt(input.value) <= parseInt(max)) {
        input.value = parseInt(input.value) + 1
    }
}

function removeQuantityToItem(input_id) {
    let input = document.getElementById(input_id)
    if (parseInt(input.value) > 0) {
        input.value = parseInt(input.value) - 1
    }
}

function quickRepliesChecklistFinish() {
    let items = document.getElementsByClassName('quick_reply_checklist_item_holder')
    let selected_items = []
    for (var i = 0; i < items.length; i++) {
        let checkbox = items[i].childNodes[0].childNodes[0]
        let label = items[i].childNodes[0].childNodes[1].innerHTML
        let quantity = items[i].childNodes[1].childNodes[1]
        if (!checkbox.disabled && checkbox.checked) {

            if (quantity.value > 0) {
                let hidden_value = checkbox.getAttribute('hidden_value')
                selected_items.push({
                    listCode: parseInt(hidden_value.split('-')[0]),
                    itemCode: parseInt(hidden_value.split('-')[1]),
                    itemName: label,
                    quantity: quantity.value
                })
            } else {
                alert('Favor informe a quantidade do produto : ' + label)
                return
            }
        } else {
            if (!checkbox.checked && quantity.value > 0) {
                alert('Favor selecione o produto: ' + label)
                return
            }
        }

    }

    if (selected_items.length > 0) {
        disableQuickReplyCheckList()
        showUserQuickReplyChecklistMessage(selected_items)
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

function disableQuickReplyCheckList() {
    let items = document.getElementsByClassName('quick_reply_checklist_item_holder')
    for (var i = 0; i < items.length; i++) {
        let checkbox = items[i].childNodes[0].childNodes[0]
        if (!checkbox.disabled) {
            checkbox.disabled = true
            let quantity = items[i].childNodes[1].childNodes[1]
            if (!quantity.disabled) quantity.disabled = true
        }

    }

    let finishButtons = document.getElementsByClassName('quick_reply_checklists_finish_btn')
    for (var k = 0; k < finishButtons.length; k++) {
        if (!finishButtons[k].disabled) finishButtons[k].disabled = true
    }
}
function showUserQuickReplyChecklistMessage(selected_items) {
    let div = document.createElement('div')
    div.setAttribute('class', 'checklists_reply_div')

    selected_items.forEach((item) => {
        let list_div = document.createElement('div')
        list_div.setAttribute('class', 'checklist_reply_div_item')

        let list_title = document.createElement('div')
        // list_title.setAttribute('class', 'checklist_reply_title_div')
        list_title.innerHTML = item.itemName + '<br>Qtd: ' + item.quantity + '<br>'
        list_div.append(list_title)
        div.append(list_div)

    })

    displayMessage(div, 'user', 'htmlElement')
    userMessage('', 'selectConditionalSale', selected_items)
}

function disableQuickReplyCheckLists() {
    var lists_div = document.getElementsByClassName('quick_reply_checklist_header')
    for (var i = 0; i < lists_div.length; i++) {
        let items = lists_div[i].childNodes
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
            acc[curr.listCode] = { title: curr.listTitle, items: [] }
        }
        acc[curr.listCode].items.push({ name: curr.itemName })
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