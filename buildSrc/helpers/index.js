function QuickReplies(payload, action) {
    let quick_replies = []
    switch (action) {
        case 'businessModels':
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: getBusinessModelNameByCode(curr),
                    type: 'postback_button',
                    payload: {
                        value: '<code>' + curr.code
                    }
                })
                return acc
            }, [])
            break;

        case 'deliveryModes':
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: curr.address,
                    type: 'postback_button',
                    payload: {
                        value: '<code>' + curr.code
                    }
                })
                return acc
            }, [])
            break;

        case 'cycles':
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: curr.number.toString().substring(4) + '/' + curr.number.toString().substring(0, 4),
                    type: 'postback_button',
                    payload: {
                        value: '<code>' + curr.number
                    }
                })
                return acc
            }, [])
            break;
        case "starterKits":
            quick_replies = [
                {
                    type: 'checklists',
                    payload: {
                        lists: payload.reduce((acc, curr) => {
                            acc.push({
                                title: `${curr.sourceInfo.description}`,
                                checkable: false,
                                type: 'checklist',
                                payload: {
                                    listCode: curr.code,
                                    listItems: curr.products.map(product => ({ code: product.code, name: product.name, checkable: true }))
                                }
                            })
                            return acc
                        }, [])
                    }
                }
            ]
            break;

        case "conditionalSales":
            quick_replies = [
                {
                    type: 'Collapsible-list',
                    payload: payload.reduce((acc, curr) => {
                        acc.push({
                            title: curr.conditionalSaleName,
                            status: `${curr.liberatedCondition ? 'Liberado' : `Falta ${curr.conditionalSaleType.id == 1 ? 'R$' : ''} ${curr.valueMissingRelease} ${curr.conditionalSaleType.id == 3 ? `produto${curr.valueMissingRelease > 1 ? 's' : ''}` : ''}`}`,
                            enabled: curr.liberatedCondition,
                            listCode: curr.conditionalSaleCode,
                            type: 'Collapsible-item',
                            listItems: curr.conditionalSaleItems.map((saleItem) => ({
                                code: saleItem.productCode,
                                name: saleItem.productName,
                                maximumQuantity: saleItem.maximumQuantity,
                                unitPrice: saleItem.unitPrice,
                                unitPoints: saleItem.unitPoints,
                                enabled: curr.liberatedCondition
                            }))
                        })
                        return acc
                    }, [])
                }
            ]
            break;

        case "addresses":
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: curr.formattedAddress,
                    type: "postback_button",
                    payload: {
                        value: "<code>" + curr.type.id
                    }
                })
                return acc
            }, [])
            break;

        case "installments":
            quick_replies = Object.keys(payload).reduce((acc, curr) => {
                acc.push({
                    title: getInstallmentsText(payload[curr]),
                    type: 'postback_list_button',
                    payload: {
                        value: `<code>${curr}`
                    }
                })
                return acc
            }, [])
            break;

        case "renegotiationPaymentPlans":
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: getRenegotiationDescriptionByCode(curr),
                    type: 'postback_button',
                    payload: {
                        value: `<code>${curr.code}`
                    }
                })
                return acc
            }, [])
            break;

        case "simulatedInstallments":
            quick_replies = [
                {
                    type: 'accept-text',
                    payload: {
                        text: getSimulatedInstallmentsText(payload),
                        buttons: [
                            {
                                title: 'Cancelar',
                                payload: {
                                    value: 'Cancelar'
                                }
                            },
                            {
                                title: 'Renegociar',
                                payload: {
                                    value: 'Renegociar'
                                }
                            }
                        ]
                    }
                }
            ]
            break;

        case "notificationStructuresParents":
            quick_replies = payload.reduce((acc, curr) => {
                if (curr.levelCode == 1) {
                    acc.push({
                        title: curr.name,
                        type: 'postback_button',
                        payload: {
                            value: '<code>' + curr.code
                        }
                    })
                }
                return acc
            }, [])
            break;

        case "selectedNotificationParent":
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: curr.name,
                    type: 'postback_button',
                    payload: {
                        value: '<code>' + curr.code
                    }
                })
                return acc
            }, [])
            break;

        case "selectedNotificationsLeaf":
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: curr.name,
                    type: 'postback_button',
                    payload: {
                        value: '<code>' + curr.code
                    }
                })
                return acc
            }, [])
            break;

        case "SACNotifications":
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    // title: `${curr.notificationStructure.description.split('/')[curr.notificationStructure.description.split('/').length - 1]}<br>aberto em: ${curr.notificationDate.split('T')[0].split('-').reverse().join('/')} as ${curr.notificationDate.split('T')[1].split('.')[0]}`,
                    title: `${curr.notificationStructure.description.split('/')[curr.notificationStructure.description.split('/').length - 1]}<br>aberto em: ${curr.notificationDate.split('T')[0].split('-').reverse().join('/')}<br>status: ${curr.notificationStatus.description}`,
                    type: 'postback_button',
                    payload: {
                        value: '<code>' + curr.notificationId
                    }
                })
                return acc
            }, [])

            break;

    }

    return quick_replies
}


