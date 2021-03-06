const URL = process.env.ENV_URL
const ORDER = 'order',
    RENEGOTIATION = 'renegotiation',
    SAC = 'sac'
const request = require('request')

const DEBUG = process.env.debug || false

function RequestHeaders(watsonData, type) {
    let tokens = watsonData.context.userPayload.tokens
    let token
    switch (type) {
        case ORDER:
            token = tokens.order.value
            break;
        case RENEGOTIATION:
            token = tokens.renegotiation.value
            break;
        case SAC:
            token = tokens.sac.value
            break;
    }

    return {
        "authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
}

function expiredToken(watsonData, type) {
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        switch (type) {
            case ORDER:
                userPayload.tokens.order.valid = false
                break;
            case RENEGOTIATION:
                userPayload.tokens.renegotiation.valid = false
                break;
            case SAC:
                userPayload.tokens.sac.valid = false
                break;
        }
        resolve({ userPayload })
    })
}

const getToken = (user, client_id, client_secret) => {
    console.log('Get token method invoked..')
    return new Promise((resolve, reject) => {
        const formData = {
            client_id: client_id || process.env.CLIENT_ID,
            client_secret: client_secret || process.env.CLIENT_SECRET,
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

        if (DEBUG) console.log(options)

        request(options, (error, response, body) => {
            try {
                body = JSON.parse(body)
                if (DEBUG) console.log(body)
                if (!error && response.statusCode === 200) {
                    let payload = {
                        user: {
                            id: body.user_id,
                            username: body.user_name,
                            password: user.password.toString()
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

const getOrderToken = (watsonData) => {
    console.log('Get Order token method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        getToken(userPayload.user).then((data) => {
            userPayload.user = data.user
            userPayload.tokens.order = data.token
            resolve({ userPayload })
        }).catch((err) => {
            console.log('Error on getting orger token')
            console.log(err)
            reject(err)
        })
    })
}

const getRenegotiationToken = (watsonData) => {
    console.log('Get renegotiation token method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let client_id = process.env.INSTALLMENTS_CLIENT_ID
        let client_secret = process.env.INSTALLMENTS_SECRET_ID
        getToken(userPayload.user, client_id, client_secret).then((data) => {
            userPayload.user = data.user
            userPayload.tokens.renegotiation = data.token
            watsonData.context.userPayload = userPayload
            getOrderToken(watsonData).then((result) => {
                watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
                peopleAPI(watsonData).then((result) => {
                    watsonData.context.userPayload.user.name = result.name
                    resolve({ userPayload: watsonData.context.userPayload })
                })
            })

        }).catch((err) => {
            console.log('Error on getting Renegotiation token')
            console.log(err)
            reject(err)
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
                        if (err.userPayload)
                            resolve(err)
                    })
            }).catch((err) => {
                console.log(err)
                if (err.userPayload)
                    resolve(err)
            })
    })
}

const peopleAPI = (watsonData) => {
    console.log('People API method invoked')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `${URL}/api/people?code=${watsonData.context.userPayload.user.id}`,
            headers: new RequestHeaders(watsonData, ORDER)
        }

        if (DEBUG) console.log(options)

        request(options, (error, response, body) => {
            if (DEBUG) console.log(body)
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                resolve(body[0] || null)
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => reject(result))
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
            headers: new RequestHeaders(watsonData, ORDER)
        }

        if (DEBUG) console.log(options)

        request(options, (error, response, body) => {
            if (DEBUG) console.log(body)
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                resolve(body)
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => reject(result))
            } else {
                console.log('Error on service info API')
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}

const checkSystemParameters = (watsonData) => {
    console.log('Check system parameters method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const options = {
            method: 'GET',
            url: `${URL}/api/parameters?groupCode=${process.env.GROUP_CODE}`,
            headers: new RequestHeaders(watsonData, ORDER)
        }

        if (DEBUG) console.log(options)

        request(options, (error, response, body) => {
            if (DEBUG) console.log(body)
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                userPayload.parameters = body
                resolve({ userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else {
                console.log('Error on check system parameters')
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}

const checkOverDueInstallments = (watsonData) => {
    console.log('Check OverDue Installments method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        if (userPayload.tokens.renegotiation && userPayload.tokens.renegotiation.valid) {
            getOverDueInstallments(watsonData)
                .then(resolve)
                .catch(reject)
        } else {
            getRenegotiationToken(watsonData).then((result) => {
                watsonData.context.userPayload = result.userPayload
                getOverDueInstallments(watsonData)
                    .then(resolve)
                    .catch(reject)
            })
        }
    })
}

const getOverDueInstallments = (watsonData) => {
    console.log('Get overdue installments method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const options = {
            method: 'GET',
            uri: `${URL}/api/Installments?representativeCode=${userPayload.user.id}&open=true&overdue=true`,
            headers: new RequestHeaders(watsonData, RENEGOTIATION)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                userPayload.installments = body
                resolve({ userPayload, input: { hasInstallments: true } })
            } else if (response && response.statusCode === 404) {
                console.log("There is no overdue installments")
                resolve({ userPayload, input: { hasInstallments: false } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, RENEGOTIATION).then(result => resolve(result))
            } else {
                console.log("An error occurred on getting user installments")
                reject(body)
            }
        })
    })
}

const getInstallments = (watsonData) => {
    console.log('Get installments method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let installments = userPayload.installments
        let filtredInstallments = installments.reduce((acc, curr) => {
            let orderNumber = curr.orderingNumber
            if (!acc[orderNumber]) acc[orderNumber] = []
            acc[orderNumber].push(curr)
            return acc
        }, {})

        if (filtredInstallments) {
            userPayload.installments = filtredInstallments
            resolve({ userPayload, input: { action: 'showInstallments' } })
        } else {
            reject()
        }
    })
}

const selectInstallment = (watsonData) => {
    console.log('Select installments method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let selectedInstallment = watsonData.output['selected_installment']
        let installment = userPayload.installments[selectedInstallment]
        delete userPayload.installments
        if (installment) {
            userPayload.installment = installment
            watsonData.context.userPayload = userPayload
            getDebitRenegotiationPaymentPlans(watsonData).then(resolve)
        } else {
            reject()
        }
    })
}

const getDebitRenegotiationPaymentPlans = (watsonData) => {
    console.log('Get debit renegotiation payment plans method invoked')
    return new Promise((resolve, reject) => {

        let userPayload = watsonData.context.userPayload
        let installment = userPayload.installment
        let order_id = installment[0]['orderingNumber']

        let query = `titlesRequest.selectedTitles%5B%5D=${installment.map(item => (item.number)).join('&titlesRequest.selectedTitles%5B%5D=')}`
        const options = {
            method: 'GET',
            uri: `${URL}/api/orders/${order_id}/debitRenegotiation/paymentPlans?${query}`,
            headers: new RequestHeaders(watsonData, RENEGOTIATION)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode === 200) {
                body = JSON.parse(body)
                // Filter where renegotiationPaymentPlan == SIM
                body = body.filter((plan) => plan.renegotiationPaymentPlan.id == 1)
                userPayload.renegotiationPaymentPlans = body
                resolve({ userPayload, input: { action: 'showRenegotiationPaymentPlans' } })
            } else {
                console.log('An error occurred on getting debit payment plans')
                reject()
            }
        })

    })
}

