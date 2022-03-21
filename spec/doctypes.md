# End of Day

End of Day = {
    Date: Date 'date',
    Items to Pick Up: Section Break 'purchase_order_section',
    Purchase Order Items: Table 'purchase_order' >> End of Day PO,
    Deliveries: Section Break 'deliveries_section',
    Delivery Stops: Table 'delivery_stops' >> End of Day Delivery Trip,
    Item Allocation: Section Break 'item_allocation_section',
    Item Allocation: Table 'allocation' >> End of Day Item Allocation,
    Delivery details: Section Break 'delivery_details_section',
    Deliveries: Long Text 'deliveries',
}

End of Day Item Allocation (child) = {
    Item Code: Long Text 'item_code',
    Item: Long Text 'item',
    Total Quantity: Long Text 'total',
    Allocation: Long Text 'allocation'
}

End of Day Delivery Trip (child) = {
    Customer: Data 'customer',
    Address: Data 'address'
}

End of Day PO (child) = {
    Item Code: Data 'item_code',
    Item: Data 'item_name',
    Quantity: Data 'item_qty'
}

# Invoicing

{ Invoicing Weekly, Invoicing Fortnightly, Invoicing Monthly} = {
    Processing Date: Date 'processing_date',
    Period: Section Break 'period_section',
    Start Date: Date 'start_date',
    End Date: Date 'end_date',
    Orders: Section Break 'orders_section',
    Orders: Table 'orders' >> 'Invoicing Orders'
}

Invoicing Orders (child) = {
    Customer: Data 'customer',
    Delivery Note: Data 'order'
}

# Daily Run

Daily Run = {
    Date: Date 'date',
    Orders in Daily Run: Section Break 'section_stats',
    Number of orders: Data 'orders_found'
    Column Break: 'column_break_5',
    Number of Processed Orders: Data 'orders_processed'
    Processing Time: Section Break 'processing_time_section',
    Start Time: Data 'start_time',
    Column Break: 'column_break_9'
    End Time: Data 'end_time',
    Duration (hh:mm:ss): Data 'duration'
    Processed Orders: Section Break 'processed_orders_section'
    Orders: Table 'processed_orders' >> 'Daily Run Orders',
    Purchase Order: Section Break 'purchase_order_section'
    Purchase Order: Data 'purchase_order'
}

Daily Run Orders (child) = {
    Customer: Data 'customer',
    Sales Order: Data 'sales_order',
    Delivery Note: Data 'delivery_note'
}

# Standing Orders

Standing Order = {
    Customer: Link 'customer' > 'Customer',
    Section Break: 'orders_section',
    Standing Orders: Table 'orders' >> 'Standing Order Items',
    Pause Orders: Section Break 'pause_section',
    Orders Paused: Check 'pause_active',
    Column Break: 'column_break_6',
    Start Date: Date 'pause_orders_start',
    Column Break: 'column_break_8',
    End Date: Date 'pause_orders_end'
}

Standing Order Items (child) = {
    Template Quote: Link 'quote' > 'Quotation',
    Delivery Days: Section Break 'delivery_days_section',
    Monday: Check 'monday',
    Tuesday: Check 'tuesday',
    Wednesday: Check 'wednesday',
    Thursday: Check 'thursday',
    Friday: Check 'friday',
    Saturday: Check 'saturday'
}

# Activity Log

Automator Log = {
    Date: Data 'date',
    Event: Long Text 'event'
}