## SSL and TLS Certificates

TLS/SSL End Points requests or installs a certificate for a domain/site that's been provisioned.


### Order a Certificate ##

Place an order for a new ssl/tls certificate (note if common name/domain names contains a `*.domain.com` then a wildcard cert is issued), if more than one domain is requested a multi_domain cert is issued, if there is only one domain in the domain_names a single ssl/tls certificate is issued.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
|  name   | required string | An alpha numeric name representing the certificate | "my-cert" |
|  common_name   | required string | The main domian listed on the certificate, note if a star is used a wildcard certificate will be ordered (e.g., *.example.com) | "www.example.com" |
|  domain_names  | required array[string] | A list of domai names covered by this certificate, must include the common name | ["example.com","www.example.com","qa.example.com","dev.example.com"] |
|  org  | required uuid | The uuid or name of the organization responsible for ordering and maintaining the certificate | "performance" |
|  comments  | optional string | A description of what the purpose of the certificate is for info-sec. | "We need a new cert for our platform work" |
|  region  | optional string | The region in which to order the certificate for | us-seattle |

`POST /ssl-orders`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  -d '{"name":"my-cert" "common_name":"www.example.com", "domain_names":["example.com","www.example.com","qa.example.com","dev.example.com"], "org":"performance", "comments":"We need a new cert for our platform work"}' \
  https://apps.akkeris.io/ssl-orders
```

**201 "Created" Response**

```json
{
  "created_at":"2016-07-26T15:47:33.411Z",
  "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  "name":"my-cert",
  "comments":"We need a new cert for our platform work", 
  "requester":{
    "name":"Sammy Smith"
  },
  "organization":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"performance"
  },
  "common_name":"www.example.com",
  "domain_names":[
    "example.com",
    "www.example.com",
    "qa.example.com",
    "dev.example.com"
  ],
  "installed":false,
  "status":"pending",
  "region":{
     "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "expires":"2016-07-26T15:47:33.411Z",
  "issued":"2016-07-26T15:47:33.411Z",
  "updated_at":"2016-07-26T15:47:33.411Z",
  "type":"multi_domain"
}
```

**422 Unprocessable Entity**

This certificate occurs when an existing certificate already explicitly covers one or more of the domains listed (wildcards do not count). 

**400 Bad Request**

This may occur if a certificate domain name is invalid.


### Install a Certificate ##

Once a certificates status becomes "issued" a certificate may be installed into the load balancer, any site using the specified domain will immediately begin using this certificate.


`PUT /ssl-orders/{ssl_certificate_id_or_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PUT \
  https://apps.akkeris.io/ssl-orders/7edbac4b-6a5e-09e1-ef3a-08084a904621
```

**201 "Created" Response**

```json
{
  "created_at":"2016-07-26T15:47:33.411Z",
  "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  "name":"my-cert",
  "comments":"We need a new cert for our platform work",
  "requester":{
    "name":"Sammy Smith"
  },
  "organization":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"performance"
  },
  "common_name":"www.example.com",
  "domain_names":[
    "example.com",
    "www.example.com",
    "qa.example.com",
    "dev.example.com"
  ],
  "region":{
     "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "installed":true,
  "status":"issued",
  "expires":"2016-07-26T15:47:33.411Z",
  "issued":"2016-07-26T15:47:33.411Z",
  "updated_at":"2016-07-26T15:47:33.411Z",
  "type":"multi_domain"
}
```

**422 Unprocessable Entity**

This certificate may not have been issued yet, or potentially was not approved and therefore uninstallable.

**409 Conflict**

This certificate may have already been installed or an existing conflict that requires info sec or cobra to intervene. Email cobra@akkeris.com if you encounter this error.


### List TLS/SSL Orders ##

Lists all tls and ssl orders that are pending.  Note this will NOT re-check the statuses, it's important to request the info on
the specific order to see if the status has changed rather than on the list.

`GET /ssl-orders`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/ssl-orders
```

**200 "OK" Response**

```json
[
  {
    "created_at":"2016-07-26T15:47:33.411Z",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"example-cert",
    "comments":"Needed for x, y, z",
    "requester":{
      "name":"Sammy Smith"
    },
    "organization":{
      "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
      "name":"my-org"
    },
    "common_name":"www.example.com",
    "domain_names":[
      "www.example.com"
    ],
    "region":{
      "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
      "name":"us-seattle"
    },
    "installed":false,
    "status":"rejected",
    "expires":"2016-07-26T15:47:33.411Z",
    "issued":"2016-07-26T15:47:33.411Z",
    "updated_at":"2016-07-26T15:47:33.411Z",
    "type":"ssl_plus"
  }
]
```

### Get Certificate Order Status

`GET /ssl-orders/{certificate_name_or_id}`

Check the status of a specific ssl/tls order, this will fetch any new changes to the status of the certificate.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/ssl-orders
```

**200 "OK" Response**

```json
{
  "created_at":"2016-07-26T15:47:33.411Z",
  "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  "name":"example-cert",
  "comments":"Needed for x, y, z",
  "requester":{
    "name":"Sammy Smith"
  },
  "organization":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"my-org"
  },
  "common_name":"www.example.com",
  "domain_names":[
    "www.example.com"
  ],
  "region":{
     "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "installed":false,
  "status":"pending",
  "expires":"2016-07-26T15:47:33.411Z",
  "issued":"2016-07-26T15:47:33.411Z",
  "updated_at":"2016-07-26T15:47:33.411Z",
  "type":"ssl_plus"
}
```


### List TLS/SSL End Points ##

Lists all tls and ssl endpoints that are installed and available

`GET /ssl-endpoints`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/ssl-endpoints
```

**200 "OK" Response**

```json
[
  {
    "created_at":"2016-07-26T15:47:33.411Z",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"example-cert",
    "comments":"Needed for x, y, z",
    "requester":{
      "name":"Sammy Smith"
    },
    "organization":{
      "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
      "name":"my-org"
    },
    "common_name":"www.example.com",
    "domain_names":[
      "www.example.com"
    ],

    "region":{
       "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
       "name":"us-seattle"
    },
    "installed":true,
    "status":"approved",
    "expires":"2016-07-26T15:47:33.411Z",
    "issued":"2016-07-26T15:47:33.411Z",
    "updated_at":"2016-07-26T15:47:33.411Z",
    "type":"ssl_plus"
  }
]
```

### Get Certificate Information

Get information (CSR, expiration, certificate and ownership) on an installed TLS/SSL certificate.

`GET /ssl-endpoints/{certificate_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/ssl-endpoints
```

**200 "OK" Response**

```json
{
  "created_at":"2016-07-26T15:47:33.411Z",
  "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  "name":"example-cert",
  "comments":"Needed for x, y, z",
  "requester":{
    "name":"Sammy Smith"
  },
  "organization":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"my-org"
  },
  "common_name":"www.example.com",
  "domain_names":[
    "www.example.com"
  ],
  "region":{
     "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "installed":true,
  "status":"approved",
  "expires":"2016-07-26T15:47:33.411Z",
  "issued":"2016-07-26T15:47:33.411Z",
  "updated_at":"2016-07-26T15:47:33.411Z",
  "type":"ssl_plus"
}
```
