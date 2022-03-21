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
    - new delivery note => customer
    - new invoice => customer
    - daily run completed => mauro
    - end of day completed => mauro, driver
    - unpaid invoice reminder => customer

# print formats
    - customise for each notification







0 8 * * 0-5 curl -X POST http://localhost:3000/daily-setup/today
30 16 * * 0-5 curl -X POST http://localhost:3000/daily-run/eod
0 6 * * 1 curl -X POST http://localhost:3000/invoicing/prepare
0 17 * * 5 curl -X POST http://localhost:3000/invoicing/create-invoices