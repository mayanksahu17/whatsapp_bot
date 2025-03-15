// Import necessary modules using CommonJS syntax
const express = require('express');
const { notifyUsers, storeJobDetails, checkEmail ,sendMessage } = require('./controller.js');
const Router = express.Router;
const router = Router()


router.route('/notify').post(notifyUsers)
router.route('/store-job-details').post(storeJobDetails)
router.route('/check-email').post(checkEmail)
router.route('/send-message').post(sendMessage)


module.exports = {
    router
}