var express = require('express');
var router = express.Router();
const { DateTime } = require("luxon");
require('dotenv').config();


/********************* daily run report */
router.post('/dailyRun', async(req, res, next) => {
    const date = DateTime.now().toISODate();

    res.json({'status': `Creating Daily Run Report for ${date}`});
})


router.post('/eod', async(req, res, next) => {
    const date = DateTime.now().toISODate();

    res.json({'status': `Creating End of Day Report for ${date}`});
})

module.exports = router;
