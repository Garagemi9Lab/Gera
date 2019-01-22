const URL = process.env.ENV_URL
const request = require('request')

function RequestHeaders(watsonData) {
    return {
        "authorization": `Bearer ${watsonData.context.userPayload.token.value}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
}

function expiredToken(watsonData) {
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        userPayload.token.valid = false
        resolve({ userPayload })
    })
}

const getToken = (user) => {
    console.log('Get token method invoked..')
    return new Promise((resolve, reject) => {
        const formData = {
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
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
        request(options, (error, response, body) => {
            try {
                body = JSON.parse(body)
                if (!error && response.statusCode === 200) {
                    let payload = {
                        user: {
                            id: body.user_id,
                            username: body.user_name
                        },
                        token: {
                            value: body.access_token,
                            valid: true
                        }
                    }
                    resolve(payload)
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

const checkUserInformations = (watsonData) => {
    console.log('Check User informations')
    return new Promise((resolve, reject) => {
        peopleAPI(watsonData)
            .then((peopleResult) => {
                serviceInfoAPI(watsonData)
                    .then(serviceInfoResult => {
                        let userPayload = watsonData.context.userPayload
                        userPayload.user.peopleInfo = peopleResult
                        userPayload.user.serviceInfo = serviceInfoResult
                        resolve({ userPayload })
                    }).catch((err) => {
                        console.log(err)
                    })
            }).catch((err) => {
                console.log(err)
            })
    })
}

const peopleAPI = (watsonData) => {
    console.log('People API method invoked')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/people?code=${watsonData.context.userPayload.user.id}`,
            headers: new RequestHeaders(watsonData)
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                resolve(body[0] || null)
            } else if (response, statusCode === 401) {
                console.log('Expired token')
                // expiredToken(watsonData).then(result => reject(result))
            } else {
                console.log('Error on peopleAPI')
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}

const serviceInfoAPI = (watsonData) => {
    console.log('ServiceInfo API method invoked')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/sellers/${watsonData.context.userPayload.user.id}/serviceInfo`,
            headers: new RequestHeaders(watsonData)
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                resolve(body)
            } else {
                console.log('Error on service info API')
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}

const checkOpenOrders = (watsonData) => {
    console.log('Check open orders method invoked')
    return new Promise((resolve, reject) => {

        const retrievedOrder = {
            representativeCode: watsonData.context.userPayload.user.id,
            collectionSystem: process.env.COLLECTION_SYSTEM,
            collectionMode: process.env.COLLECTION_MODE,
            originSystem: process.env.ORIGIN_SYSTEM
        }

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/retrieved`,
            headers: new RequestHeaders(watsonData),
            body: JSON.stringify(retrievedOrder)
        }

        request(options, (error, response, body) => {
            let userPayload = watsonData.context.userPayload
            if (!error && response.statusCode == 201) {
                // Order Opened check if it has items or not. 
                body = JSON.parse(body)
                userPayload.order = body
                if (body.items.length > 0) {
                    resolve({ input: { openOrder: true, hasItems: true }, userPayload })
                } else {
                    resolve({ input: { openOrder: true, hasItems: false }, userPayload })
                }
            } else if (!error && response.statusCode === 204) {
                // No Order opened
                console.log('There is no order opened')
                resolve({ input: { openOrder: false }, userPayload })
            } else if (response.statusCode === 401) {
                console.log('Expired token..: check it..')
            } else {
                console.log('An error occured: ', response.statusCode)
                console.log(body)
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}

const getBusinessModels = (watsonData) => {
    console.log('Get business models method invoked')
    return new Promise((resolve, reject) => {
        let functionCodes = `functionCode%5B%5D=${process.env.BM_FUNCTION_CODES.split(',').join('&functionCode%5B%5D=')}`
        let associationAccountTypes = `associationAccountType%5B%5D=${process.env.ASSOCIATION_ACCOUNT_TYPES.split(',').join('&associationAccountType%5B%5D=')}`
        let queryParams = `orderingSystemCode=${process.env.ORDERING_SYSTEM_CODE}&${functionCodes}&applicationCode=${process.env.APPLICATION_CODE}&momentControlCenter=${process.env.MOMENT_CONTROL_CENTER}&${associationAccountTypes}&businessModelCode=`
        const options = {
            method: 'GET',
            url: `${URL}/api/sellers/${watsonData.context.userPayload.user.id}/businessModels?${queryParams}`,
            headers: new RequestHeaders(watsonData)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                let userPayload = watsonData.context.userPayload
                userPayload.businessModels = body || null
                resolve({ userPayload })
            } else {
                console.log('Error in getting business models')
                reject({ err: body })
            }
        })
    })
}

const selectBusinessModel = (watsonData) => {
    console.log('Select Business Model method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const businessCode = watsonData.output.businessCode
        const businessModel = userPayload.businessModels.filter(bModel => {
            return bModel.code == businessCode
        })[0] || null
        delete userPayload.businessModels
        userPayload.businessModel = businessModel
        if (businessModel)
            resolve({ userPayload })
        else
            reject()

    })
}

