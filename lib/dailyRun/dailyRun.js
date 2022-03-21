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
    /*
        - check to see if this is only daily run for today
        - if first, start process normally
        - if more than one daily run, check which delivery notes need to be recreated,
            get items from new orders only for new purchase order
    */

    // set stats variables for start of job
    const startTime = DateTime.now();
    const startTimeText = DateTime.now().toFormat('dd-MM-yyyy HH:MM:ss');

    let version = 1;

    // check for daily runs
    const existingRuns = await dailyFuncs.checkRuns(dateObject.processingDate);


    // get orders to process
    const payload = {
        "filters": `[["delivery_date", "=", "${dateObject.deliveryDate}"], ["status", "=", "To Deliver and Bill"]]`,
        "fields": `["name", "customer"]`
    };

    const existingOrdersPayload = {
        "filters": `[["delivery_date", "=", "${dateObject.deliveryDate}"], ["status", "=", "To Bill"]]`,
        "fields": `["name", "customer"]`
    };

    const orders = await docSearch.docSearch(`Sales Order`, payload);
    const existingOrders = await docSearch.docSearch(`Sales Order`, existingOrdersPayload);

    if (!orders.length) {
        console.log(`no orders to process`);
        const sendNoOrdersReport = await docCrud.updateDoc(`Daily Run`, runDoc, reportData());
        return
    }


    const purchaseItems = [];
    const ordersProcessed = [];
    let purchaseOrder;

    // create unique customers list
    const customers = createUnique(orders, 'customer');

    // get list of all deliveries for day

    const deliveryNotePayload = {
        "filters": `[["lr_date", "=", "${dateObject.deliveryDate}"]]`,
        "fields": `["name", "customer", "version", "status"]`
    }
    const existingDeliveryNotes = await docSearch.docSearch(`Delivery Note`, deliveryNotePayload);


    // cycle through customers and create delivery note

    for (let i = 0; i < customers.length; i++) {

        // if delivery note exists, then cancel

        const customerDeliveries = existingDeliveryNotes.filter(exists => exists.customer === customers[i]);
        if (customerDeliveries.length) {
            // create new version
            const currentVersions = [];
            customerDeliveries.forEach(delivery => currentVersions.push(delivery.version))
            version = Math.max(... currentVersions) + 1

            // cancel delivery notes
            for (let i = 0; i < customerDeliveries.length; i++) {
                if (customerDeliveries[i].status === "To Bill") {
                    const cancelDelivery = await docCrud.cancelDoc(`Delivery Note`, customerDeliveries[i].name);
                } else if (customerDeliveries[i].status === "Draft") {
                    const deleteDelivery = await docCrud.deleteDoc(`Delivery Note`, customerDeliveries[i].name);
                }
            }
        }

        // get items for order
        const items = [];
        let ordersCount = 0;

        
        const newCustomerOrders = orders.filter(order => order.customer === customers[i])
        const existingCustomerOrders = existingOrders.filter(order => order.customer === customers[i])

        const { newItems, newOrdersCount } = await addItems(newCustomerOrders, 'newItems', 'newOrdersCount');
        const { previousItems, previousOrdersCount } = await addItems(existingCustomerOrders, 'previousItems', 'previousOrdersCount');

        // add items to list
        newItems.forEach(item => {
            items.push(item);
            purchaseItems.push(item)
        })

        previousItems.forEach(item => items.push(item));

        ordersCount = ordersCount + newOrdersCount + previousOrdersCount;
        console.log(`all items: `,items);
        console.log(`new items: `,purchaseItems)
        console.log(`total orders: `, ordersCount);



        // create deliveryNote payload
        const deliveryNote = {
            "customer": customers[i],
            "processing_date": dateObject.processingDate,
            "delivery_date": dateObject.deliveryDate,
            "lr_date": dateObject.deliveryDate,
            "group_same_items": 1,
            version,
            items
        }

        // // create deliverynote
        const delivery = await docCrud.postDoc(`Delivery Note`, deliveryNote);
        const submittedDelivery = await docCrud.submitDoc(`Delivery Note`, delivery)

        // create report item for each sales order
        newCustomerOrders.forEach(order => {
            const orderDetails = reportOrderList(customers[i], order.name, delivery);
            ordersProcessed.push(orderDetails);
        })

        existingCustomerOrders.forEach(order => {
            const orderDetails = reportOrderList(customers[i], order.name, delivery);
            ordersProcessed.push(orderDetails);
        })


    }

    // create purchase order

    const purchaseOrderPayload = {
        "supplier": "Test Supplier 1",
        "transaction_date": dateObject.processingDate,
        "schedule_date": dateObject.processingDate,
        "group_same_items": 1,
        "items": purchaseItems
    };

    const postPurchaseOrder = await docCrud.postDoc(`Purchase Order`, purchaseOrderPayload);
    const submittedPurchaseOrder = await docCrud.submitDoc(`Purchase Order`, postPurchaseOrder);
    



    // set stats variables for end of job
    const endTime = DateTime.now();
    const endTimeText = DateTime.now().toFormat('dd-MM-yyyy HH:MM:ss');
    const duration = endTime.diff(startTime, ['hours', 'minutes', 'seconds']).toFormat('hh:mm:ss')    

    // create report
    const reportDetails = reportData(orders.length, ordersProcessed.length, startTimeText, endTimeText, duration, ordersProcessed, postPurchaseOrder);
    const updateDailyRun = await docCrud.updateDoc(`Daily Run`, runDoc, reportDetails);
}


module.exports = { processDailyRunMain, createUnique }