function CustomMessage(payload, action) {
    let customMessage = ''
    switch (action) {
        case 'order':
            customMessage = `Pedido ${payload.number} <br> <br>`
            payload.items.forEach(item => {
                customMessage += `Cód: ${item.productCode}<br>
                Nome: ${item.productName}<br>
                Qtd: ${item.quantity}<br>
                Valor: ${item.unitMarketValue}<br><hr>
                `
            })
            if (payload.items.length > 0)
                customMessage += 'Total: ' + payload.businessInformation.marketValue + '<br>'
            break;
        case 'substitutions':
            payload.forEach((item) => {
                customMessage += `Nome: ${item.productName} <br>Cod: ${item.productCode}<br>Desc: ${item.productDescription}<br>Valor: ${item.unityPrice}<br><hr>`
            })
            break;

        case 'suggestionsProducts':
            //message += 'Nome: ' + product.productName + '<br>Cód: ' + product.productCode + '<br>Msg: ' + product.collectionMessage + '<br>Qtd sugerida: ' + product.suggestedQuantity + '<br>Pontos: ' + product.unitPointsQuantity + '<br>Valor: ' + product.unitValue + '<br><hr>'
            break;

        case 'conditionalSales':
            customMessage = ''
            payload.forEach(conditionalSale => {
                customMessage = `${conditionalSale.conditionalSaleName}`
                if (payload.valueMissingRelease > 0) {
                    customMessage = `Faltam R$ ${conditionalSale.valueMissingRelease}<br>${customMessage}<hr>`
                    // payload.conditionalSaleItems.forEach(item => {
                    // customMessage += `${item.productName}<br>Cod: ${item.productCode}<br>Valor: ${item.unitPrice}`
                    // })
                }
            })
            break;
        case 'notificationDetails':
            customMessage = `
            <span>${payload.peopleName}</span><br>
            <span>${payload.notificationStructure.description}</span><br>
            `
            break;
    }
    return customMessage
}

function getBusinessModelNameByCode(businessModel) {
    switch (businessModel.code) {
        case 33:
            return 'Resgate Baú – cliente / CJ'
        default:
            return businessModel.name
    }
}

function getInstallmentsText(installment) {
    let total = 0
    return `Pedido: ${installment[0].orderingNumber}<br>
            Data do pedido: ${getDate(installment[0].issueDate)}<br>
            Qtde parcelas em atraso: ${installment.length}<br>
            ${installment.map((item, index) => {
        total += item.openBalance
        return `${installment.length == 1 ? 'Parc. única:' : `Parc. ${index + 1}`} : R$ ${item.openBalance} / Venc. ${getDate(item.dueDate)}`
    }).join('<br>')
        }
            <br>Total: R$  ${total.toFixed(2)}

    `
}

function getDate(dateString) {
    return dateString.split('T')[0].split('-').reverse().join('/')
}

function getSimulatedInstallmentsText(payload) {
    return `${payload['installments'].map(item => (
        `<span>${payload['installments'].length == 1 ? 'Parc. única' : `${item.parcelNumber}ª Parc.:`}</span>
        <span>Valor : ${item.parcelValue} , Venc.: ${item.dueDate.split('T')[0].split('-').reverse().join('/')}`)).join('</span><hr>')}
        <br>
        <hr>
        ${payload['discount'] && payload['discount'] > 0 ?
            `<span>Desconto: ${payload['discount']}</span>` :
            ''}
        <br>`
}

function getRenegotiationDescriptionByCode(item) {
    switch (item.code) {
        case 3:
            return 'Renegociação: Parcela única para 30 dias.'
        case 26:
            return 'Renegociação: inadimplentes (15 e 45 dias).'
        case 27:
            return 'Renegociação à vista.'
        case 28:
            return 'Renegociação: 15 - 30 – 45 dias.'
        case 55:
            return 'Renegociação em 4 Parcelas.'
        case 56:
            return 'Renegociação em 5 Parcelas.'
        case 57:
            return 'Renegociação em 6 Parcelas.'
        case 58:
            return 'Renegociação em 7 Parcelas.'
        case 59:
            return 'Renegociação em 8 Parcelas.'
        case 60:
            return 'Renegociação em 9 Parcelas.'
        case 61:
            return 'Renegociação em 10 Parcelas.'
        case 62:
            return 'Renegociação em 11 Parcelas.'
        case 63:
            return 'Renegociação em 12 Parcelas.'

        default:
            return item.description
    }
}


module.exports = {
    QuickReplies,
    CustomMessage
}