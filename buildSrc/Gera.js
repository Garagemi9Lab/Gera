const URL = process.env.ENV_URL
const request = require('request')

const getToken = (user) => {
    console.log('Get token method invoked..')
    return new Promise((resolve, reject) => {

        const formData = {
            client_id: 'HtmlCart',
            client_secret: '8SHEQN9BLVPFQXEIYJZ5GH1MZXYDO2BKND8QZILA',
            username: user.username.toString(),
            password: user.password.toString(),
            grant_type: 'password'
        }
        const options = {
            method: 'POST',
            url: `${process.env.ENV_TOKEN_URL}/api/token`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: formData
        }

        console.log(JSON.stringify(options, null, 2))

        request(options, (error, response, body) => {
            console.log(body)
            try {
                body = JSON.parse(body)

                if (!error && response.statusCode === 200) {
                    resolve({ access_token: body.access_token, user_id: body.user_id })
                } else {
                    reject(body)
                }
            } catch (err) {
                console.log(err)
                reject({ error: "EXPIRED_SESSION" })
            }
        })

    })
}

const checkUserOrders = (watsonData) => {
    console.log('Check user orders method invoked')
    return new Promise((resolve, reject) => {
        // Fixed data to be changed to dinamic 
        const retrievedOrder = {
            representativeCode: watsonData.context.user.id,
            collectionSystem: process.env.COLLECTION_SYSTEM,
            collectionMode: process.env.COLLECTION_MODE,
            originSystem: process.env.ORIGIN_SYSTEM
        }

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/retrieved`,
            headers: {
                "authorization": `Bearer ${watsonData.context.token}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(retrievedOrder)
        }

        request(options, (error, response, body) => {
            if (!error && response.statusCode == 201) {
                body = JSON.parse(body)
                if (body.items.length > 0)
                    resolve({ hasOrders: true, order: body })
                else resolve({ newOrder: true, order: body })
            } else if (!error && response.statusCode === 204) {
                createNewOrder(watsonData).then((result) => {
                    resolve({ newOrder: true, order: result })
                }).catch((error) => {
                    console.log(error)
                })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}

const checkStock = (watsonData) => {
    console.log('Check stock method invoked..')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/Products/${watsonData.output.productCode}/stock?cycle=${watsonData.context.order.businessInformation.marketingCycle}&sellerCode=${watsonData.context.user.id}&functionCode=1&businessModelCode=${watsonData.context.order.businessInformation.businessModelCode}&distributionCenterCode=${watsonData.context.order.businessInformation.distributionCenterCode}`,
            headers: {
                "authorization": `Bearer ${watsonData.context.token}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        }

        request(options, (error, response, body) => {
            console.log('TYPEOF: ')
            console.log(typeof body)
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ productFound: true, foundStock: body })
            } else if (!error && response.statusCode === 404) {
                resolve({ productFound: false })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                console.log('Error on check Stock');
                console.log(body)
                reject({ error })
            }
        })
    })
}

const getProductToAdd = (watsonData) => {
    console.log('Get product to add method invoked..')
    return new Promise((resolve, reject) => {
        checkStock(watsonData).then((data) => {
            if (data.productFound) {
                resolve(data)
            } else {
                resolve(data)
            }
        })
    })
}