const getBusinessModelDeliveryMode = (watsonData) => {
    return new Promise((resolve, reject) => {
        selectBusinessModel(watsonData).then((result) => {
            watsonData.context = Object.assign({}, watsonData.context, result)
            getSellerData(watsonData).then((sellerDataResult) => {
                let userPayload = watsonData.context.userPayload
                delete userPayload.user.peopleInfo
                userPayload.user.sellerInfo = sellerDataResult
                watsonData.context = Object.assign({}, watsonData.context, { userPayload })
                businessModelDeliveryMode(watsonData).then((deliveryModeResults) => {
                    let userPayload = watsonData.context.userPayload
                    userPayload.deliveryModes = deliveryModeResults
                    resolve({ userPayload })
                }).catch((err) => {
                    console.log('Error on getting delivery modes')
                    reject(err)
                })
            }).catch((err) => {
                console.log('Error on getting seller data')
                reject(err)
            })
        }).catch((err) => {
            console.log('Error on selecting business model')
            reject(err)
        })
    })
}

const businessModelDeliveryMode = (watsonData) => {
    console.log('Business model delivery mode method invoked')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/sellers/${watsonData.context.userPayload.user.id}/businessModels/${watsonData.context.userPayload.businessModel.code}/deliveryMode`,
            headers: new RequestHeaders(watsonData)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                body = body.reduce((acc, curr, index) => {
                    curr.code = index
                    acc.push(curr)
                    return acc
                }, [])
                resolve(body)
            } else {
                console.log('Error in getting business model delivery mode')
                reject({ err: body })
            }
        })
    })
}

const getSellerData = (watsonData) => {
    console.log('Get seller data method invoked')
    return new Promise((resolve, reject) => {
        const includeOptions = `includeOptions%5B%5D=${process.env.SELLER_INCLUDE_OPTIONS.split(',').join('&includeOptions%5B%5D=')}`
        const functionCode = watsonData.context.userPayload.businessModel.function.code || 1
        const queryOarams = `${includeOptions}&businessModelCode=${watsonData.context.userPayload.businessModel.code}&functionCode=${functionCode}`
        const options = {
            method: 'GET',
            url: `${URL}/api/sellers/${watsonData.context.userPayload.user.id}?${queryOarams}`,
            headers: new RequestHeaders(watsonData)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                resolve(body || null)
            } else {
                console.log('Error in getting seller data')
                reject({ err: body })
            }
        })
    })
}

const selectBMDeliveryMode = (watsonData) => {
    console.log('Select Business Model Delivery Mode')
    return new Promise((resolve, reject) => {
        const deliveryCode = watsonData.output.deliveryCode
        let userPayload = watsonData.context.userPayload

        const deliveryMode = userPayload.deliveryModes.filter((item) => {
            return item.code == deliveryCode
        })[0] || null
        delete userPayload.deliveryModes

        userPayload.businessModel.deliveryMode = deliveryMode

        if (deliveryMode)
            resolve({ userPayload })
        else {
            console.log('Error on selecting Business model delivery mode')
            reject()
        }

    })
}

const getCycles = (watsonData) => {
    return new Promise((resolve, reject) => {
        selectBMDeliveryMode(watsonData).then((result) => {
            console.log('Get Cycles method invoked')
            watsonData.context = Object.assign({}, watsonData.context, result)
            let userPayload = watsonData.context.userPayload
            const currentCycle = userPayload.user.sellerInfo.businessData.currentCycle
            const nextCycle = userPayload.user.sellerInfo.businessData.nextCycle
            let cycles = []
            cycles.push({ number: currentCycle })
            if (currentCycle != nextCycle) {
                cycles.push({ number: nextCycle })
                cycles = cycles.sort((a, b) => a.number - b.number)
            }

            userPayload.cycles = cycles

            resolve({ userPayload })

        }).catch((err) => {
            console.log('Error on selecting Business Model Mode..')
            console.log(err)
        })
    })
}

const selectCycle = (watsonData) => {
    console.log('Select Cycle method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        console.log(JSON.stringify(watsonData, null, 2))
        delete userPayload.cycles
        delete userPayload.cycle
        const selected_cycle = watsonData.output.selected_cycle || null
        userPayload.user.selectedCycle = selected_cycle

        resolve({ userPayload })

    })
}

const getStarterKit = (watsonData) => {
    console.log('Starter kit method invoked')
    return new Promise((resolve, reject) => {

        selectCycle(watsonData).then((result) => {
            watsonData.context = Object.assign({}, watsonData.context, result)
            let userPayload = watsonData.context.userPayload
            const options = {
                method: 'GET',
                url: `${URL}/api/sellers/${userPayload.user.id}/itemsToChoose?id=${userPayload.user.id}&businessModelCode=${userPayload.businessModel.code}&originSystem=${process.env.ORIGIN_SYSTEM}`,
                headers: new RequestHeaders(watsonData)
            }
            request(options, (error, response, body) => {
                body = JSON.parse(body)
                if (!error && response.statusCode === 200) {
                    userPayload.starterKits = body
                    resolve({ userPayload })
                } else {
                    console.log('Error on getting starter kit')
                    reject({ err: body, statusCode: response.statusCode })
                }
            })
        })
    })
}

const selectKit = (watsonData) => {
    console.log('Select KIT method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let itemsToChoose = watsonData.output.selectedKits.map(selectedKit => {
            return {
                productCode: selectedKit.itemCode,
                itemToChooseCode: selectedKit.listCode
            }
        })
        // let itemsToChoose = []
        // watsonData.output.selectedKits.forEach((selectedKit) => {
        // let kit = userPayload.starterKits.filter((starterKit) => starterKit.code == selectedKit.listCode)
        // kit.products.forEach((product) => {
        // itemsToChoose.push({
        // productCode: product.code,
        // itemToChooseCode: selectedKit.listCode
        // })
        // })
        // })
        delete userPayload.starterKits
        userPayload.itemsToChoose = itemsToChoose
        if (itemsToChoose) {
            resolve({ userPayload })
        } else {
            reject()
        }
    })
}

const createNewOrder = (watsonData) => {
    console.log('Creating a new Order method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let marketingCycle = parseInt(userPayload.user.selectedCycle)
        const order = {
            representativeCode: userPayload.user.id,
            businessModelCode: userPayload.businessModel.code,
            itemsToChoose: userPayload.itemsToChoose,
            collectionMode: process.env.COLLECTION_MODE,
            collectionSystem: process.env.COLLECTION_SYSTEM,
            marketingCycle: marketingCycle || null,
            isWithdrawalCenter: userPayload.businessModel.deliveryMode.isWithdrawalCenter,
            originSystem: process.env.ORIGIN_SYSTEM,
            startNewCycle: false
        }
        const options = {
            method: 'POST',
            url: `${URL}/api/orders`,
            headers: new RequestHeaders(watsonData),
            body: JSON.stringify(order)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 201) {
                userPayload.order = body
                console.log(`Order created successfully with number ${body.number}`)
                resolve({ userPayload })
            } else {
                console.log('Error on creating order: ' + response.statusCode)
                console.log(body)
                reject({ err: body })
            }
        })
    })
}

const checkPromotions = (watsonData) => {
    console.log('Check promotions method inovked..')
    return new Promise((resolve, reject) => {

        const orderNumber = watsonData.context.userPayload.order.number

        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/promotions`,
            headers: new RequestHeaders(watsonData)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            let userPayload = watsonData.context.userPayload
            if (!error && response.statusCode === 200) {
                userPayload.promotions = body
                resolve({ input: { hasPromotions: true }, userPayload })
            } else if (response.statusCode === 205) {
                resolve({ input: { hasPromotions: false } })
            } else if (response.statusCode === 401) {
                userPayload.token.valid = false
                resolve({ userPayload })
            } else {
                reject({ err: body })
            }
        })
    })
}