const selectRenegotiationPaymentPlan = (watsonData) => {
    console.log('Select renegotiation payment plan method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let selected_plan = watsonData.output.selected_plan
        let plan = userPayload.renegotiationPaymentPlans.find((element) => element.code == selected_plan)
        if (plan) {
            let installment = userPayload.installment
            let order_id = installment[0]['orderingNumber']

            let query = `titlesRequest.selectedTitles%5B%5D=${installment.map(item => (item.number)).join('&titlesRequest.selectedTitles%5B%5D=')}`

            const options = {
                method: 'GET',
                uri: `${URL}/api/orders/${order_id}/installments/renegotiationParcelSimulation?paymentPlan=${plan.code}&${query}`,
                headers: new RequestHeaders(watsonData, RENEGOTIATION)
            }

            request(options, (error, response, body) => {
                if (!error && response && response.statusCode == 200) {
                    body = JSON.parse(body)
                    delete userPayload.renegotiationPaymentPlans
                    userPayload.renegotiationPlan = plan
                    userPayload.simulatedInstallments = body
                    resolve({ userPayload, input: { action: 'showSimulatedPlan' } })
                } else {
                    console.log('Error on selecting renegotiation payment plan')
                    reject()
                }
            })

        }

    })
}

const makeRenegotiation = (watsonData) => {
    console.log('Make renegotiation method invoked')
    return new Promise((resolve, reject) => {

        let userPayload = watsonData.context.userPayload
        let installment = userPayload.installment
        let order_id = installment[0]['orderingNumber']
        let paymentPlan = userPayload['renegotiationPlan']['code']
        let parcels = `titlesRequest.selectedTitles%5B%5D=${installment.map(item => (item.number)).join('&titlesRequest.selectedTitles%5B%5D=')}`
        let query = `id=${order_id}&paymentPlan=${paymentPlan}&${parcels}`

        const options = {
            method: 'POST',
            uri: `${URL}/api/installments/renegociation?${query}`,
            headers: new RequestHeaders(watsonData, RENEGOTIATION)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                console.log(JSON.stringify(body))
                delete userPayload.installment
                delete userPayload.renegotiationPlan
                delete userPayload.simulatedInstallments
                resolve({ userPayload, input: { madeRenegotiation: true } })
            } else {
                console.log('Error on making renegotiation')
                console.log(response.statusCode)
                console.log(body)
                reject()
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
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(retrievedOrder)
        }

        if (DEBUG) console.log(options)

        request(options, (error, response, body) => {
            if (DEBUG) console.log(body)
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
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token..: check it..')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else {
                console.log('An error occured: ', response.statusCode)
                console.log(body)
                reject({
                    err: body, statusCode: response.statusCode
                })
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
            headers: new RequestHeaders(watsonData, ORDER)
        }

        if (DEBUG) console.log(options)

        let userPayload = watsonData.context.userPayload

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (DEBUG) console.log(body)
            if (!error && response.statusCode === 200) {

                userPayload.businessModels = body || null
                resolve({ userPayload, input: { hasBusinessModels: true } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token..: check it..')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else {
                console.log('Error on getting business models')
                resolve({ input: { errorMessage: body.message || 'Um erro ocorreu, tente novamente' }, userPayload })
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
                userPayload.user.sellerInfo = sellerDataResult
                watsonData.context = Object.assign({}, watsonData.context, { userPayload })
                businessModelDeliveryMode(watsonData).then((deliveryModeResults) => {
                    let userPayload = watsonData.context.userPayload
                    userPayload.deliveryModes = deliveryModeResults
                    resolve({ userPayload, input: { hasDeliveryModes: true } })
                }).catch((err) => {
                    console.log('Error on getting delivery modes')
                    if (err.userPayload) resolve(err)
                    reject(err)
                })
            }).catch((err) => {
                console.log('Error on getting seller data')
                if (err.userPayload) resolve(err)
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
            headers: new RequestHeaders(watsonData, ORDER)
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
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token..: check it..')
                expiredToken(watsonData, ORDER).then(result => reject(result))
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
            headers: new RequestHeaders(watsonData, ORDER)
        }

        if (DEBUG) console.log(options)

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (DEBUG) console.log(body)
            if (!error && response.statusCode === 200) {
                resolve(body || null)
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token..: check it..')
                expiredToken(watsonData, ORDER).then(result => reject(result))
            } else {
                console.log('Error in getting seller data')
                reject({ err: body })
            }
        })
    })
}

const verifyBusinessModelDeliveryMode = (watsonData) => {
    console.log('Verify Business Model Delivery mode')
    return new Promise((resolve, reject) => {
        const deliveryCode = watsonData.output.deliveryCode
        let userPayload = watsonData.context.userPayload
        const deliveryMode = userPayload.deliveryModes.filter((item) => {
            return item.code == deliveryCode
        })[0] || null
        let hasDeliveryAddress = false
        let hasWithDrawalAddresses = false
        if (deliveryMode) {
            hasDeliveryAddress = true
            if (deliveryMode.isWithdrawalCenter) {
                let withDrawalDeliveryModes = userPayload.deliveryModes.filter(item => item.isWithdrawalCenter)
                if (withDrawalDeliveryModes && withDrawalDeliveryModes.length > 0) hasWithDrawalAddresses = true
            }
        }

        resolve({ userPayload, input: { hasDeliveryAddress, hasWithDrawalAddresses } })
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

const verifyCycles = (watsonData) => {
    console.log('Verify cycles method invoked')
    return new Promise((resolve, reject) => {
        selectBMDeliveryMode(watsonData).then((result) => {
            watsonData.context = Object.assign({}, watsonData.context, result)
            let userPayload = watsonData.context.userPayload
            let useCompositeMarketing = userPayload.businessModel.configurationSystem.useCompositeMarketing
            let selectMarketingMixCycle = userPayload.user.serviceInfo.selectMarketingMixCycle

            let hasCycles = false
            if (useCompositeMarketing && selectMarketingMixCycle) hasCycles = true

            userPayload.hasCycles = hasCycles
            if (hasCycles) {
                console.error(`Verify um modelo comercial com possibilidades de ciclos...`)
                reject()
            } else {
                resolve({ userPayload, input: { hasCycles: false } })
            }
        })

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
                } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                    console.log('Expired token..: check it..')
                    expiredToken(watsonData).then(result => resolve(result))
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
        delete userPayload.starterKits
        userPayload.itemsToChoose = itemsToChoose
        if (itemsToChoose) {
            resolve({ userPayload })
        } else {
            reject()
        }
    })
}

const createNewOrder = (watsonData, recursiveError) => {
    console.log('Creating a new Order method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let marketingCycle = parseInt(userPayload.user.selectedCycle)
        console.log(userPayload.businessModel)
        let distributionCenterCode = userPayload.businessModel.deliveryMode.distributionCenterCode || null
        const order = {
            representativeCode: userPayload.user.id,
            businessModelCode: userPayload.businessModel.code,
            itemsToChoose: userPayload.itemsToChoose,
            collectionMode: process.env.COLLECTION_MODE,
            collectionSystem: process.env.COLLECTION_SYSTEM,
            distributionCenterCode,
            isWithdrawalCenter: userPayload.businessModel.deliveryMode.isWithdrawalCenter,
            originSystem: process.env.ORIGIN_SYSTEM,
            startNewCycle: false
        }

        if (userPayload.hasCycles) order.marketingCycle = marketingCycle

        const options = {
            method: 'POST',
            url: `${URL}/api/orders`,
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(order)
        }

        if (DEBUG) console.log(options)

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 201) {
                userPayload.order = body
                console.log(`Order created successfully with number ${body.number}`)
                resolve({ userPayload, input: { action: 'newOrder' } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token..: check it..')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                if (body.message.trim() == "Selecione o(s) item(s) a ser(em) incorporado(s) ao pedido." && !recursiveError) {
                    console.log('Error, itens a incorporar')
                    return createNewOrder(watsonData, true)
                } else
                    resolve({ input: { errorMessage: body.message || 'Um erro ocorreu, tente novamente' }, userPayload })
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
            headers: new RequestHeaders(watsonData, ORDER)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            let userPayload = watsonData.context.userPayload
            if (!error && response.statusCode === 200) {
                userPayload.promotions = body
                resolve({ input: { hasPromotions: true }, userPayload })
            } else if (response.statusCode === 205) {
                resolve({ input: { hasPromotions: false } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token..: check it..')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
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
            headers: new RequestHeaders(watsonData, ORDER)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            console.log(JSON.stringify(body, null, 2))
            if (!error && response.statusCode === 200) {
                userPayload.foundProduct = body
                resolve({ input: { productFound: true, product: body }, userPayload })
            } else if (!error && response.statusCode === 404) {
                resolve({ input: { productFound: false }, userPayload })
            } else if (response.statusCode === 401 || response.statusCode === 205) {
                expiredToken(watsonData, ORDER).then(result => resolve(result))
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
        // checkOrderState(watsonData).then((result) => {
        checkProductSubstitute(watsonData).then((result) => {
            resolve(result)
        })
        // })
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
            headers: new RequestHeaders(watsonData, ORDER)
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
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
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else {
                console.log('An error occured on checking order state')
                console.log(response.statusCode)
                console.log(body)
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
            headers: new RequestHeaders(watsonData, ORDER)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.substitutions = body
                resolve({ input: { hasSubstitutes: true }, userPayload })
            } else if (response.statusCode === 404) {
                console.log(JSON.stringify(body, null, 2))
                resolve({ input: { hasSubstitutes: false }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else {
                console.log('Error on checking product substitute')
            }
        })
    })
}

const addProductToCart = (watsonData) => {
    console.log('Add product to cart method invoked')

    // Check if product exists
    let userPayload = watsonData.context.userPayload
    const addProductCode = userPayload.foundProduct.productCode
    let checkedProduct = userPayload.order.items.filter((product) => {
        return product.productCode == addProductCode
    })[0] || null
    if (checkedProduct) {
        // Edit product 
        return editProductToAdd(watsonData)
    } else {
        return addProduct(watsonData)
    }

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
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.order = body
                let aux = JSON.parse(JSON.stringify(userPayload.foundProduct))
                delete userPayload.foundProduct
                delete userPayload.productQuantity
                resolve({ input: { productAdded: true, product: aux }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
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
            headers: new RequestHeaders(watsonData, ORDER)
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                resolve({
                    input: { orderDeleted: true },
                    userPayload: {
                        user: userPayload.user,
                        tokens: userPayload.tokens
                    }
                })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
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

const editProductToAdd = (watsonData) => {
    console.log('Edit product to add method invoked')
    return new Promise((resolve, reject) => {


        let userPayload = watsonData.context.userPayload
        const productCode = userPayload.foundProduct.productCode
        let quantity = userPayload.productQuantity
        const product = userPayload.order.items.filter((item) => {
            return item.productCode === productCode
        })[0] || null

        if (product) quantity += product.quantity

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
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.order = body
                let aux = JSON.parse(JSON.stringify(userPayload.foundProduct))
                delete userPayload.foundProduct
                delete userPayload.productQuantity
                resolve({ input: { productAdded: true, product: aux }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else {
                console.log('Error on editing the product')
                console.log(error)
            }
        })
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
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.order = body
                delete userPayload.editProductCode
                delete userPayload.editQuantity
                resolve({ input: { productEdited: true }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
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
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(newItem)
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                userPayload.order = body
                delete userPayload.removeProductCode
                resolve({ input: { productRemoved: true }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else {
                console.log('Error on removing the product')
                console.log(error)
            }
        })
    })
}

const checkMinimumPointsQuantity = (watsonData) => {
    console.log('check minimum points quantity method invoked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let businessInformation = userPayload.order.businessInformation

        let minimumPointsQuantity = businessInformation.minimumPointsQuantity
        let minimumPointsQuantityConsideredOrder = businessInformation.minimumPointsQuantityConsideredOrder

        let result = ((minimumPointsQuantity / 100) - (minimumPointsQuantityConsideredOrder / 100)).toFixed(2)

        if (result > 0) {
            resolve({ input: { minimumPointsRequired: true, data: result }, userPayload })
        } else {
            resolve({ input: { minimumPointsRequired: false }, userPayload })
        }
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
            headers: new RequestHeaders(watsonData, ORDER)
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
            } else if (response.statusCode === 401 || response.statusCode === 205) {
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

const reserverOrder = (watsonData) => {
    console.log('Reserve order method inovked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let orderNumber = userPayload.order.number
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/reserve`,
            headers: new RequestHeaders(watsonData, ORDER)
        }
        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && (response.statusCode === 200 || response.statusCode === 205)) {
                userPayload.order = body
                resolve({ input: { orderReserved: true }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode == 400) {
                resolve({ input: { errorMessage: body[0].message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log('Error on reserve order')
                console.log(response.statusCode)
                console.log(body)
                reject({ err: body, statusCode: response.statusCode })
            }
        })
    })
}

const checkGifts = (watsonData) => {
    console.log('Check gifts method invoked...')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const giftsBody = {
            "simulatedPromotion": true,
            "applicationMomentId": 1
        }
        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/promotions`,
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(giftsBody)
        }

        request(options, (error, response, body) => {
            body = JSON.parse(body)
            if (!error && response.statusCode === 200) {
                userPayload.order = body
                // userPayload.gifts = gifts
                // let hasPromotionsToChoose = false
                // if (body.rewardsToChoosePromotions.length > 0) hasPromotionsToChoose = true
                // if (gifts.length > 0) resolve({ input: { hasGifts: true, hasPromotionsToChoose }, userPayload })
                // else resolve({ input: { hasGifts: false, hasPromotionsToChoose }, userPayload })
                resolve({ userPayload, error: false })

            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode == 400) {
                resolve({ input: { errorMessage: body[0].message || 'Um erro ocorreu, tente novamente' }, userPayload, error: false })
            } else {
                console.log('Error on reserve order')
                console.log(response.statusCode)
                console.log(body)
                reject({ err: body, statusCode: response.statusCode })
            }
        })

    })
}

const checkAcquiredPromotion = (watsonData) => {
    console.log('Check acquired promotion method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let acquiredPromotion = userPayload.order.acquiredPromotion
        if (acquiredPromotion.length > 0) {
            resolve({ input: { hasAcquiredPromotions: true }, userPayload })
        } else {
            resolve({ input: { hasAcquiredPromotions: false }, userPayload })
        }
    })
}

const checkPartialPromotions = (watsonData) => {
    console.log('Check partial promotions method invoked..')
    return new Promise((resolve, reject) => {
        checkGifts(watsonData)
            .then((result) => {
                if (result.error) resolve(result)
                else {
                    let userPayload = result.userPayload
                    let partialPromotions = userPayload.order.partialPromotions
                    if (partialPromotions.length > 0) {
                        resolve({ input: { hasPartialPromotions: true }, userPayload })
                    } else {
                        resolve({ input: { hasPartialPromotions: false }, userPayload })
                    }
                }
            })
            .catch(reject)
    })
}

const checkConditionalSales = (watsonData) => {
    console.log('Check Conditional Sales method invoked')
    return new Promise((resolve, reject) => {
        console.log('Conditional sales is disabled...')
        let userPayload = watsonData.context.userPayload
        resolve({ input: { hasConditionalSales: false }, userPayload })
        // const options = {
        //     method: 'GET',
        //     url: `${URL}/api/orders/${userPayload.order.number}/conditionalSales`,
        //     headers: new RequestHeaders(watsonData, ORDER)
        // }
        // request(options, (error, response, body) => {
        //     if (!error && response.statusCode == 200) {
        //         body = JSON.parse(body)
        //         if (body.length > 0) {
        //             console.log('There is conditional sales')
        //             userPayload.conditionalSales = body || null
        //             watsonData.context.userPayload = userPayload
        //             checkConditionalSalesItems(watsonData).then((userPayload) => {
        //                 resolve({ input: { hasConditionalSales: true }, userPayload })
        //             })
        //         } else {
        //             console.log('There is no conditional sales')
        //             resolve({ input: { hasConditionalSales: false }, userPayload })
        //         }

        //     } else if (response && response.statusCode === 401 || response.statusCode === 205) {
        //         console.log('Expired token')
        //         expiredToken(watsonData, ORDER).then(result => resolve(result))
        //     } else {
        //         console.log('Error on checking conditional sales ')
        //         console.log(response.statusCode)
        //         console.log(body)
        //         reject({ err: body, statusCode: response.statusCode })
        //     }
        // })
    })
}

const checkConditionalSalesItems = (watsonData) => {
    console.log('Check Conditional Sales items method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        checkConditionalSaleItems(userPayload, 0)
            .then(resolve)
    })
}

const checkConditionalSaleItems = (userPayload, index) => {
    return new Promise((resolve, reject) => {
        let conditionalSales = userPayload.conditionalSales
        if (index < conditionalSales.length) {
            const code = conditionalSales[index].conditionalSaleCode
            console.log(`Check conditional sale (${code}) items method invoked `)
            const options = {
                method: 'GET',
                url: `${URL}/api/orders/${userPayload.order.number}/conditionalSales/${code}/items`,
                headers: new RequestHeaders({ context: { userPayload } }, ORDER)
            }

            request(options, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body)
                    userPayload.conditionalSales[index].conditionalSaleItems = body.conditionalSaleItems
                    resolve(checkConditionalSaleItems(userPayload, index + 1))
                } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                    console.log('Expired token')
                    expiredToken({ context: { userPayload } }, ORDER).then(result => resolve(result))
                } else {
                    reject({ err: body, statusCode: response.statusCode })
                }
            })
        } else {
            resolve(userPayload)
        }

    })
}

const selectConditionalSalesItems = (watsonData) => {
    console.log('Select conditional sale method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let selectedItems = watsonData.output.selectedItems
        delete userPayload.conditionalSales

        userPayload.selectedItems = selectedItems
        watsonData.context.userPayload = userPayload
        addProductsToCart(watsonData).then((result) => {
            let userPayload = Object.assign({}, watsonData.context.userPayload, result.userPayload)
            resolve({ input: result.input, userPayload })
        })

    })
}

const addProductsToCart = watsonData => {
    console.log('Add products to cart method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let selectedItems = userPayload.selectedItems


        let items = selectedItems.map((item) => ({
            "productCode": `${item.code}`,
            "productCodeSent": true,
            "productModelCodeSent": false,
            "quantity": item.quantity,
            "quantitySent": true,
            "sellerCodeSent": false,
            "itemToChooseCode": 0,
            "origin": 0,
            "number": 0,
            "confirmedAssociatedItemDeletion": false,
            "cutProductCode": 0,
            "cutProductQuantity": 0
        }))

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${userPayload.order.number}/items`,
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(items)
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                userPayload.order = body
                delete userPayload.selectedItems
                resolve({ input: { selectedConditionalSalesItems: true }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')

                if (items.length > body.length) message += 'Os outros items foram adicionados com sucesso<br>'

                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on adding products to cart')
            }
        })


    })
}

const checkAddresses = (watsonData) => {
    console.log('Check addresses method inovked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/deliveryAddresses`,
            headers: new RequestHeaders(watsonData, ORDER)
        }

        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body)
                if (body.length > 0) {
                    userPayload.addresses = body
                    resolve({ input: { hasAddresses: true }, userPayload })
                } else {
                    console.log('There is no addressess registered!')
                    resolve({ input: { hasAddresses: false }, userPayload })
                }
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')
                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('error on checking addresses')
            }

        })
    })
}