const addProduct = (watsonData) => {
    console.log('Add product method invoked..')
    return new Promise((resolve, reject) => {
        console.log()
        const newItem = [
            {
                "productCode": `${watsonData.context.foundStock.productCode}`,
                "productCodeSent": true,
                "quantity": watsonData.output.quantity,
                "quantitySent": true,
                "itemToChooseCode": 0,
                "origin": 0,
                "number": 0,
                "confirmedAssociatedItemDeletion": false,
                "cutProductCode": 0,
                "cutProductQuantity": 0
            }
        ]
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${watsonData.context.order.number}/items`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ productAdded: true, order: body })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                console.log(JSON.stringify(body))
                console.log('Error on adding product to cart')
                checkProductReplacement(watsonData).then((result) => {
                    resolve(result)
                })
            }
        })
    })
}
const checkProductCode = (watsonData) => {
    console.log('Check product code method invoked..')
    return new Promise((resolve, reject) => {
        const editProductCode = watsonData.context.editProductCode
        const product = watsonData.context.order.items.filter((item) => {
            console.log(item.productCode)
            console.log(editProductCode)
            return item.productCode === editProductCode
        })[0] || null

        console.log(product)

        if (product) {
            resolve({ valideProductCode: true })
        } else {
            resolve({ valideProductCode: false })
        }
    })
}



const checkProductCodeRemove = (watsonData) => {
    console.log('Check product code method invoked..')
    return new Promise((resolve, reject) => {
        const removeProductCode = watsonData.context.removeProductCode
        const product = watsonData.context.order.items.filter((item) => {
            return item.productCode === removeProductCode
        })[0] || null

        console.log(product)

        if (product) {
            resolve({ valideProductCode: true })
        } else {
            resolve({ valideProductCode: false })
        }
    })
}

const editProduct = (watsonData) => {
    console.log('Edit product method invoked..')
    return new Promise((resolve, reject) => {

        const productCode = watsonData.output.productCode
        const quantity = watsonData.output.quantity
        const product = watsonData.context.order.items.filter((item) => {
            return item.productCode === productCode
        })[0] || null

        const newItem = [
            {
                "productCode": `${productCode}`,
                "productCodeSent": true,
                "quantity": quantity,
                "quantitySent": true,
                "itemToChooseCode": 0,
                "origin": product.origin.id,
                "number": product.number,
                "confirmedAssociatedItemDeletion": false,
                "cutProductCode": 0,
                "cutProductQuantity": 0
            }
        ]
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${watsonData.context.order.number}/items?eventChangeQuantity%5B%5D=replaceQuantity`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ productEdited: true, order: body })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                console.log('Error on editing the product')
                console.log(error)
            }
        })
    })
}

const removeProduct = (watsonData) => {
    console.log('Remove product method invoked..')
    return new Promise((resolve, reject) => {

        const productCode = watsonData.output.productCode

        const product = watsonData.context.order.items.filter((item) => {
            return item.productCode === productCode
        })[0] || null

        const newItem = [
            {
                "productCode": `${productCode}`,
                "productCodeSent": true,
                "quantity": 0,
                "quantitySent": true,
                "itemToChooseCode": 0,
                "origin": product.origin.id,
                "number": product.number,
                "confirmedAssociatedItemDeletion": false,
                "cutProductCode": 0,
                "cutProductQuantity": 0
            }
        ]
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${watsonData.context.order.number}/items?eventChangeQuantity%5B%5D=replaceQuantity`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            console.log(body)
            if (!error && response.statusCode === 200) {
                resolve({ productRemoved: true, order: body })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                console.log('Error on editing the product')
                console.log(error)
            }
        })
    })
}

const checkProductReplacement = (watsonData) => {
    console.log('Check product replacement method invoked..')
    return new Promise((resolve, reject) => {
        const productCode = watsonData.context.foundStock.productCode
        checkOrderState(watsonData).then((orderState) => {
            const cutItems = orderState.cutItems
            if (cutItems.length > 0) {
                const cutItem = cutItems.filter((item) => { return item.productCode === productCode && item.cutReason.id == 5 })[0] || null
                if (cutItem) {
                    checkProductSubstitute(watsonData).then((result) => {
                        resolve(result)
                    })
                } else {
                    console.log('CutItem is null after filtering it..')
                }
            } else {
                console.log('Check Product replacement cut items length = 0')
            }
        })
    })
}

const checkProductSubstitute = (watsonData) => {
    console.log('Check product substitute method invoked..')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${watsonData.context.order.number}/replacementProducts/${watsonData.context.foundStock.productCode}`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ hasSubstitutes: true, substitutions: body })
            } else if (response.statusCode === 404) {
                console.log(JSON.stringify(body, null, 2))
                resolve({ hasSubstitutes: false })
            } else {
                console.log('Error on checking product substitute')
            }
        })
    })
}


