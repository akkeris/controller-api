## Invoices

Invoices provide a mechanism to check by organization, space or all up how much usage and costs have been incurred.

### List Invoices ##

Lists all invoices

`GET /account/invoices`
`GET /organization/{org}/invoices`
`GET /space/{org}/invoices`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/account/invoices
```

**200 "OK" Response**

```json
[
  {
    "$ref": "/account/invoices/2016-07-01"
  },
  {
    "$ref": "/account/invoices/2016-08-01"
  },
  {
    "$ref": "/account/invoices/2016-09-01"
  },
  {
    "$ref": "/account/invoices/2016-10-01"
  },
  {
    "$ref": "/account/invoices/2016-11-01"
  },
  {
    "$ref": "/account/invoices/2016-12-01"
  },
  {
    "$ref": "/account/invoices/2017-01-01"
  },
  {
    "$ref": "/account/invoices/2017-02-01"
  }
]
```

### Get a Invoice ##

Get information on an invoice

`GET /account/invoices/{invoice_id}`
`GET /organizations/{org}/invoices/{invoice_id}`
`GET /spaces/{org}/invoices/{invoice_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/account/invoices/2017-02-01
```

**200 "OK" Response**

```json
{
  "addons_total": 25,
  "database_total": 0,
  "charges_total": 213.51000000000005,
  "created_at": "2017-02-01T00:00:00.000Z",
  "credits_total": 0,
  "dyno_units": 61,
  "id": "2017-02-01",
  "number": "1485907200000",
  "payment_status": "Pending",
  "period_end": "2017-02-05T22:16:56.616Z",
  "period_start": "2017-02-01T00:00:00.000Z",
  "platform_total": 188.51000000000002,
  "state": 1,
  "total": 213.51000000000005,
  "updated_at": "2017-02-01T00:00:00.000Z",
  "weighted_dyno_hours": 7320,
  "items": [
    {
      "organization": "akkeris",
      "app": {
        "name": "app-space"
      },
      "description": "lang:dev addon",
      "type": "addon",
      "quantity": 1,
      "price_per_unit": 0,
      "billed_price": 0,
      "created_at": "2016-09-27T20:54:44.359Z",
      "deleted_at": null
    },
    {
      "organization": "akkeris",
      "app": {
        "name": "app-space"
      },
      "description": "alamo-redis:small addon",
      "type": "addon",
      "quantity": 1,
      "price_per_unit": 140,
      "billed_price": 25,
      "created_at": "2016-08-15T19:02:02.781Z",
      "deleted_at": null
    },
    {
      "organization": "akkeris",
      "app": {
        "name": "app-space"
      },
      "description": "gp2 web dyno",
      "type": "dyno",
      "quantity": 1,
      "price_per_unit": 60,
      "billed_price": 10.71,
      "created_at": "2016-07-26T15:47:33.411Z",
      "deleted_at": null
    },
    ...
  ]
}
```


