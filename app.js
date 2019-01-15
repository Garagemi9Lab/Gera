var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');

var app = express();
require('dotenv').load()

var Bot = require('./buildSrc/Conversation/bot')
var Gera = require('./buildSrc/Gera')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.render('login'));

app.post('/api/v1/login', (req, res) => {
  console.log('Api login method invoekd..')
  let user = req.body
  if (user.username && user.password) {
    Gera.getToken(user).then((result) => {
      res.status(200).json({ url: '/home' })
    }).catch((err) => {
      console.error(err)
      if (err.error == 'invalid_grant') {
        res.status(404).json({ message: 'WRONG_CREDENTIALS' })
      } else if (err.error == "EXPIRED_SESSION") {
        res.status(403).json({ message: 'EXPIRED_SESSION' })
      }
    })
  } else {
    res.status(400).json({ message: 'BAD_REQUEST' })
  }
})

app.get('/home', (req, res) => res.render('index'))

app.post('/message', (req, res) => {
  // Check for first message
  let params = req.body
  if (Object.keys(params.context).length == 0) {
    Gera.getToken(params.loggedUser).then((result) => {
      params.context.userPayload = result
      sendToWatson(params).then((watsonData) => res.status(200).json(watsonData))
    })
  } else {
    sendToWatson(req.body).then((watsonData) => {
      res.status(200).json(watsonData)
    }).catch((error) => {
      console.log('Error')
      console.log(error)
    })
  }
})