const createNewOrder = (watsonData) => {
    console.log('Creating a new Order method invoked..')
    return new Promise((resolve, reject) => {
        getBusinessModels(watsonData).then((result) => {
            console.log('got business models')
            watsonData.context.user.businessModel = result
            getBusinessModelDeliveryMode(watsonData).then((result) => {
                console.log('Got business model delivery mode')
                watsonData.context.user.businessModel.deliveryMode = result
                getSellerData(watsonData).then((result) => {
                    console.log('Got seller info')
                    watsonData.context.user = Object.assign({}, watsonData.context.user, result)
                    let user = watsonData.context.user
                    // Create Order!
                    const order = {
                        "representativeCode": user.code,
                        "businessModelCode": user.businessModel.code,
                        "collectionMode": 5,
                        "collectionSystem": 3,
                        "isWithdrawalCenter": user.businessModel.deliveryMode.isWithdrawalCenter,
                        "originSystem": 3
                    }
                    const options = {
                        method: 'POST',
                        url: `${URL}/api/orders`,
                        headers: {
                            'Authorization': `Bearer ${watsonData.context.token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(order)
                    }
                    request(options, (error, response, body) => {
                        body = JSON.parse(body)
                        if (!error && response.statusCode === 201) {
                            console.log(`Order created successfully with number ${body.number}`)
                            resolve(body)
                        } else {
                            console.log('Error on creating order')
                            reject({ err: body })
                        }
                    })
                })
            })
        })
    })
}

const getBusinessModels = (watsonData) => {
    console.log('Get business models method invoked..')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/sellers/${watsonData.context.user.id}/businessModels?orderingSystemCode=3&functionCode%5B%5D=1&functionCode%5B%5D=2&functionCode%5B%5D=9&applicationCode=2&momentControlCenter=1&associationAccountType%5B%5D=2&associationAccountType%5B%5D=3&businessModelCode=`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve(body[0])
            } else {
                console.log('Error in getting business models')
                reject({ err: body })
            }
        })
    })
}

const getBusinessModelDeliveryMode = (watsonData) => {
    console.log('Get business model delivery mode method invoked..')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/sellers/${watsonData.context.user.id}/businessModels/${watsonData.context.user.businessModel.code}/deliveryMode`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve(body[0])
            } else {
                console.log('Error in getting business model delivery mode')
                reject({ err: body })
            }
        })
    })
}

const getSellerData = (watsonData) => {
    console.log('Get seller data method invoked..')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/sellers/${watsonData.context.user.id}?businessModelCode=${watsonData.context.user.businessModel.code}`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve(body)
            } else {
                console.log('Error in getting seller data')
                reject({ err: body })
            }
        })
    })
}

const deleteOrder = (watsonData) => {
    console.log('Delete order method invoked..')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'DELETE',
            url: `${URL}/api/orders/${watsonData.context.order.number}`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                resolve({ orderDeleted: true })
            } else {
                console.log('Error on deleting the order')
                reject({ err: error })
            }
        })
    })
}

const checkOrderState = (watsonData) => {
    console.log('Check order state method invoked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/state`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            console.log(JSON.stringify(body, null, 2))
            if (!error && response.statusCode == 200) {
                resolve(body)
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                reject({ err: body })
            }
        })
    })
}

const checkSuggestions = (watsonData) => {
    console.log('Check suggestions method inovked..')
    return new Promise((resolve, reject) => {
        let orderNumber = watsonData.context.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/purchaseSuggestion?showModelsBeginColection=false&showModelsDuringColection=false&showModelsPromotionApplication=true`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application.json'
            }
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                if (body.length == 0) {
                    resolve({ hasSuggestions: false })
                } else {
                    resolve({ hasSuggestions: true, suggestionsProducts: body })
                }
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else if (response.statusCode == 404) {
                resolve({ hasSuggestions: false })
            } else {
                console.log(body)
                reject({ err: body })
            }
        })

    })
}

const checkPromotions = (watsonData) => {
    console.log('Check promotions method inovked..')
    return new Promise((resolve, reject) => {

        const orderNumber = watsonData.context.order.number

        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/promotions`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application.json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ hasPromotions: true, promotions: body })
            } else if (response.statusCode === 205) {
                resolve({ hasPromotions: false })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                reject({ err: body })
            }
        })
    })
}

