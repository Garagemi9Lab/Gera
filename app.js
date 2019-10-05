var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var app = express();
require('dotenv').load()

var Bot = require('./buildSrc/Conversation/bot')
var Gera = require('./buildSrc/Gera')

var helpers = require('./buildSrc/helpers')

var QuickReplies = helpers.QuickReplies
var CustomMessage = helpers.CustomMessage
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
    params.context = {
      userPayload: {
        user: params.loggedUser,
        tokens: {}
      },
      timezone: "America/Sao_Paulo"
    }
    params.input.action = 'startChat'
  }
  sendToWatson(params).then((watsonData) => {
    res.status(200).json(watsonData)
  }).catch((error) => {
    console.log('Error')
    console.log(error)
  })
})

const sendToWatson = (params) => {
  console.log('send to watson method invoked.. ')
  return new Promise((resolve, reject) => {
    Bot.sendMessage(params).then((watsonData) => {
      if (watsonData.output && watsonData.output.action) {
        switch (watsonData.output.action) {

          case "get_order_token":
            Gera.getOrderToken(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              sendToWatson({ context: watsonData.context }).then((data) => resolve(data))
            })
            break;

          case "get_renegotiation_token":
            Gera.getRenegotiationToken(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              sendToWatson({ context: watsonData.context }).then((data) => resolve(data))
            })
            break;

          case "get_SAC_token":

            Gera.getSACToken(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              sendToWatson({ context: watsonData.context }).then((data) => resolve(data))
            })
            break;

          case "check_user_informations":
            Gera.checkUserInformations(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              sendToWatson({
                context: watsonData.context,
                input: result.input
              }).then((data) => resolve(data))
            }).catch(error => {
              console.log('Error on checking user info')
              console.log(error)
            })
            break;

          case "check_system_parameters":
            Gera.checkSystemParameters(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.userPayload.parameters) {
                params.input = {
                  action: 'checkOpenOrders'
                }
              }
              sendToWatson(
                params
              ).then(data => resolve(data))
            }).catch(err => {
              console.log("Error on checking system parameters")
              console.log(err)
            })
            break;

          case "check_overdue_installments":
            Gera.checkOverDueInstallments(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then((data) => resolve(data))
            })
            break;

          case "get_installments":
            Gera.getInstallments(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = {
                action: result.input.action,
                quick_replies: new QuickReplies(watsonData.context.userPayload.installments, 'installments')
              }
              sendToWatson(params).then((data) => resolve(data))
            })
            break;

          case "select_installment":

            Gera.selectInstallment(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = {
                action: result.input.action,
                quick_replies: new QuickReplies(watsonData.context.userPayload.renegotiationPaymentPlans, 'renegotiationPaymentPlans')
              }
              sendToWatson(params).then((data) => resolve(data))

            })
            break;

          case "select_renegotiation_payment_plan":
            Gera.selectRenegotiationPaymentPlan(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = {
                action: result.input.action,
                quick_replies: new QuickReplies(watsonData.context.userPayload.simulatedInstallments, 'simulatedInstallments')
              }
              sendToWatson(params).then((data) => resolve(data))
            })
            break;

          case "make_renegotiation":
            Gera.makeRenegotiation(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then((data) => resolve(data))
            })
            break;

          case "check_open_orders":
            Gera.checkOpenOrders(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              if (result.input && result.input.openOrder) result.input.data = CustomMessage(result.userPayload.order, 'order')
              sendToWatson({
                context: watsonData.context,
                input: result.input
              }).then((data) => resolve(data))
            }).catch(error => {
              console.log('Error on checking user info')
              console.log(error)
            })
            break;

          case "get_business_models":
            Gera.getBusinessModels(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              if (result.input && result.input.hasBusinessModels) params.input = {
                action: 'showBusinessModels',
                quick_replies: new QuickReplies(result.userPayload.businessModels, 'businessModels')
              }
              sendToWatson(params).then((data) => resolve(data))
            }).catch(error => {
              console.log('Error on getting business models')
              console.log(error)
            })
            break;

          case "select_business_model":
            Gera.getBusinessModelDeliveryMode(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              let params = { context: watsonData.context }
              if (result.input) params.input = {
                action: 'showDeliveryModes',
                quick_replies: new QuickReplies(result.userPayload.deliveryModes, 'deliveryModes')
              }
              sendToWatson(params).then((data) => resolve(data))
            })
            break;

          case "select_BM_delivery_mode":
            Gera.getCycles(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              sendToWatson({
                context: watsonData.context,
                input: {
                  action: 'showCycles',
                  quick_replies: new QuickReplies(result.userPayload.cycles, 'cycles')
                }
              }).then((data) => resolve(data))
            })
            break;
          // disable select kits
          // case 'select_cycle':
          //   Gera.getStarterKit(watsonData).then((result) => {
          //     watsonData.context = Object.assign({}, watsonData.context, result)
          //     let params = { context: watsonData.context }
          //     if (result.userPayload.starterKits) params.input = {
          //       action: 'showStarterKits',
          //       quick_replies: new QuickReplies(result.userPayload.starterKits, 'starterKits')
          //     }
          //     sendToWatson(params).then((data) => resolve(data))
          //   })
          //   break;
          case 'select_cycle':
            Gera.selectCycle(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              Gera.createNewOrder(watsonData).then((result) => {
                watsonData.context = Object.assign({}, watsonData.context, result)
                let params = { context: watsonData.context }
                if (result.input) params.input = result.input
                sendToWatson(params).then((data) => resolve(data))
              })
            })
            break;
          case "select_kits":
            Gera.selectKit(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, result)
              Gera.createNewOrder(watsonData).then((result) => {
                watsonData.context = Object.assign({}, watsonData.context, result)
                sendToWatson({
                  context: watsonData.context,
                  input: {
                    action: 'newOrder'
                  }
                }).then((data) => resolve(data))
              })
            }).catch(() => {
              console.log('Error on selecting kits')
            })
            break;

          case 'get_stock':
            Gera.checkStock(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then((data) => resolve(data))
            }).catch(error => {
              console.log('Error on checking product stock')
              console.log(error)
            })
            break;

          case "get_product_to_add":
            Gera.getProductToAdd(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              sendToWatson({
                context: watsonData.context,
                input: result.input
              }).then((data) => resolve(data))
            })
            break;

          case "check_product_replace":
            Gera.checkProductReplacement(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              if (result.input && result.input.hasSubstitutes && result.input.hasSubstitutes == true) result.input.data = CustomMessage(result.userPayload.substitutions, 'substitutions')
              sendToWatson(params).then((data) => resolve(data))
            })
            break;

          case "add_product":
            Gera.addProductToCart(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            }).catch((err) => {
              console.log('An error occured on add product method. ')
              console.log(err)
            })
            break;

          case "delete_order":
            Gera.deleteOrder(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            }).catch((err) => {
              console.log('Error on deleting the order')
              console.log(err)
            })
            break;

          case "check_productCode":
            Gera.checkProductCode(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              sendToWatson({
                context: watsonData.context,
                input: result.input
              }).then(data => resolve(data))
            })
            break;

          case "edit_product":
            Gera.editProduct(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_productCode_remove":
            Gera.checkProductCodeRemove(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              sendToWatson({
                context: watsonData.context,
                input: result.input
              }).then(data => resolve(data))
            })
            break;

          case "remove_product":
            Gera.removeProduct(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_promotions":
            Gera.checkPromotions(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) {
                if (result.input.hasPromotions && result.input.hasPromotions == true) {
                  result.input.data = CustomMessage(watsonData.context.userPayload.promotions, 'promotions')
                }
                params.input = result.input
              }
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "reserve_order":
            Gera.reserverOrder(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_order_state":
            Gera.checkOrderState(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input && result.input.openOrder) result.input.data = CustomMessage(result.userPayload.order, 'order')
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_minimum_points_quantity":
            Gera.checkMinimumPointsQuantity(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_suggestions":
            Gera.checkSuggestions(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              if (result.input && result.input.hasSuggestions) result.input.data = CustomMessage(watsonData.context.userPayload.suggestionsProducts, 'suggestionsProducts')
              sendToWatson({
                context: watsonData.context,
                input: result.input
              }).then(data => resolve(data))
            })
            break;

          case "check_partial_promotions":
            Gera.checkPartialPromotions(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) {
                if (result.input.hasPartialPromotions) result.input.data = CustomMessage(watsonData.context.userPayload.order.partialPromotions, 'partialPromotions')
                params.input = result.input
              }
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_acquired_promotion":
            Gera.checkAcquiredPromotion(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) {
                if (result.input.hasAcquiredPromotions) result.input.data = CustomMessage(watsonData.context.userPayload.order, 'acquiredPromotion')
                params.input = result.input
              }
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_gifts":
            Gera.checkGifts(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) {
                if (result.input.hasGifts) {
                  result.input.data = CustomMessage(watsonData.context.userPayload.gifts, 'gifts')
                }
                params.input = result.input
              }
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_conditional_sales":
            Gera.checkConditionalSales(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input && result.input.hasConditionalSales) {
                result.input.quick_replies = new QuickReplies(result.userPayload.conditionalSales, 'conditionalSales')
              }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "select_conditional_sales_items":
            Gera.selectConditionalSalesItems(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              sendToWatson({
                context: watsonData.context,
                input: result.input
              }).then(data => resolve(data))
            })
            break;

          case "check_addresses":
            Gera.checkAddresses(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              if (result.input.hasAddresses) result.input.quick_replies = new QuickReplies(result.userPayload.addresses, 'addresses')
              sendToWatson({
                context: watsonData.context,
                input: result.input
              }).then(data => resolve(data))
            })
            break;

          case "select_address":
            Gera.selectAddress(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "check_delivery_options":
            Gera.checkDeliveryOptions(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) {
                if (result.input.hasDeliveryOptions) result.input.quick_replies = new QuickReplies(result.userPayload.deliveryOptions, 'deliveryOptions')
                params.input = result.input
              }
              sendToWatson({ context: watsonData.context }).then(data => resolve(data))
            })
            break;

          

          case "redirect_to_external_cart":
            Gera.redirectToCart(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "get_notification_structures_parent":
            Gera.getNotificationStructuresParents(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = {
                hasNotificationStructures: result.input.hasNotificationStructures,
              }

              if (params.input.hasNotificationStructures == true) {
                params.input.quick_replies = new QuickReplies(result.userPayload.notificationStructuresParents, 'notificationStructuresParents')
              }
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "select_notification_parent":
            Gera.selectNotificationStructureParent(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input

              if (result.input.selectedNotifications == true) {
                params.input.quick_replies = new QuickReplies(result.userPayload.selectedNotificationParent, 'selectedNotificationParent')
              }

              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "get_leaf_notification_structures":
            Gera.getLeafNotificationStructures(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = {
                hasLeafSuggestions: result.input.hasLeafSuggestions
              }

              if (result.input.hasLeafSuggestions == true) {
                params.input.quick_replies = new QuickReplies(result.userPayload.selectedNotificationsLeaf, 'selectedNotificationsLeaf')
              }

              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "create_notification_sac":
            Gera.createNotificationSAC(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "get_notification_questions":
            Gera.getNotificationQuestions(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "get_question_answers":
            Gera.getSACQuestionAnswers(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              if (params.input.hasQuestionAnswers) {
                params.input.quick_replies = new QuickReplies(watsonData.context.userPayload.SAC.questionAnswers, 'SACQuestionAnswers')
              }
              sendToWatson(params).then(data => resolve(data))
            })
            break;
          case "answer_SAC_questions":
            Gera.answerSACQuestions(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "close_sac_notification":
            Gera.closeSACNotification(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              sendToWatson(params).then(data => resolve(data))
            })
            break;

          case "get_notifications_sac":
            Gera.getSACNotifications(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              if (params.input.hasNotifications && params.input.hasNotifications == true) {
                params.input.quick_replies = new QuickReplies(watsonData.context.userPayload.SAC.notifications, 'SACNotifications')
              }
              sendToWatson(params).then(data => resolve(data))
            })

            break;

          case "get_notification_sac_details":
            Gera.getNotificationSACDetails(watsonData).then((result) => {
              watsonData.context = Object.assign({}, watsonData.context, { userPayload: result.userPayload })
              let params = { context: watsonData.context }
              if (result.input) params.input = result.input
              if (result.input.gotNotificationDetails && result.input.gotNotificationDetails == true) {
                params.input.data = CustomMessage(result.userPayload.SAC.notificationDetails, 'notificationDetails')
              }
              sendToWatson(params).then(data => resolve(data))
            })
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