const selectAddress = (watsonData) => {
    console.log('Select address method inovked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const addressCode = watsonData.output.addressCode
        const address = userPayload.addresses.find(address => address.type.id == addressCode)

        const body = {
            "peopleCode": address.people.code,
            "addressTypeId": address.type.id,
            "isWithdrawalCenter": userPayload.order.businessInformation.isWithdrawalCenter,
            "isSupportCenter": false
        }

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/deliveryAddresses`,
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify(body)
        }

        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                userPayload.order = body
                delete userPayload.addresses
                resolve({ input: { addressSelected: true }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')
                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on selecting address')
            }
        })
    })
}

const checkDeliveryOptions = (watsonData) => {
    console.log('Check delivery options method inovked..')
    return new Promise((resolve, reject) => {

        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/deliveryOptions`,
            headers: new RequestHeaders(watsonData, ORDER),
        }

        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                if (body.length > 0) {
                    userPayload.deliveryOptions = body
                    resolve({ input: { hasDeliveryOptions: true }, userPayload })
                } else {
                    resolve({ input: { hasDeliveryOptions: false }, userPayload })
                }
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')

                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on checking delivery options')
            }
        })
    })
}

const selectDeliveryOption = (watsonData) => {
    console.log('Select delivery option method inovked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const deliveryOptionCode = watsonData.output.deliveryOptionCode

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/deliveryOptions`,
            headers: new RequestHeaders(watsonData, ORDER),
            body: JSON.stringify({ deliveryOptionCode })
        }

        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                delete userPayload.deliveryOptions
                userPayload.order = body
                resolve({ input: { deliveryOptionsSelected: true }, userPayload })

            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')

                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on selecting delivery option')
            }
        })

    })
}

const checkPaymentList = (watsonData) => {
    console.log('Check payment list method inovked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number

        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/paymentPlans`,
            headers: new RequestHeaders(watsonData, ORDER),

        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {

                body = JSON.parse(body)
                body = body.filter(paymentPlan => paymentPlan.isBlocked == false)
                if (body.length > 0) {
                    userPayload.paymentPlans = body
                    resolve({ input: { hasPaymentPlans: true }, userPayload })
                } else {
                    resolve({ input: { hasPaymentPlans: false }, userPayload })
                }
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')

                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on checking payment list')
            }
        })
    })
}

