function QuickReplies(payload, action) {
    let quick_replies = []
    switch (action) {
        case 'businessModels':
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
    }

    return quick_replies
}


function CustomMessage(payload, action) {
    let customMessage = ''
    switch (action) {
        case 'order':
            customMessage = `Pedido ${payload.number}<br><br>`
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
    }
    return customMessage
}


module.exports = {
    QuickReplies,
    CustomMessage
}