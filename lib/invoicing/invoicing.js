const { DateTime } = require("luxon");
require('dotenv').config();

// set up axios defaults
const axios = require('axios');
axios.defaults.baseURL = process.env.main_url;
axios.defaults.headers.common['Authorization'] = `token ${process.env.api_key}:${process.env.api_secret}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// import functions
const logging = require('../logging/logging');
const docSearch = require('../functions/docTypes/search');
const docCrud = require('../functions/docTypes/crud');
const dates = require('../functions/utility/date');
const dr = require('../dailyRun/dailyRun')


/******************** functions */
// checks system has been set up for doctype
const initialCheck = async (interval, date) => {
    const payload = {
        "filters": `[["start_date", "<=", "${date}"], ["end_date", ">=", "${date}"]]`
    }
    const check = await docSearch.docSearch(`Invoicing ${interval}`, payload);
    return check
}

const findLastFriday = (today) => {
    const thisMonthDays = today.daysInMonth;
    let lastDay = DateTime.fromObject({year: today.year, month: today.month, day: thisMonthDays})

    if (lastDay.weekday != 5) {
        do {
            lastDay = lastDay.minus({days: 1});
        } while (lastDay.weekday != 5)
    }

    return lastDay;

}

const createMonthly = (date) => {
    let today = DateTime.fromISO(date);
    let processingDay, startDay, endDay;

    processingDay = findLastFriday(today).toISODate();
    startDay = findLastFriday(DateTime.fromISO(today.minus({months: 1}))).plus({days: 4}).toISODate();
    endDay = DateTime.fromISO(processingDay).plus({days: 3}).toISODate();

    return { processingDay, startDay, endDay }

}

const createWeekly = (interval, date) => {
    let today = DateTime.fromISO(date);
    let processingDay, startDay, endDay;

    switch (interval) {
        case 'Weekly': processingDay = today.set({weekday: 5}).toISODate(); break;
        case 'Fortnightly': processingDay = today.set({weekday: 5}).plus({days: 7}).toISODate(); break;
        case 'Monthly': break;
    }

    startDay = today.set({weekday: 2}).toISODate()
    endDay = DateTime.fromISO(processingDay).plus({days: 3}).toISODate();

    return { processingDay, startDay, endDay };
}

const createInitial = async (interval, date) => {

    //let processingDay, startDay, endDay;
    if (interval === 'Weekly' || interval === "Fortnightly") {
        const { processingDay, startDay, endDay } = createWeekly(interval, date)
        return { processingDay, startDay, endDay}
    } else if (interval === 'Monthly') {
        const { processingDay, startDay, endDay } = createMonthly(date) 
        return { processingDay, startDay, endDay}   
    }
}

const prepareInitial = async (date, intervals = ['Weekly', 'Fortnightly', 'Monthly']) => {

    
    // check if documents exist
    for (let i = 0; i < intervals.length; i++) {
        // get processing dates
        let initial = await createInitial(intervals[i], date);

        // check if monthly date needs to be shifted one month forward
        if (intervals[i] === 'Monthly'  && date > initial.endDay) {
            const newDate = DateTime.now().plus({months: 1}).set({day: 1}).toISODate();
            initial = await createInitial(intervals[i], newDate);
        };

        const exists = await initialCheck(intervals[i], date, initial.startDay, initial.endDay);
        if (exists.length === 0) {
            // create document
            const payload = {
                "processing_date": initial.processingDay,
                "start_date": initial.startDay,
                "end_date": initial.endDay
            };

            const post = await docCrud.postDoc(`Invoicing ${intervals[i]}`, payload);
            const submit = await docCrud.submitDoc(`Invoicing ${intervals[i]}`, post);

            if (intervals.length === 1) { return post}
        };
    };

    
};

/******************* Invoice Processing */

const checkRuns = async (interval, date) => {
    // get invoicing list
    const payload = {
        "filters" : `[["processing_date", "=", "${date}"]]`,
        "fields": `["*"]`
    };

    const processingListNumber = await docSearch.docSearch(`Invoicing ${interval}`, payload);

    return processingListNumber

}

const createInvoiceLineItems = async (items, order) => {
    const output = [];

    items.forEach(item => {
        const itemDetails = {
            "item_code":item.item_code,
            "item_name": item.item_name,
            "description": item.description,
            "item_group": "All Item Groups",
            "qty": item.qty,
            "uom": "Nos",
            "sales_order": item.against_sales_order,
            "so_detail": item.so_detail,
            "delivery_note": order,
            "dn_detail": item.name,
        }

        output.push(itemDetails);
    })

    return output;
}



const processInvoices = async (date) => {

    const intervals = ['Weekly', 'Fortnightly', 'Monthly'];

    
    //for (let i = 0; i < intervals.length; i++) {
    intervals.forEach(async interval => {
        const invoiceList = await checkRuns(interval, date);
        
        if (invoiceList.length) {
            const icPayload = {
                "filters": `[["invoicing_frequency", "=", "${interval}"]]`
            }
            const intervalCustomers = await docSearch.docSearch(`Customer`, icPayload);

            intervalCustomers.forEach(async customer => {
                const dnPayload = {
                    "filters": `[["customer", "=", "${customer.name}"], ["status", "=", "To Bill"], ["lr_date", ">=", "${invoiceList[0].start_date}"], ["lr_date", "<=", "${invoiceList[0].end_date}"]]`,
                };

                const searchOrders = await docSearch.docSearch(`Delivery Note`, dnPayload);

                if (searchOrders.length) {
                    const items = [];

                    for (let i = 0; i < searchOrders.length; i++) {
                        const orderDetails = await docSearch.docDetails(`Delivery Note`, searchOrders[i].name)
                        const lineItems = await createInvoiceLineItems(orderDetails.items, searchOrders[i].name);
                        lineItems.forEach(item => items.push(item))
                    }

                    const invoicePayLoad = {
                        "customer": customer.name,
                        //"due_date": date,
                        "items": items,
                        "group_same_items": 1
                    }

                    const createInvoice = await docCrud.postDoc(`Sales Invoice`, invoicePayLoad);
                    const submitInvoice = await docCrud.submitDoc(`Sales Invoice`, createInvoice);
                }
            })
        }
    })
}



module.exports = { prepareInitial, createInitial, initialCheck, processInvoices}