const showPaymentModeList = (watsonData) => {
    console.log('Show payment mode list method invoked..')
    return new Promise((resolve, reject) => {
        let selectedPaymentMode = watsonData.output.selectedPaymentMode
        let userPayload = watsonData.context.userPayload

        if (selectedPaymentMode) {
            userPayload.paymentPlans = userPayload.paymentPlans.filter((paymentPlan) => {
                return paymentPlan.paymentMode.id == selectedPaymentMode
            })

            if (userPayload.paymentPlans.length > 0) {
                resolve({ input: { showPaymentMode: true }, userPayload })
            } else {
                resolve({ input: { showPaymentMode: false }, userPayload })
            }
        } else {
            console.log('Error on showing payment mode list ')
            resolve({ input: { showPaymentMode: false }, userPayload })
        }
    })
}



const selectPaymentPlan = (watsonData) => {
    console.log('Select payment plan method invoked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const planCode = parseInt(watsonData.output.selectedPaymentPlan)

        const paymentPlan = userPayload.paymentPlans.find((paymentPlan) => paymentPlan.code == planCode)

        if (paymentPlan) {
            const body = {
                "paymentPlanCode": paymentPlan.code,
                "paymentModeId": paymentPlan.paymentMode.id,
                "installmentsQuantity": 1
            }

            const options = {
                method: 'POST',
                url: `${URL}/api/orders/${orderNumber}/paymentPlans`,
                headers: new RequestHeaders(watsonData, ORDER),
                body: JSON.stringify(body)

            }
            request(options, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    body = JSON.parse(body)
                    delete userPayload.paymentPlans
                    userPayload.order = body
                    resolve({ input: { planSelected: true }, userPayload })
                } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                    console.log('Expired token')
                    expiredToken(watsonData, ORDER).then(result => resolve(result))
                } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                    body = JSON.parse(body)
                    let message = ''
                    body.forEach(item => message += item.message + '<br>')

                    resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
                } else {
                    console.log(response.statusCode)
                    console.log((body))
                    console.log('Error on selecting payment plan')
                }
            })
        } else {
            resolve({ input: { planSelected: false }, userPayload })
        }
    })
}