const sendToWatson = (params) => {
  console.log('send to watson method invoked.. ')
  return new Promise((resolve, reject) => {
    Bot.sendMessage(params).then((watsonData) => {
      if (watsonData.output && watsonData.output.action) {
        switch (watsonData.output.action) {
          case "check_user_informations":
            Gera.checkUserInformations(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then((data) => resolve(data))
            }).catch(error => {
              console.log('Error on checking user info')
              console.log(error)
            })
            break;

          case "check_pending_orders":
            Gera.checkPendingOrders(watsonData).then((result) => {
              sendToWatson({
                context: watsonData.context,
                input: {
                  pendingOrders: result.pendingOrders
                }
              }).then((data) => resolve(data))
            }).catch(error => {
              console.log('Error on checking user info')
              console.log(error)
            })
            break;

          case "get_business_models":
            Gera.getBusinessModels(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({
                context: watsonData.context,
                input: {
                  action: 'showBusinessModels',
                  quick_replies: new QuickReplies(result.userPayload.businessModels, 'businessModels')
                }
              }).then((data) => resolve(data))
            }).catch(error => {
              console.log('Error on getting business models')
              console.log(error)
            })
            break;

            
          case "select_business_model":
            Gera.getBusinessModelDeliveryMode(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({
                context: watsonData.context,
                input: {
                  action: 'showDeliveryModes',
                  quick_replies: new QuickReplies(result.userPayload.deliveryModes, 'deliveryModes')
                }
              }).then((data) => resolve(data))
            })
            break;

          case "select_BM_delivery_mode":
            Gera.getStarterKit(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({
                context: watsonData.context,
                input: {
                  action: 'showStarterKits',
                  quick_replies: new QuickReplies(result.userPayload.starterKits, 'starterKits')
                }
              }).then((data) => resolve(data))
            })
            break;

          case "check_orders":
            Gera.checkUserOrders(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then((data) => resolve(data))
            }).catch((error) => {
              console.log('Error on checking orders')
              console.log(error)
            })
            break;
          case "get_stock":
            Gera.checkStock(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then((data) => {
                delete data.context.productCode
                resolve(data)
              })
            }).catch((error) => {
              console.log(error)
            })
            break;
          case "get_product_to_add":
            Gera.getProductToAdd(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then((data) => {
                delete data.context.productCode
                resolve(data)
              })
            })
            break;
          case "add_product":
            if (watsonData.context.orderDeleted && watsonData.context.orderDeleted == true) {
              delete watsonData.context.orderDeleted
              Gera.createNewOrder(watsonData).then((result) => {
                watsonData.context.newOrder = true
                watsonData.context.order = result
                Gera.addProduct(watsonData).then((result) => {
                  watsonData.context = Object.assign({}, watsonData.context, result)
                  sendToWatson({ context: watsonData.context }).then(data => resolve(data))
                }).catch((err) => {
                  console.log('An error occured on add product method. ')
                  console.log(err)
                })
              })
            } else {
              Gera.addProduct(watsonData).then((result) => {
                watsonData.context = Object.assign({}, watsonData.context, result)
                sendToWatson({ context: watsonData.context }).then(data => resolve(data))
              }).catch((err) => {
                console.log('An error occured on add product method. ')
                console.log(err)
              })
            }
            break;

          case "check_order_state":
            Gera.checkOrderState(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;

          case "check_suggestions":
            Gera.checkSuggestions(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;

          case "check_promotions":
            Gera.checkPromotions(watsonData).then((result) => {
              delete watsonData.context.hasSuggestions
              delete watsonData.context.suggestionsProducts
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;

          case "reserve_order":
            Gera.reserverOrder(watsonData).then((result) => {
              delete watsonData.context.hasPromotions
              delete watsonData.context.promotions
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "check_gifts":
            Gera.checkGifts(watsonData).then((result) => {
              delete watsonData.context.orderReserved
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "select_gift":
            Gera.selectGift(watsonData).then((result) => {
              delete watsonData.context.giftProductCode
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "check_addresses":
            Gera.checkAddresses(watsonData).then((result) => {
              delete watsonData.context.hasGifts
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break
          case "select_address":
            Gera.selectAddress(watsonData).then((result) => {
              delete watsonData.context.addresses
              delete watsonData.context.hasAddresses
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "check_delivery_options":
            Gera.checkDeliveryOptions(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;

          case "select_delivery_option":
            Gera.selectDeliveryOption(watsonData).then((result) => {
              delete watsonData.context.deliveryOptions
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;

          case "check_payment_list":
            Gera.checkPaymentList(watsonData).then((result) => {
              delete watsonData.context.deliveryOptionSelected
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "select_payment_plan":
            Gera.selectPaymentPlan(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "check_payment_installments":
            Gera.checkInstallments(watsonData).then((result) => {
              delete watsonData.context.paymentPLans
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "get_total":
            Gera.getTotal(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "close_cart":
            Gera.closeCart(watsonData).then((result) => {
              delete watsonData.context.order
              delete watsonData.context.hasOrders
              delete watsonData.context.newOrder
              delete watsonData.context.createNewOrder
              delete watsonData.context.hasSuggestions
              delete watsonData.context.suggestionsProducts
              delete watsonData.context.hasPromotions
              delete watsonData.context.promotions
              delete watsonData.context.orderReserved
              delete watsonData.context.hasGifts
              delete watsonData.context.addresses
              delete watsonData.context.hasAddresses
              delete watsonData.context.deliveryOptions
              delete watsonData.context.deliveryOptionSelected
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "delete_order":
            Gera.deleteOrder(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              if (result.orderDeleted) {
                delete watsonData.context.order
                delete watsonData.context.hasOrders
                delete watsonData.context.newOrder
                delete watsonData.context.hasSuggestions
                delete watsonData.context.suggestionsProducts
                delete watsonData.context.hasPromotions
                delete watsonData.context.promotions
                delete watsonData.context.orderReserved
                delete watsonData.context.hasGifts
                delete watsonData.context.addresses
                delete watsonData.context.hasAddresses
                delete watsonData.context.deliveryOptions
                delete watsonData.context.deliveryOptionSelected
              }

              Gera.checkUserOrders(watsonData).then((result) => {
                watsonData.context = Object.assign({}, watsonData.context, result)
                sendToWatson({ context: watsonData.context }).then(data => resolve(data))
              })


            })
            break;
          case "check_productCode":
            Gera.checkProductCode(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "check_productCode_remove":
            Gera.checkProductCodeRemove(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "edit_product":
            Gera.editProduct(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "remove_product":
            Gera.removeProduct(watsonData).then((result) => {
              delete watsonData.context.removeProductCode
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;
          case "remove_product_added_context":
            delete watsonData.context.productAdded
            resolve(watsonData)
            break;
          case "show_substitute_products":
            delete watsonData.context.productAdded
            delete watsonData.context.hasSubstitutes
            resolve(watsonData)
            break;
          case "remove_add_context":
            delete watsonData.context.productAdded
            delete watsonData.context.hasSubstitutes
            resolve(watsonData)
            break;

          case "reset_quantity":
            delete watsonData.context.quantityNumber
            resolve(watsonData)
            break;
          default:
            resolve(watsonData)
            break;
        }
      } else {
        resolve(watsonData)
      }
    }).catch((err) => {
      console.log('An error occured Bot.sendMessage')
      console.log(err)
    })
  })
}


function QuickReplies(payload, action) {
  let quick_replies = []
  switch (action) {
    case 'businessModels':
      quick_replies = payload.reduce((acc, curr) => {
        acc.push({
          title: curr.name,
          type: 'button',
          payload: {
            value: curr.code
          }
        })
        return acc
      }, [])
      break;

    case 'deliveryModes':
      quick_replies = payload.reduce((acc, curr) => {
        acc.push({
          title: curr.address,
          type: 'button',
          payload: {
            value: curr.code
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
                type: 'checklist',
                payload: {
                  value: curr.code,
                  listCode: curr.code,
                  listProducts: curr.products.map(product => ({ code: product.code, name: product.name }))
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


app.post('/api/getPromotions', (req, res) => {
  Gera.checkPromotions(req.body).then((result) => {
    res.status(200).json(result)
  })
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