const checkStock = (watsonData) => {
    console.log('Check stock method invoked')
    return new Promise((resolve, reject) => {

        let userPayload = watsonData.context.userPayload
        const cycle = userPayload.order.businessInformation.marketingCycle
        const sellerCode = userPayload.user.id
        const functionCode = (b = userPayload.businessModel) ? (f = b.function.code) ? f : 1 : 1
        const businessModelCode = userPayload.order.businessInformation.businessModelCode
        const distributionCenterCode = userPayload.order.businessInformation.distributionCenterCode
        const query = `cycle=${cycle}&sellerCode=${sellerCode}&functionCode=${functionCode}&businessModelCode=${businessModelCode}&distributionCenterCode=${distributionCenterCode}`

        const options = {
            method: 'GET',
            url: `${URL}/api/Products/${watsonData.output.productCode}/stock?${query}`,
            headers: new RequestHeaders(watsonData)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            console.log(JSON.stringify(body, null, 2))
            if (!error && response.statusCode === 200) {
                userPayload.foundProduct = body
                resolve({ input: { productFound: true, product: body }, userPayload })
            } else if (!error && response.statusCode === 404) {
                resolve({ input: { productFound: false }, userPayload })
            } else if (response.statusCode === 401) {
                // expiredToken(watsonData).then(result => reject(result))
            } else {
                console.log('Error on check Stock');
                console.log(body)
                reject({ error })
            }
        })
    })
}