const checkInstallments = (watsonData) => {
    console.log('Check installments method invoked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const paymentPlan = userPayload.order.paymentPlans
        const orderNumber = userPayload.order.number
        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/installments?paymentPlanCode=${paymentPlan.code}&paymentModeId=${paymentPlan.paymentMode.id}&installmentsQuantity=1`,
            headers: new RequestHeaders(watsonData, ORDER),
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                console.log(JSON.stringify(body, null, 2))
                userPayload.orderInstallments = body
                resolve({ input: { installmentsChecked: true }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')

                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on checking installments')
            }


        })
    })
}

const getTotal = (watsonData) => {
    console.log('Get Cart TOTAL method invoked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number

        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/totals?collectionSystem=3`,
            headers: new RequestHeaders(watsonData, ORDER),
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                console.log(JSON.stringify(body, null, 2))
                userPayload.cartTotal = body
                resolve({ input: { gotCartTotal: true }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')

                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on getting Cart TOTAL')
            }

        })
    })
}

const closeCart = (watsonData) => {
    console.log('Close Cart method invoked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number

        const options = {
            method: 'POST',
            url: `${URL}/api/orders/${orderNumber}/closed`,
            headers: new RequestHeaders(watsonData, ORDER),
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                userPayload.order = body
                delete userPayload.orderInstallments
                delete userPayload.cartTotal
                resolve({ input: { orderClosed: true }, userPayload })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')

                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on closing Cart')
            }
        })
    })
}

