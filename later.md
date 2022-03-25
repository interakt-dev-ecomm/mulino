# cron jobs
    # daily: 
        - /daily-setup/today (except saturday, sunday)
        - /daily-run/eod (except saturday, sunday)

    # monday
        - /invoicing/prepare

    # friday
        - /invoicing/create-invoices


# notifications
    - new sales order => customer
    - new delivery note => customer (plus updated)
    - new invoice => customer
    - new purchase order => bakery (plus updated)
    - daily run completed => mauro
    - end of day completed => mauro, driver
    - unpaid invoice reminder => customer

# print formats
    - customise for each notification


# updates

overdue invoice notification change to start if outstanding balance rather than date, then account on hold if still not paid 10 days later
//introduce customer code 
overdue notifications: only create if doesn't exist



http://localhost:3000/invoicing/prepare
http://localhost:3000/daily-setup/today
http://localhost:3000/daily-run/eod


http://localhost:3000/invoicing/create-invoices
http://localhost:3000/invoicing/overdue