const getProductToAdd = (watsonData) => {
    console.log('Get product to add method invoked')
    return new Promise((resolve, reject) => {
        checkStock(watsonData).then((result) => {
            resolve(result)
        })
    })
}

const checkProductReplacement = (watsonData) => {
    console.log('Check Product Replacement method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const productCode = userPayload.foundProduct.productCode
        checkOrderState(watsonData).then((result) => {
            checkProductSubstitute(watsonData).then((result) => {
                console.log(JSON.stringify(result, null, 2))
                resolve(result)
            })
        })
    })
}

const checkOrderState = (watsonData) => {
    console.log('Check order state method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/state`,
            headers: new RequestHeaders(watsonData)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            console.log(JSON.stringify(body, null, 2))
            if (!error && response.statusCode == 200) {
                userPayload.orderState = body
                resolve({ userPayload })
            } else if (response.statusCode === 401) {
                console.log('Expired token')
            } else {
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}


const checkProductSubstitute = (watsonData) => {
    console.log('Check product substitute method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${userPayload.order.number}/replacementProducts/${userPayload.foundProduct.productCode}`,
            headers: new RequestHeaders(watsonData)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.substitutions = body
                resolve({ input: { hasSubstitutes: true }, userPayload })
            } else if (response.statusCode === 404) {
                console.log(JSON.stringify(body, null, 2))
                resolve({ input: { hasSubstitutes: false } })
            } else {
                console.log('Error on checking product substitute')
            }
        })
    })
}