const checkOrderAssets = (watsonData) => {
    console.log('Check Order assets method invoked...')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const includeOptions = `includeOptions%5B%5D=${process.env.ORDER_ASSETS_INCLUDE_OPTIONS.split(',').join('&includeOptions%5B%5D=')}`

        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}?${includeOptions}`,
            headers: new RequestHeaders(watsonData, ORDER),
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                let availableAssets
                if (body.availableAssets && body.availableAssets.length > 0) {
                    availableAssets = body.availableAssets.filter((asset) => asset.assetType.id == 1 && asset.available == true)
                    userPayload.availableAssets = availableAssets
                }

                if (availableAssets.length > 0) {
                    resolve({ input: { availableAssets: true }, userPayload })
                } else {
                    resolve({ input: { availableAssets: false }, userPayload })
                }
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on checking Order assets')
            }
        })
    })
}

const getOrderAssets = (watsonData) => {
    console.log('Get order assets method invoked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        const orderNumber = userPayload.order.number
        const availableAssets = userPayload.availableAssets
        let assetType = availableAssets[0].assetType.id

        const options = {
            method: 'GET',
            url: `${URL}/api/orders/${orderNumber}/assets?assetType=${assetType}`,
            headers: new RequestHeaders(watsonData, ORDER),
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body)
                delete userPayload.availableAssets
                userPayload.assets = body

                if (body.length > 0) {
                    resolve({ input: { hasAssets: true }, userPayload })
                } else {
                    resolve({ input: { hasAssets: false }, userPayload })
                }

            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on checking Order assets')
            }
        })
    })
}


const redirectToCart = (watsonData) => {
    console.log('Redirect to cart method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload

        const options = {
            method: 'POST',
            uri: `${URL}/api/AccessKey`,
            headers: new RequestHeaders(watsonData, ORDER)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                userPayload.user.redirectLink = `<a href="https://qanovocarrinhojequiti.geravd.com.br/External/Login.ashx?token=${body.accessKey}&login=${userPayload.user.id}" target="_blank">Continuar no carrinho</a>`
                resolve({ userPayload, input: { redirect: true } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on redirecting to cart')
                reject(error)
            }
        })
    })
}

// SAC 

const getSACToken = (watsonData) => {
    console.log('Get SAC Token method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let client_id = process.env.SAC_CLIENT_ID
        let client_secret = process.env.SAC_SECRET_ID
        getToken(userPayload.user, client_id, client_secret).then((data) => {
            userPayload.user = data.user
            userPayload.tokens.sac = data.token
            resolve({ userPayload })
        }).catch((err) => {
            console.log('Error on getting SAC token')
            console.log(err)
            reject(err)
        })

    })
}

const getNotificationStructuresParents = (watsonData) => {
    console.log('Get notification structures parents method invoked')
    return new Promise((resolve, reject) => {
        getNotificationStructuresWithOptions(watsonData, false)
            .then((notificationStructures) => {
                let userPayload = watsonData.context.userPayload
                userPayload.notificationStructuresParents = notificationStructures
                resolve({ userPayload, input: { hasNotificationStructures: true } })
            })
    })
}

const getNotificationStructuresWithOptions = (watsonData, isLeaf) => {
    console.log('Get notification structure with options method invoked..')
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            uri: `${URL}/api/notificationStructures?isLeaf=${isLeaf}&classificationCode=2`,
            headers: new RequestHeaders(watsonData, SAC)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode === 200) {
                body = JSON.parse(body)
                resolve(body)
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on getting notification structure with options ')
                reject(error)
            }
        })
    })
}

const selectNotificationStructureParent = (watsonData) => {
    console.log('Select notification structure Parent')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let selectedNotificationParent = watsonData.output.selected_notification
        let selectedNotifications = userPayload.notificationStructuresParents.reduce((acc, curr) => {
            if (curr.parent && curr.parent.code == selectedNotificationParent
                || (curr.code == selectedNotificationParent && curr.code == 2)
            ) {
                acc.push(curr)
            }
            return acc
        }, [])

        delete userPayload.notificationStructuresParents
        userPayload.selectedNotificationParent = selectedNotifications


        if (selectedNotifications.length == 1 && selectedNotifications[0].code == 2) {
            resolve({ userPayload, input: { selectedNotifications: true, skipSubParents: true, text: `<code>${selectedNotificationParent}` } })
        } else {
            resolve({ userPayload, input: { selectedNotifications: true, skipSubParents: false } })
        }


    })
}

const getLeafNotificationStructures = (watsonData) => {
    console.log('Get leaf notification structures method invoked')
    return new Promise((resolve, reject) => {
        getNotificationStructuresWithOptions(watsonData, true)
            .then((notificationStructures) => {
                let userPayload = watsonData.context.userPayload
                let selected_parent = watsonData.output.selected_parent

                let notifications = notificationStructures.reduce((acc, curr) => {
                    if (curr.parent && curr.parent.code == selected_parent) {
                        acc.push(curr)
                    }
                    return acc
                }, [])

                userPayload.selectedNotificationsLeaf = notifications
                delete userPayload.selectedNotificationParent
                resolve({ userPayload, input: { hasLeafSuggestions: true } })
            })
    })
}

const createNotificationSAC = (watsonData) => {
    console.log('Create Notification SAC method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let user_id = userPayload.user.id
        let selected_notification = watsonData.output.selected_notification
        delete userPayload.selectedNotificationsLeaf
        const options = {
            method: 'POST',
            uri: `${URL}/api/notifications?peopleCode=${user_id}&code=${selected_notification}&origin=${process.env.SAC_CREATE_ORIGIN}`,
            headers: new RequestHeaders(watsonData, SAC)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                userPayload.SAC = {
                    notificationId: body.notificationId
                }

                resolve({ userPayload, input: { notificationCreated: true } })

            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on creating Notification SAC')
                reject(error)
            }
        })
    })
}

const getNotificationQuestions = (watsonData) => {
    console.log('Get notification questions method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let notificationId = userPayload.SAC.notificationId
        const options = {
            method: 'GET',
            uri: `${URL}/api/notifications/${notificationId}/questions`,
            headers: new RequestHeaders(watsonData, SAC)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                userPayload.SAC.questions = (body.questions.sort((a, b) => a.questionOrder > b.questionOrder) || []).filter((question => question.required))
                userPayload.SAC.questionsIndex = 0

                resolve({ userPayload, input: { hasQuestions: true } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {

                console.log(response.statusCode)
                console.log((body))
                console.log('Error on Getting notification questions')
                if (response && response.statusCode == 404) {
                    body = JSON.parse(body)
                    resolve({ input: { errorMessage: body.message || 'Um erro ocorreu, tente novamente' }, userPayload })
                } else {

                    reject(error)
                }
            }
        })
    })
}

const getSACQuestionAnswers = (watsonData) => {
    console.log('Get SAC Question Answers method invoked...')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let notificationId = userPayload.SAC.notificationId
        let questionIndex = userPayload.SAC.questionsIndex
        let question = userPayload.SAC.questions[questionIndex]

        const options = {
            method: 'GET',
            uri: `${URL}/api/notifications/${notificationId}/questions/${question.questionCode}`,
            headers: new RequestHeaders(watsonData, SAC)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                userPayload.SAC.questionAnswers = body
                if (body.questionCode == 1) {
                    watsonData.context.userPayload = userPayload
                    resolve(getSACOrders(watsonData))
                } else {
                    resolve({ userPayload, input: { hasQuestionAnswers: true } })
                }
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on Getting SAC Question Answers')
                reject(error)
            }
        })
    })
}

const getSACOrders = (watsonData) => {
    console.log('Get SAC orders method invoked...')
    return new Promise((resolve, reject) => {

        let userPayload = watsonData.context.userPayload

        const options = {
            method: 'GET',
            uri: `${URL}/api/Orders?includeOptions=representative&includeOptions=businessInformation`,
            headers: new RequestHeaders(watsonData, SAC)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                let questionAnswers = userPayload.SAC.questionAnswers
                if (questionAnswers.possibleValues && questionAnswers.possibleValues.rows && questionAnswers.possibleValues.rows.length > 0) {
                    let possibleOrders = userPayload.SAC.questionAnswers.possibleValues.rows.map((row) => row.dataRow[0])
                    let initialDate = new Date()
                    initialDate.setMonth(initialDate.getMonth() - 2)
                    initialDate.setHours(0, 0, 0)
                    initialDate.setMilliseconds(0)
                    let orders = body.filter(order => {
                        return possibleOrders.indexOf(`${order.number}`) != -1
                    }).filter(order => {
                        let orderDateStr = order.businessInformation.orderingDate
                        let orderDate = new Date(orderDateStr)
                        return orderDate >= initialDate
                    })
                    let ordersNumber = orders.map(order => `${order.number}`)
                    questionAnswers.possibleValues.rows = questionAnswers.possibleValues.rows.filter((row) => ordersNumber.indexOf(row.dataRow[0]) != -1)
                    if (questionAnswers.possibleValues.rows.length == 0) {
                        resolve({ userPayload, input: { hasRecentOrders: false, date: initialDate.toISOString().split('T')[0] } })
                    } else {
                        questionAnswers.extraData = {
                            columns: ['Data', 'Valor', 'Status'],
                            rows: orders.map(order => ({
                                Data: new Date(order.businessInformation.orderingDate).toISOString(),
                                Valor: order.businessInformation.totalAmount,
                                Status: order.businessInformation.businessStatusName,
                                number: `${order.number}`
                            }))
                        }
                        resolve({ userPayload, input: { hasQuestionAnswers: true, hasRecentOrders: true } })
                    }
                } else {
                    resolve({ input: { errorMessage: 'Um erro ocorreu, tente novamente' }, userPayload })
                }
                // resolve({ userPayload, input: { hasQuestionAnswers: true } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')
                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on Getting SAC Question Answers')
                reject(error)
            }
        })
    })
}

const answerSACQuestions = (watsonData) => {
    console.log('Answer SAC Questions mehtod invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let notificationId = userPayload.SAC.notificationId
        let questionsIndex = userPayload.SAC.questionsIndex
        let question = userPayload.SAC.questions[questionsIndex]
        let questionAnswers = userPayload.SAC.questionAnswers
        let answer = watsonData.output.answer
        let questions = userPayload.SAC.questions
        let body = {}
        // tabela || dominio || tabela faixa
        let id = question.answerType.id
        if (id == 4 || id == 2 || id == 10) {
            body = {
                tableValue: {
                    columns: questionAnswers.possibleValues.columns.map(column => ({
                        name: column.name
                    }))
                    ,
                    rows: [
                        {
                            dataRow: questionAnswers.possibleValues.rows[answer].dataRow
                        }
                    ]
                }
            }
        } else if (id == 1 || id == 6) {
            body = {
                singleValue: answer,
            }
        }
        console.log(JSON.stringify(body, null, 2))
        const options = {
            method: 'PATCH',
            uri: `${URL}/api/notifications/${notificationId}/questions/${question.questionCode}`,
            headers: new RequestHeaders(watsonData, SAC),
            body: JSON.stringify(body)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                questions[questionsIndex]['answer'] = body
                userPayload.SAC.questionsIndex = questionsIndex + 1
                userPayload.SAC.questions = questions

                if (userPayload.SAC.questionsIndex == userPayload.SAC.questions.length) {
                    resolve({ userPayload, input: { questionAnsweredFinished: true } })
                } else {
                    resolve({ userPayload, input: { questionAnswered: true } })
                }

            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on answering SAC Questions')
                reject(error)
            }
        })
    })
}

const closeSACNotification = (watsonData) => {
    console.log('Close SAC Notification method invoked...')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let notificationId = userPayload.SAC.notificationId

        const options = {
            method: 'PATCH',
            uri: `${URL}/api/notifications/${notificationId}/closed`,
            headers: new RequestHeaders(watsonData, SAC)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                delete userPayload.notificationId
                delete userPayload.questionAnswers
                delete questions
                delete questionsIndex

                resolve({ userPayload, input: { notificationClosed: true } })

            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on closing SAC Notification')
                reject(error)
            }
        })


    })
}

const getSACNotifications = (watsonData) => {
    console.log('Get Notifications SAC method invoked')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let dates = watsonData.output.dates
        // let initial = dates.filter(date => date.key == 'initial')[0].value
        // let final = dates.filter(date => date.key == 'end')[0].value
        let initialDate = new Date()
        initialDate.setMonth(initialDate.getMonth() - 2)
        initialDate.setHours(0, 0, 0)
        initialDate.setMilliseconds(0)
        let initial = initialDate.toISOString().split('T')[0]
        let final = new Date().toISOString().split('T')[0]

        const options = {
            method: 'GET',
            uri: `${URL}/api/notifications?initialNotificationDate=${initial}&finalNotificationDate=${final}&peopleCode=${userPayload.user.id}`,
            headers: new RequestHeaders(watsonData, SAC)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                if (!userPayload.SAC) userPayload.SAC = {}
                userPayload.SAC.notifications = body
                resolve({ userPayload, input: { hasNotifications: true } })
            } else if (response && response.statusCode == 404) {
                resolve({ userPayload, input: { hasNotifications: false } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on getting Notifications SAC')
                reject(error)
            }
        })
    })
}

const getNotificationSACDetails = (watsonData) => {
    console.log('Get notification SAC Details method invoked..')
    return new Promise((resolve, reject) => {
        let userPayload = watsonData.context.userPayload
        let selected_notifications = watsonData.output.selected_notification

        const options = {
            method: 'GET',
            uri: `${URL}/api/notifications/${selected_notifications}`,
            headers: new RequestHeaders(watsonData, SAC)
        }

        request(options, (error, response, body) => {
            if (!error && response && response.statusCode == 200) {
                body = JSON.parse(body)
                userPayload.SAC.notifications = null
                userPayload.SAC.notificationDetails = body
                resolve({ userPayload, input: { gotNotificationDetails: true } })
            } else if (response && response.statusCode === 401 || response.statusCode === 205) {
                console.log('Expired token')
                expiredToken(watsonData, ORDER).then(result => resolve(result))
            } else if (response && response.statusCode === 400 || response.statusCode === 405) {
                body = JSON.parse(body)
                let message = ''
                body.forEach(item => message += item.message + '<br>')


                resolve({ input: { errorMessage: message || 'Um erro ocorreu, tente novamente' }, userPayload })
            } else {
                console.log(response.statusCode)
                console.log((body))
                console.log('Error on getting notification SAC Details')
                reject(error)
            }
        })


    })
}


module.exports = {
    getToken,
    getOrderToken,
    checkUserInformations,
    checkSystemParameters,
    getRenegotiationToken,
    checkOverDueInstallments,
    getInstallments,
    selectInstallment,
    selectRenegotiationPaymentPlan,
    makeRenegotiation,
    checkOpenOrders,
    getBusinessModels,
    getBusinessModelDeliveryMode,
    getCycles,
    verifyCycles,
    verifyBusinessModelDeliveryMode,
    getStarterKit,
    selectKit,
    createNewOrder,
    checkPromotions,
    checkStock,
    getProductToAdd,
    checkProductReplacement,
    addProductToCart,
    addProduct,
    checkOrderState,
    deleteOrder,
    checkProductCode,
    editProduct,
    checkProductCodeRemove,
    removeProduct,
    reserverOrder,
    checkMinimumPointsQuantity,
    checkSuggestions,
    checkPartialPromotions,
    checkAcquiredPromotion,
    checkGifts,
    checkConditionalSales,
    selectConditionalSalesItems,
    checkAddresses,
    selectAddress,
    checkDeliveryOptions,
    selectDeliveryOption,
    checkPaymentList,
    showPaymentModeList,
    selectPaymentPlan,
    checkInstallments,
    getTotal,
    closeCart,
    checkOrderAssets,
    getOrderAssets,
    redirectToCart,
    getSACToken,
    getNotificationStructuresParents,
    selectNotificationStructureParent,
    getLeafNotificationStructures,
    createNotificationSAC,
    getNotificationQuestions,
    answerSACQuestions,
    getSACNotifications,
    getNotificationSACDetails,
    getSACQuestionAnswers,
    closeSACNotification,
    selectCycle
}