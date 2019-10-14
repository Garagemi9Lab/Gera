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

        case 'deliveryOptions':
            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: `${curr.name} <br> ${curr.term} dia(s)`,
                    type: "postback_button",
                    payload: {
                        value: "<code>" + curr.code
                    }
                })
                return acc
            }, [])
            break;

        case 'paymentPlans':
            paymentModes = payload.reduce((acc, curr) => {
                acc[curr.paymentMode.id] = curr.paymentMode.description
                return acc
            }, {})
            quick_replies = Object.keys(paymentModes).reduce((acc, curr) => {
                acc.push({
                    title: `${paymentModes[curr]}`,
                    type: "postback_button",
                    payload: {
                        value: "<code>" + curr
                    }
                })
                return acc
            }, [])

            break;

        case 'showPaymentMode':

            quick_replies = payload.reduce((acc, curr) => {
                acc.push({
                    title: `${curr.name}`,
                    type: "postback_button",
                    payload: {
                        value: "<code>" + curr.code
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

        case "SACQuestionAnswers":
            // tabela || dominio || tabela faixa
            let id = payload.answerType.id
            const noneDefaultTableQuestions = [1]
            if ((id == 4 && noneDefaultTableQuestions.indexOf(payload.questionCode) == -1) || id == 2 || id == 10) {
                quick_replies = [
                    {
                        type: 'table',
                        payload: {
                            columns: payload.possibleValues.columns.map((column) => column.name),
                            rows: payload.possibleValues.rows.map((row, index) => {
                                row.value = '<code>' + index
                                return row
                            }).filter((row) => row.selected == false)
                        }
                    }
                ]
            }

            if (id == 1) {
                if (payload.additionalInfos && payload.additionalInfos.length > 0) {
                    let textLimit = payload.additionalInfos.find((info) => info.id == 2)
                    if (textLimit) {
                        quick_replies.push({
                            type: 'text-limit',
                            value: textLimit.value
                        })
                    }
                }
            }

            if (id == 6) {
                quick_replies.push({
                    type: 'input-data',
                    value: 'DD-MM-YYYY'
                })
            }

            if (id == 4 && payload.questionCode == 1) {
                quick_replies.push({
                    type: 'input-autocomplete',
                    dataType: 'number',
                    autocompleteLimit: 5,
                    data: payload.possibleValues.rows.reduce((acc, row, index) => {
                        acc[row.dataRow[0]] = '<code>' + index
                        return acc
                    }, {})
                })
            }
            if (id == 2) {
                var allowed_options_index = [1]
                quick_replies[0].allowed_options_index = allowed_options_index
            }

            if (id == 10) {
                var allowed_options_index = [2, 4, 8]
                quick_replies[0].allowed_options_index = allowed_options_index
            }
            break;
    }

    return quick_replies
}


function CustomMessage(payload, action) {
    let customMessage = ''
    switch (action) {
        case 'order':
            // origin.id == 2 ( o produto é doação e não é pra venda. ) 
            customMessage = `Pedido ${payload.number} <br> <br>`
            payload.items.forEach(item => {
                customMessage += `Cód: ${item.productCode}<br>
                Nome: ${item.productName}<br>
                Qtd: ${item.quantity}<br>
                Tipo: ${item.origin.description} <br>
                Valor: ${item.origin.id == 2 ? 0 : item.unitMarketValue}<br><hr> 
                `
            })
            if (payload.items.length > 0)
                if (payload.totals && payload.totals.totalProductValueWithoutDiscount)
                    customMessage += 'Total: ' + payload.totals.totalProductValueWithoutDiscount + '<br>'
                else if (payload.businessInformation && payload.businessInformation.netValue)
                    customMessage += 'Total: ' + payload.businessInformation.netValue + '<br>'
            break;
        case 'promotions':
            customMessage = `Promoções: <br> <br>`
            payload.forEach(promotion => {
                customMessage += `${promotion.title} <br>
                Desc.: ${promotion.description}<br>
                Cod.: ${promotion.code}<br><hr>
                `
            })
            break;

        case 'partialPromotions':
            customMessage = '<b>Falta pouco para você ganhar</b> <br><hr>'
            payload.forEach(partialPromotion => {
                customMessage += `${partialPromotion.title} <br>`
                customMessage += `${partialPromotion.description} <br>`
                customMessage += `<br> Falta(m) o(s) item(s) abaixo para conquistar a promoção: <br><br><br>`
                partialPromotion.requirements.forEach((requirement, index) => {
                    let id = requirement.valueType.id
                    // Itens
                    if (id == 1) {
                        if (requirement.productRequired) {
                            customMessage += `Falta(m) ${requirement.missingValue} unidade(s) do ${requirement.description}<br>`
                            customMessage += `Cod.: ${requirement.productRequired.productCode}<br>`
                            customMessage += `Valor: R$ ${requirement.productRequired.unityPrice}<br>`
                        } else {
                            customMessage += `Falta(m) ${requirement.missingValue} ${requirement.description}<br>`
                        }
                    }

                    if (id == 2) {
                        if (requirement.productRequired) {
                            customMessage += `Falta(m) ${requirement.missingValue} ${requirement.description}<br>`
                            customMessage += `Cod.: ${requirement.productRequired.productCode}<br>`
                            customMessage += `Valor: R$ ${requirement.productRequired.points}<br>`
                        } else {
                            customMessage += `Falta(m) ${requirement.missingValue} ${requirement.description}<br>`
                        }
                    }
                    // Preço
                    if (id == 3) {
                        let productStructureRequired = requirement.productStructureRequired
                        customMessage += `Falta(m): <span style="color:green;">R$ ${requirement.missingValue}</span> na linha de produtos ${productStructureRequired.name}`
                    }

                    if (requirement.logicOperator && index < partialPromotion.requirements.length - 1) {
                        customMessage += `<br><b>${requirement.logicOperator.description}</b> <br><br>`
                    } else {
                        customMessage += `<br><hr><br>`
                    }
                })
            })

            break;

        case 'acquiredPromotion':
            customMessage = '<b>Parabéns!! Você ganhou:</b> <hr><br>'
            payload.acquiredPromotion.forEach((acquiredPromotion) => {

                let header = `<b>${acquiredPromotion.title}</b><br>`
                header += `${acquiredPromotion.description}<br>`

                let premiosConquistados = []
                let produtosComDesconto = []
                acquiredPromotion.rewards.forEach(reward => {
                    let id = reward.type.id

                    if (id == 1 || id == 2) {
                        premiosConquistados.push(`<br>Produto: ${reward.productName}<br>Cod.: ${reward.productCode}<br>Qtd: ${reward.quantity}<br>Tipo: ${reward.type.description}<br>`)
                    }
                    if (id == 3 || id == 4) {
                        let item = payload.items.find(item => item.productCode == reward.productCode)
                        produtosComDesconto.push(`<br>Produto: ${reward.productName}<br>Cod.: ${reward.productCode}<br>Qtd: ${reward.quantity}<br>Tipo: Desconto ${Math.ceil(reward.discount.toFixed(2))}%<br>${item ? `Valor: R$ ${item.unitTableValue}<br>A pagar: R$ ${item.unitNetValue}` : ''}`)
                    }

                    // if (id == 4) {
                    // console.log(`Unsupported reward type: id: ${id} desc.: ${reward.type.description}`)
                    // }
                })

                if (premiosConquistados.length > 0 || produtosComDesconto.length > 0) customMessage += header

                if (premiosConquistados.length > 0) {
                    customMessage += `<br><b>Premio(s) conquistado(s):</b><br>`
                    customMessage += premiosConquistados.join('<hr>')
                }

                if (produtosComDesconto.length > 0) {
                    customMessage += `<br><b>Produto(s) com desconto(s):</b><br>`
                    customMessage += produtosComDesconto.join('<hr>')
                }

                if (premiosConquistados.length > 0 || produtosComDesconto.length > 0)
                    customMessage += '<br><hr><hr>'
            })

            break;

        case 'cartTotal':
            customMessage = `<b>${payload.order.paymentPlans.paymentMode.description}</b><br>`
            customMessage += `${payload.order.paymentPlans.name}<br>`
            customMessage += `Parcela(s):<br>`
            customMessage += payload.orderInstallments.map((installment, index) => `<span style="color:green;">Parc.${index + 1}</span> R$ ${installment.value}<br>Venc.: ${getDate(installment.dueDate)}`).join('<br>')
            customMessage += `<br> <hr> <b>Valor a pagar</b><br>`
            customMessage += `Pedido: R$ ${payload.cartTotal.productsValue}<br>`
            customMessage += `Entrega: R$ ${payload.cartTotal.deliveryTax}<br>`
            customMessage += `Taxa Admin.: R$ ${payload.cartTotal.collectionFee}<br>`
            customMessage += `Conta Corrente: R$ ${payload.cartTotal.creditCheckingAccountValue}<br>`
            customMessage += `Imposto e comissão: R$ ${payload.cartTotal.commissionValue}<br>`
            customMessage += `Total: R$ ${payload.cartTotal.totalValue}<br>`
            break;

        case 'gifts':
            customMessage = ''
            payload.forEach(gift => {
                customMessage += `${gift.title} <br> Desc: ${gift.description} <br>`
                if (gift.giftType == 'discount') customMessage += 'Desconto: ' + Math.ceil(gift.discount) + '<br>'
                else if (gift.giftType == 'partialPrice') customMessage += 'Falta(m) R$ ' + gift.missingValue + ' Reais do pedido<br>'
                customMessage += '<hr>'
            })
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
        <span>Valor total: ${(item.mainValue + item.administrativeFee).toFixed(2)}</span>
        <span>Valor corrigido: ${item.parcelValue} , Venc.: ${item.dueDate.split('T')[0].split('-').reverse().join('/')}`)).join('</span><hr>')}
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