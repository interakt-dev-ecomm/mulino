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
const dailyFuncs = require('../functions/docTypes/dailyRun');



/******************** functions */

// create full report
const reportData = (orders_found = 0, orders_processed = 0, startTime = "", endTime = "", duration = "", processed_orders = [], purchase_order = "") => {
    const reportData = {
        "orders_found": orders_found,
        "orders_processed": orders_processed,
        "start_time": startTime,
        "end_time": endTime,
        "duration": duration,
        "processed_orders": processed_orders,
        "purchase_order": purchase_order
    }

    return reportData;
}


// add order details to main report
const reportOrderList = (customer, sales_order, delivery_note) => {
    const orderDetails = {
        "customer": customer,
        "sales_order": sales_order,
        "delivery_note": delivery_note
    }

    return orderDetails;
}

// get items from order
const getOrderItems = async (order) => {
    const items = await docSearch.docDetails(`Sales Order`, order);
    return items.items
}

// get items from delivery note
const getDeliveryItems = async (deliveryNote) => {
    const items = await docSearch.docDetails('Delivery Note', deliveryNote);
    return items.items
}

// create unique array
const createUnique = (array, searchField) => {
    const result = [];
    array.forEach(item => {
        const found = result.findIndex(toCheck => toCheck === item[searchField]);
        if (found === -1) {
            result.push(item[searchField]);
        }
    })

    return result;
}

// add items to list for delivery note
const addItems = async (ordersList, itemsVar, countVar) => {
    const items = [];
    let ordersCount = 0;

    for (let x = 0; x < ordersList.length; x++) {
            
        const orderItems = await getOrderItems(ordersList[x].name);

        orderItems.forEach(item => {
            const itemPayload = {
                "so_detail": item.name,
                "against_sales_order": ordersList[x].name,
                "item_code": item.item_code,
                "item_name": item.item_name,
                "description": item.description,
                "item_group": "All Item Groups",
                "qty": item.qty,
                "uom": "Nos",        
            }

            items.push(itemPayload)
        })
        ordersCount++;
    }
    return {[itemsVar]: items, [countVar]: ordersCount};
}


// main function

const processDailyRunMain = async (dateObject, runDoc) => {

    // get new sales orders, delivery notes and purchase orders
    const newSalesOrdersPayload = {
        "filters": `[["delivery_date", "=", "${dateObject.deliveryDate}"], ["status", "=", "To Deliver and Bill"]]`,
        "fields": `["name", "customer"]`
    }
    const newSalesOrders = await docSearch.docSearch(`Sales Order`, newSalesOrdersPayload);

    // if no new orders return
    if (newSalesOrders.length === 0) {
        console.log(`no new orders to process`)
        // const sendNoOrdersReport = await docCrud.updateDoc(`Daily Run`, runDoc, reportData());
        return;
    }

    // set stats variables for start of job
    const startTime = DateTime.now();
    const startTimeText = DateTime.now().toFormat('dd-MM-yyyy HH:MM:ss');
    
    // create unique customers list
    const customers = createUnique(newSalesOrders, 'customer');

    // get existing sales orders, delivery notes and purchase orders
    const existingSalesOrderPayload = {
        "filters": `[["delivery_date", "=", "${dateObject.deliveryDate}"], ["status", "=", "To Bill"]]`,
        "fields": `["name", "customer"]`
    }
    const existingSalesOrders = await docSearch.docSearch(`Sales Order`, existingSalesOrderPayload);


    const existingDeliveryNotesPayload = {
        "filters": `[["lr_date", "=", "${dateObject.deliveryDate}"], ["status", "!=", "Cancelled"]]`,
        "fields": `["name", "customer", "version", "status"]`
    }
    const existingDeliveryNotes = await docSearch.docSearch(`Delivery Note`, existingDeliveryNotesPayload);

    const existingPurchaseOrdersPayload = {
        "filters": `[["transaction_date", "=", "${dateObject.processingDate}"], ["status", "!=", "Cancelled"]]`
    }
    const existingPurchaseOrders = await docSearch.docSearch(`Purchase Order`, existingPurchaseOrdersPayload);

    const ordersProcessed = [];
    const purchaseItems = [];

    // create delivery notes
    for (i = 0; i < customers.length; i++) {
        const items = [];
        let deliveryVersion = 1;

        // get customer address
        // cancel existing delivery notes
        const custDeliveries = existingDeliveryNotes.filter(note => note.customer === customers[i])
        if (custDeliveries.length) {
            deliveryVersion += custDeliveries.length;
            custDeliveries.forEach(async delivery => {
                const cancelDelivery = await docCrud.cancelDoc(`Delivery Note`, delivery.name);
            })
        }

        // create new delivery note
        const newOrders = newSalesOrders.filter(order => order.customer === customers[i]);
        const existingOrders = existingSalesOrders.filter(order => order.customer === customers[i]);
        
        const { newItems, newOrdersCount } = await addItems(newOrders, 'newItems', 'newOrdersCount');
        const { previousItems, previousOrdersCount } = await addItems(existingOrders, 'previousItems', 'previousOrdersCount');

        newItems.forEach(item => {
            items.push(item)
            purchaseItems.push(item)
        });
        previousItems.forEach(item => items.push(item));

        // create deliveryNote payload
        const deliveryNotePayload = {
            "customer": customers[i],
            "processing_date": dateObject.processingDate,
            "delivery_date": dateObject.deliveryDate,
            "lr_date": dateObject.deliveryDate,
            "group_same_items": 1,
            "version": deliveryVersion,
            //"dispatch_address": customers[i].primary_address,
            items

        }
    
        // create delivery note
        const delivery = await docCrud.postDoc(`Delivery Note`, deliveryNotePayload);
        const submittedDelivery = await docCrud.submitDoc(`Delivery Note`, delivery)

        // create report item for each sales order
        newOrders.forEach(order => {
            const orderDetails = reportOrderList(customers[i], order.name, delivery);
            ordersProcessed.push(orderDetails);
        })

        existingOrders.forEach(order => {
            const orderDetails = reportOrderList(customers[i], order.name, delivery);
            ordersProcessed.push(orderDetails);
        })
    }

    // create purchase order
    let poVersion = 1;

    const poSearchPayload = {
        "filters": `[["transaction_date", "=", "${dateObject.processingDate}"]]`
    }

    const existingPos = await docSearch.docSearch(`Purchase Order`, poSearchPayload)
    
    if (existingPos.length) {
        poVersion += existingPos.length
    }


    const purchaseOrderPayload = {
        "supplier": "Harris Reeds Ltd",
        "transaction_date": dateObject.processingDate,
        "schedule_date": dateObject.processingDate,
        "group_same_items": 1,
        "items": purchaseItems,
        "version": poVersion
    };

    const postPurchaseOrder = await docCrud.postDoc(`Purchase Order`, purchaseOrderPayload);
    const submittedPurchaseOrder = await docCrud.submitDoc(`Purchase Order`, postPurchaseOrder);


    // set stats variables for end of job
    const endTime = DateTime.now();
    const endTimeText = DateTime.now().toFormat('dd-MM-yyyy HH:MM:ss');
    const duration = endTime.diff(startTime, ['hours', 'minutes', 'seconds']).toFormat('hh:mm:ss')    

    // create report
    const reportDetails = reportData(newSalesOrders.length, ordersProcessed.length, startTimeText, endTimeText, duration, ordersProcessed, postPurchaseOrder);
    const updateDailyRun = await docCrud.updateDoc(`Daily Run`, runDoc, reportDetails);
}





module.exports = { processDailyRunMain, createUnique }
