var context = {}
var promotionLoaded = false
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
        if (!promotionLoaded && data.context.token && data.context.order) {
            getPromotions(data);
            promotionLoaded = true
        }

        if (data.output && data.output.action) {
            switch (data.output.action) {
                case "show_business_models":
                    displayBusinessModels(data)
                    break;
                case "show_order":
                    displayUserOrder(data)
                    break;
                case "show_product":
                    displayFoundProduct(data)
                    break;
                case "ask_product_quantity":
                    displayFoundProduct(data)
                    break;
                case "show_substitute_products":
                    displayProductSubstitutions(data)
                    break;
                case "show_promotions":
                    displayPromotions(data)
                    break;
                case "show_gifts":
                    displayGifts(data)
                    break;
                case "show_suggestions_products":
                    displaySuggestedProducts(data)
                    break;
                case "show_rewards_to_choose":
                    displayRewardsToChoose(data)
                    break;
                case "show_addresses":
                    displayUserAddresses(data)
                    break;
                case "show_delivery_options":
                    displayDeliveryOptions(data)
                    break;
                case "show_payment_plan":
                    displayPaymentPlans(data)
                    break;
                case "show_installments":
                    displayInstallments(data)
                    break;
                default:
                    displayMessages(data.output.text)
                    break;
            }
        } else {
            displayMessages(data.output.text)
        }

        if (data.output && data.output.quick_replies) {
            displayQuickReplies(data)
        }

        context = data.context;
    }, function (err) {
        removeTyping()
        displayMessage('Um erro ocorreu, tente mais tarde', 'watson');
    });
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

function displayMessages(texts) {
    for (let text in texts) {
        displayMessage(texts[text], 'watson');
    }
}

function displayMessage(message, user) {
    var chatBox = document.getElementById('chatlogs')
    var bubble = createBubble(message, user)
    chatBox.appendChild(bubble)

    chatBox.scrollTop = chatBox.scrollHeight

}

function createBubble(message, user) {
    let userClass = (user == 'watson') ? 'bot' : 'self'
    let userImg = (user === 'watson') ? 'img/bots.png' : 'img/user.svg'
    var bubble = document.createElement('div')
    bubble.setAttribute('class', 'segments')
    bubble.innerHTML = '<dív class="chat top ' + userClass + '">' +
        '<div class="out">' +
        '<div class="user-photo">' +
        '<img  src="' + userImg + '" alt="img"/>' +
        '</div>' +
        '<div>' +
        '<div class="time">' +
        new Date().toLocaleTimeString().substr(0, 5) +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="chat-message">' +
        message
    '</div>' +
        '</div>'
    return bubble
}

function displayFoundProduct(watsonData) {
    displayMessages(watsonData.output.text, 'watson')
    let foundStock = watsonData.context.foundStock
    let message = `${foundStock.productName}<br>
                    Código: ${foundStock.productCode}<br>`
    displayMessage(message, 'watson')
}

function displayBusinessModels(watsonData) {
    displayMessages(watsonData.output.text, 'watson')
    let businessModels = watsonData.context.userPayload.businessModels
    let message = ''
    businessModels.forEach((item) => {
        message += `Nome: ${item.name}`
    })

    displayMessage(message,'watson')

}

function displayUserOrder(watsonData) {
    displayMessages(watsonData.output.text, 'watson')
    let order = watsonData.context.order
    let message = `Pedido ${order.number}<br><br>`;
    order.items.forEach((item) => {
        message += `Cód: ${item.productCode}<br>
                    Nome: ${item.productName}<br>
                    Qtd: ${item.quantity}<br>
                    Valor: ${item.unitMarketValue}<br><hr>
                    `
    })
    if (order.items.length > 0) {
        message += 'Total: ' + order.businessInformation.marketValue + '<br>'
        displayMessage(message, 'watson')
    }
}

function displayQuickReplies(watsonData) {
    let quick_replies = watsonData.output.quick_replies
    let buttons = []
    quick_replies.forEach((quick_reply) => {
        if (quick_reply.type == 'text') displayMessage(quick_reply.value, 'watson')
        else if (quick_reply.type == 'button') buttons.push('<button class="quick_reply_btn" >' + quick_reply.value + '</button>')
    })

    if (buttons.length > 0) {
        let message = '<div class="quick_replies_div">'
        message += buttons.join('')
        message += '</div>'
        displayMessage(message, 'watson')
        addClickListenerEvent('quick_reply_btn')
    }
}