const reserverOrder = (watsonData) => {
    console.log('Reserve order method inovked..')
    return new Promise((resolve, reject) => {
        let orderNumber = watsonData.context.order.number
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/reserve`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ orderReserved: true, order: body })
            } else if (!error && response.statusCode === 205) {
                resolve({ orderReserved: true, order: body })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                console.log('Error on reserve order')
                console.log(JSON.stringify(body))
            }
        })
    })
}

const checkGifts = (watsonData) => {
    console.log('Check gifts method inovked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const giftsBody = {
            "simulatedPromotion": false,
            "applicationMomentId": 1
        }
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/promotions`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(giftsBody)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                let gifts = []
                checkAcquiredPromotion(body, gifts).then((gifts) => {
                    checkPartialPromotions(body, gifts).then((gifts) => {
                        console.log(JSON.stringify(gifts, null, 2))
                        let hasPromostionsToChoose = false
                        if (body.rewardsToChoosePromotions.length > 0) hasPromostionsToChoose = true
                        if (gifts.length > 0) resolve({ hasGifts: true, gifts, hasPromostionsToChoose, order: body })
                        else resolve({ hasGifts: false, hasPromostionsToChoose, order: body })
                    })
                })
            } else {
                reject({ err: body })
            }
        })

    })
}

const checkAcquiredPromotion = (data, gifts) => {
    console.log('Check acquired promotion method invoked..')
    return new Promise((resolve, reject) => {
        if (data.acquiredPromotion.length > 0) {
            data.acquiredPromotion.forEach(element => {
                let promotion = {
                    title: element.title,
                    description: element.description,
                    giftType: 'reward'
                }
                if (element.rewards.length > 0) {
                    if (element.rewards[0].type.id == 3) {
                        promotion.giftType = 'discount'
                        promotion.discount = element.rewards[0].discount
                    }
                }
                gifts.push(promotion)
            });
        }
        resolve(gifts)
    })
}

const checkPartialPromotions = (data, gifts) => {
    console.log('Check partial promotions method invoked..')
    return new Promise((resolve, reject) => {
        if (data.partialPromotions.length > 0) {
            data.partialPromotions.forEach((element) => {
                let promotion = {
                    title: element.title,
                    description: element.description,
                    giftType: 'partial'
                }
                if (element.requirements.length > 0) {
                    if (element.requirements[0].valueType.id == 3) {
                        promotion.missingValue = element.requirements[0].missingValue
                        promotion.giftType = 'partialPrice'
                    }
                }
                gifts.push(promotion)
            })
        }
        resolve(gifts)
    })
}

const checkAddresses = (watsonData) => {
    console.log('Check addresses method inovked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/deliveryAddresses`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode == 200) {
                if (body.length > 0) {
                    resolve({ hasAddresses: true, addresses: body })
                } else {
                    console.log('There is no addressess registered!')
                }
            } else {
                reject({ err: body })
            }
        })
    })
}

const selectAddress = (watsonData) => {
    console.log('Select address method inovked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const selectedAddressIndex = watsonData.output.selectedAddress
        const address = watsonData.context.addresses[selectedAddressIndex - 1]
        const body = {
            "peopleCode": address.people.code,
            "addressTypeId": address.type.id,
            "isWithdrawalCenter": false,
            "isSupportCenter": false
        }

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/deliveryAddresses`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ addressSelected: true, order: body })
            } else {
                console.log('Error on selecting address!')
                reject({ err: body })
            }
        })
    })
}

const checkDeliveryOptions = (watsonData) => {
    console.log('Check delivery options method inovked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/deliveryOptions`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ deliveryOptions: body })
            } else {
                reject({ err: body })
            }
        })
    })
}

const selectDeliveryOption = (watsonData) => {
    console.log('Select delivery option method inovked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const deliveryCode = watsonData.output.deliveryOptionIndex
        const deliveryOption = {
            deliveryOptionCode: watsonData.context.deliveryOptions[deliveryCode - 1].code
        }

        console.log('Delivery option code: ' + deliveryOption.deliveryOptionCode)
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/deliveryOptions`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(deliveryOption)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ deliveryOptionSelected: true, order: body })
            } else {
                reject({ err: body })
            }
        })

    })
}

const checkPaymentList = (watsonData) => {
    console.log('Check payment list method inovked..')
    return new Promise((resolve, reject) => {

        const orderNumber = watsonData.context.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/paymentPlans`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ hasPaymentPlans: true, paymentPlans: body })
            } else {
                reject({ err: body })
            }
        })
    })
}

