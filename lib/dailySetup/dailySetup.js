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


/******************** functions */

// filter orders to process
const filterCustomers = async (fullOrderList, dateObject) => {
    const activeCustomers = fullOrderList.filter(customer => {
        return customer.pause_active === 0 || (customer.pause_active === 1 && (customer.pause_orders_start > dateObject.deliveryDate || customer.pause_orders_end < dateObject.deliveryDate))
    })

    return activeCustomers;
}

// create items list
const createOrderItemsList = async (customer, dateObject) => {
    const items = [];
    let standing_order = 0;

    // get customer order list
    const fullOrderList = await docSearch.docDetails(`Standing Order`, customer.name)
    console.log(customer.name)
    // filter for today's orders
    const activeOrderList = fullOrderList.orders.filter(order => order[`${dateObject.deliveryDay}`] === 1)

    // create item list
    if (activeOrderList.length) {
        for (let i = 0; i < activeOrderList.length; i++) {
            const orderItems = await docSearch.docDetails(`Quotation`, activeOrderList[i].quote)
            orderItems.items.forEach(item => items.push(item))
            if (standing_order === 0 && orderItems.standing_order === 1) {
                standing_order = 1
            }
        }
        activeOrderList.forEach(async order => {
        })
    }
    return { items, standing_order }
}

// consolidate items list
const consolidateItems = (items) => {
    const finalItems = [];

    for (let i = 0; i < items.length; i++) {
        const found = finalItems.findIndex(item => item.item_code === items[i].item_code);
        if (found === -1) {
            const itemPayload = {
                "item_code": items[i].item_code,
                "item_name": items[i].item_name,
                "qty": items[i].qty,
                "uom": items[i].uom

            }
            finalItems.push(itemPayload);
        } else {
            finalItems[found].qty += items[i].qty;
        }
    }

    return finalItems;
}

// create and post order
const postOrder = async (customer, custCode, items, dateObject) => {
    const payload = {
        "customer": customer,
        "customer_code": custCode,
        "transaction_date": dateObject.processingDate,
        "delivery_date": dateObject.deliveryDate,
        "group_same_items": 1,
        "items": items
    }

    const order = await docCrud.postDoc(`Sales Order`, payload)
    
    // log
    const newLog = await logging.newLogEntry(`Daily Setup: Created Sales Order ${order} for ${customer}, dated ${dateObject.processingDate}`)

    return order
}


// get customer code
const getCustCode = async (customer) => {    
    const custDetails = await docSearch.docDetails('Customer', customer);
    return custDetails.customer_code;
}

const createOrders = async (dateObject) => {
    // get list of orders to process
    const payload = {
        "fields": `["name", "customer", "pause_active", "pause_orders_start", "pause_orders_end"]`,
    }

    const dailyList = await docSearch.docSearch(`Standing Order`, payload);

    // filter out customers where customer is paused
    const filteredCustomerList = await filterCustomers(dailyList, dateObject);

    // process orders if any
    if (filteredCustomerList.length) {
        for (let i = 0; i < filteredCustomerList.length; i++) {

            // create items list
            const items = await createOrderItemsList(filteredCustomerList[i], dateObject);

            if (items.items.length) {
                // consolidate items
                const finalItems = consolidateItems(items.items)

                // get customer code
                const custCode = await getCustCode(filteredCustomerList[i].customer);



                // create and post order
                const postedOrder = await postOrder(filteredCustomerList[i].customer, custCode, finalItems, dateObject)

                if (items.standing_order) {
                    const submitOrder = await docCrud.submitDoc(`Sales Order`, postedOrder);
                }
            }
        }

        return (`Daily Setup: Created sales orders`)
    }

    return (`Daily Setup: No orders to process`)

}

const createDailyOrders = async (dateObject) => {

    // run order creation for today
    const todayOrders = await createOrders(dateObject);

    return { todayOrders }
}

module.exports = { createDailyOrders }