function displaySuggestedProducts(watsonData) {
    if (watsonData.output.text.length > 0) displayMessages(watsonData.output.text, 'watson')
    const products = watsonData.context.suggestionsProducts[0].purchaseSuggestionDetails
    let message = ''
    products.forEach((product) => {
        message += 'Nome: ' + product.productName + '<br>Cód: ' + product.productCode + '<br>Msg: ' + product.collectionMessage + '<br>Qtd sugerida: ' + product.suggestedQuantity + '<br>Pontos: ' + product.unitPointsQuantity + '<br>Valor: ' + product.unitValue + '<br><hr>'
    })

    displayMessage(message, 'watson')
}

function displayGifts(watsonData) {
    if (watsonData.output.text.length > 0) displayMessages(watsonData.output.text, 'watson')
    const gifts = watsonData.context.gifts
    let message = ''
    gifts.forEach((gift) => {
        message += gift.title + '<br>' + gift.description + '<br>'
        if (gift.giftType == 'discount') message += 'Desconto: ' + Math.ceil(gift.discount) + '<br>'
        else if (gift.giftType == 'partialPrice') message += 'Falta(m) R$ ' + gift.missingValue + ' Reais do pedido<br>'
        message += '<hr>'
    })

    displayMessage(message, 'watson')
}

function displayPromotions(watsonData) {
    const promotions = watsonData.context.promotions
    let message = ''
    if (promotions.length > 1) displayMessages(watsonData.output.plural_msg)
    else displayMessages(watsonData.output.singular_msg)

    for (let i in promotions) {
        message += 'titulo: ' + promotions[i].title + '<br>Descrição:' + promotions[i].description + '<br><hr>'
    }
    displayMessage(message, 'watson')
}

function displayUserAddresses(watsonData) {
    if (watsonData.output.text) displayMessages(watsonData.output.text, 'watson')
    const addresses = watsonData.context.addresses
    let message = ''
    addresses.forEach((address, index) => {
        message += (index + 1) + ' - ' + address.formattedAddress + '<br><hr>'
    })
    displayMessage(message, 'watson')
}

function displayDeliveryOptions(watsonData) {
    if (watsonData.output.text) displayMessages(watsonData.output.text, 'watson')
    const deliveryOptions = watsonData.context.deliveryOptions
    let message = ''
    deliveryOptions.forEach((deliveryOption, index) => {
        const value = deliveryOption.value > 0 ? deliveryOption.value : 'Gratis'
        message += (index + 1) + ' - ' + deliveryOption.name + '<br>Valor: ' + value + '<br><hr>'
    })
    displayMessage(message, 'watson')
}

function displayPaymentPlans(watsonData) {
    if (watsonData.output.text) displayMessages(watsonData.output.text, 'watson')
    const paymentPlans = watsonData.context.paymentPlans
    let message = ''
    paymentPlans.forEach((plan, index) => {
        if (plan.paymentMode.id == 1) {
            message += (index + 1) + ' - ' + plan.paymentMode.description + ' : ' + plan.name + '<br><hr>'
        }
    })
    displayMessage(message, 'watson')
}

function displayProductSubstitutions(watsonData) {
    if (watsonData.output.text) displayMessages(watsonData.output.text, 'watson')
    const substitutions = watsonData.context.substitutions
    let message = ''
    substitutions.forEach((item) => {
        message += 'Nome: ' + item.productName + '<br>Cod: ' + item.productCode + '<br>Desc: ' + item.productDescription + '<br>Valor: ' + item.unityPrice + '<br><hr>'
    })
    displayMessage(message, 'watson')

}

function displayRewardsToChoose(watsonData) {
    if (watsonData.output.text) displayMessages(watsonData.output.text, 'watson')
    const rewardsToChoosePromotions = watsonData.context.order.rewardsToChoosePromotions[0]
    let message = ''
    rewardsToChoosePromotions.productsToChoose.forEach((element) => {
        message += 'Nome: ' + element.productName + '<br>Cod: ' + element.productCode + '<br>Desc: ' + element.productDescription + '<br><hr>'
    })
    displayMessage(message, 'watson')
}

function displayInstallments(watsonData) {
    if (watsonData.output.text) displayMessages(watsonData.output.text, 'watson')
    const installments = watsonData.context.installments
    let message = ''
    installments.forEach((element) => {
        message += 'Parc.: ' + element.number + '<br>Valor: ' + element.value + '<br>Venc.: ' + element.dueDate.split('T')[0].split('-').reverse().join('/') + '<br><hr>'
    })
    displayMessage(message, 'watson')
}

function onQuickReplyClick(e) {
    // Remove quick replies bubble.
    let bubble = e.target.parentElement.parentElement.parentElement.parentElement
    let text = e.target.innerHTML
    bubble.parentElement.removeChild(bubble)
    displayMessage(text, 'user')
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
    var bubble = createBubble(message, 'watson')
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