const selectPaymentPlan = (watsonData) => {
    console.log('Select payment plan method invoked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const planIndex = watsonData.output.planIndex
        const paymentPlan = watsonData.context.paymentPlans[planIndex - 1] || null
        if (planIndex > 0 && planIndex <= watsonData.context.paymentPlans.length && paymentPlan && paymentPlan.paymentMode.id == 1) {
            const body = {
                "paymentPlanCode": paymentPlan.code,
                "paymentModeId": paymentPlan.paymentMode.id,
                "installmentsQuantity": 1
            }

            const options = {
                method: 'POST',
                url: `${URL}/api/orders/${orderNumber}/paymentPlans`,
                headers: {
                    'Authorization': `Bearer ${watsonData.context.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(body)
            }
            request(options, (error, response, body) => {
                body = JSON.parse(body)
                if (!error && response.statusCode === 200) {
                    resolve({ planSelected: true, order: body })
                } else {
                    resolve({ planSelected: false })
                }
            })
        } else {
            resolve({ planSelected: false, indexPlanError: true })
        }
    })
}

const checkInstallments = (watsonData) => {
    console.log('Check installments method invoked..')
    return new Promise((resolve, reject) => {
        const paymentPlan = watsonData.context.order.paymentPlans
        const orderNumber = watsonData.context.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/installments?paymentPlanCode=${paymentPlan.code}&paymentModeId=${paymentPlan.paymentMode.id}&installmentsQuantity=1`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ installmentsChecked: true, installments: body })
            } else {
                resolve({ installmentsChecked: false })
            }
        })
    })
}

const getTotal = (watsonData) => {
    console.log('Get Cart TOTAL method invoked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/totals?collectionSystem=3`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ gotCartTotal: true, cartTotal: body })
            } else {
                resolve({ gotCartTotal: false })
            }
        })
    })
}

const selectGift = (watsonData) => {
    console.log('Select gift method invoked..')
    return new Promise((resolve, reject) => {
        const orderNumber = watsonData.context.order.number
        const giftNumber = watsonData.context.order.rewardsToChoosePromotions[0].giftNumber
        const giftItemNumber = watsonData.context.order.rewardsToChoosePromotions[0].giftItemNumber
        const selectedProduct = watsonData.output.productCode
        const selectedQuantity = watsonData.output.quantity


        let body = {
            "discount": false,
            "rewardOptionProduct": watsonData.context.order.rewardsToChoosePromotions[0].productsToChoose.map((product) => {
                let quantity = 0
                if (product.productCode === selectedProduct) quantity = selectedQuantity
                return { productCode: product.productCode, quantity }
            })
        }

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/promotions/${watsonData.context.order.rewardsToChoosePromotions[0].code}/rewards/${giftNumber}/${giftItemNumber}`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ selectedGift: true })
            } else {
                resolve({ selectedGift: false, giftErrorMessage: body[0].message })
            }
        })

    })
}

const closeCart = (watsonData) => {
    console.log('Close Cart method invoked..')
    return new Promise((resolve, reject) => {

        const orderNumber = watsonData.context.order.number

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/closed`,
            headers: {
                'Authorization': `Bearer ${watsonData.context.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve({ orderClosed: true, order: body })
            } else {
                resolve({ orderClosed: false })
            }
        })
    })
}

module.exports = {
    checkUserOrders,
    checkStock,
    getProductToAdd,
    addProduct,
    checkOrderState,
    checkSuggestions,
    checkPromotions,
    reserverOrder,
    checkGifts,
    checkAddresses,
    selectAddress,
    checkDeliveryOptions,
    getToken,
    selectDeliveryOption,
    checkPaymentList,
    deleteOrder,
    selectGift,
    editProduct,
    checkProductCode,
    selectPaymentPlan,
    createNewOrder,
    checkInstallments,
    getTotal,
    closeCart,
    removeProduct,
    checkProductCodeRemove
}