const addProduct = (watsonData) => {
    console.log('Add product method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const newItem = [
            {
                "productCode": `${userPayload.foundProduct.productCode}`,
                "productCodeSent": true,
                "productModelCodeSent": false,
                "quantity": userPayload.productQuantity,
                "quantitySent": true,
                "sellerCodeSent": false,
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
            url: `${URL}/api/orders/${userPayload.order.number}/items`,
            headers: new RequestHeaders(watsonData),
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.order = body
                delete userPayload.foundProduct
                delete userPayload.productQuantity
                resolve({ input: { productAdded: true }, userPayload })
            } else if (response.statusCode === 401) {
                console.log('Expired token')
                // resolve({ expiredToken: true })
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

const deleteOrder = (watsonData) => {
    console.log('Delete order method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const options = {
            method: 'DELETE',
            url: `${URL}/api/orders/${userPayload.order.number}`,
            headers: new RequestHeaders(watsonData)
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                resolve({
                    input: { orderDeleted: true },
                    userPayload: {
                        user: userPayload.user,
                        token: userPayload.token
                    }
                })
            } else {
                console.log('Error on deleting the order')
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}

const checkProductCode = (watsonData) => {
    console.log('Check product code method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const editProductCode = watsonData.output.editProductCode
        const product = userPayload.order.items.filter((item) => {
            return item.productCode === editProductCode
        })[0] || null

        console.log(product)

        if (product) {
            userPayload.editProductCode = editProductCode
            resolve({ input: { validProductCode: true }, userPayload })
        } else {
            resolve({ input: { validProductCode: false }, userPayload })
        }
    })
}

const editProduct = (watsonData) => {
    console.log('Edit product method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const productCode = userPayload.editProductCode
        const quantity = userPayload.editQuantity
        const product = userPayload.order.items.filter((item) => {
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
            url: `${URL}/api/orders/${userPayload.order.number}/items?eventChangeQuantity%5B%5D=replaceQuantity`,
            headers: new RequestHeaders(watsonData),
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.order = body
                delete userPayload.editProductCode
                delete userPayload.editQuantity
                resolve({ input: { productEdited: true }, userPayload })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                console.log('Error on editing the product')
                console.log(error)
            }
        })
    })
}

const checkProductCodeRemove = (watsonData) => {
    console.log('Check product code remove method invoked')
    return new Promise((resolve, reject) => {
        const removeProductCode = watsonData.output.removeProductCode
        let userPayload = watsonData.context.userPayload
        const product = userPayload.order.items.filter((item) => {
            return item.productCode === removeProductCode
        })[0] || null
        if (product) {
            userPayload.removeProductCode = removeProductCode
            resolve({ input: { validProductCode: true }, userPayload })
        } else {
            resolve({ input: { validProductCode: false }, userPayload })
        }
    })
}


const removeProduct = (watsonData) => {
    console.log('Remove product method invoked')
    return new Promise((resolve, reject) => {

        let userPayload = watsonData.context.userPayload

        const productCode = userPayload.removeProductCode

        const product = userPayload.order.items.filter((item) => {
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
            url: `${URL}/api/orders/${userPayload.order.number}/items?eventChangeQuantity%5B%5D=replaceQuantity`,
            headers: new RequestHeaders(watsonData),
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.order = body
                delete userPayload.removeProductCode
                resolve({ input: { productRemoved: true }, userPayload })
            } else if (response.statusCode === 401) {
                console.log('Expired session')
                // resolve({ expiredToken: true })
            } else {
                console.log('Error on editing the product')
                console.log(error)
            }
        })
    })
}

const reserverOrder = (watsonData) => {
    console.log('Reserve order method inovked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let orderNumber = userPayload.order.number
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/reserve`,
            headers: new RequestHeaders(watsonData)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.order = body
                resolve({ input: { orderReserved: true }, userPayload })
            } else if (!error && response.statusCode === 205) {
                //TODO: verificar isso!
                userPayload.order = body
                resolve({ input: { orderReserved: true }, userPayload })
            } else if (response.statusCode === 401) {
                resolve({ expiredToken: true })
            } else {
                console.log('Error on reserve order')
                console.log(JSON.stringify(body))
            }
        })
    })
}

const checkSuggestions = (watsonData) => {
    console.log('Check suggestions method inovked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let orderNumber = userPayload.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/purchaseSuggestion?showModelsBeginColection=false&showModelsDuringColection=false&showModelsPromotionApplication=true`,
            headers: new RequestHeaders(watsonData)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            console.log(JSON.stringify(body, null, 2))
            if (!error && response.statusCode === 200) {
                if (body.length == 0) {
                    resolve({ input: { hasSuggestions: false }, userPayload })
                } else {
                    userPayload.suggestionsProducts = body
                    resolve({ input: { hasSuggestions: true }, userPayload })
                }
            } else if (response.statusCode === 401) {
                console.log('Expired Token')
                // resolve({ expiredToken: true })
            } else if (response.statusCode == 404) {
                resolve({ input: { hasSuggestions: false }, userPayload })
            } else {
                console.log(body)
                reject({ err: body, statusCode: response.statusCode })
            }
        })

    })
}


module.exports = {
    getToken,
    checkUserInformations,
    checkOpenOrders,
    getBusinessModels,
    getBusinessModelDeliveryMode,
    getCycles,
    getStarterKit,
    selectKit,
    createNewOrder,
    checkPromotions,
    checkStock,
    getProductToAdd,
    checkProductReplacement,
    addProduct,
    deleteOrder,
    checkProductCode,
    editProduct,
    checkProductCodeRemove,
    removeProduct,
    reserverOrder,
    checkSuggestions
}