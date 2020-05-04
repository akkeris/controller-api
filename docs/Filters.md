## Filters

Filters enable various types of HTTP filters to be installed on applications.  HTTP filters can perform a variety of tasks such as authorization checks, header injection, CORS request controls and more.  Filters are first created (independently of applications) and then can be attached (or detached) to applications.

### Create a Filter

`POST /filters`

This immediately creates a new http filter that can be used. Note that the `name` and `type` cannot be updated once created.


|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|    org   | required string | Organization name, alphanumeric only                                                                                                                                                                       | akkeris                                                                                                                           |
|   name   | required string | The name of the filter (alpha numeric, no dashes or spaces or special characters)                                                                                                                          | auth-check                                                                                                                             |
|   type   | required string | The type of filter to use, can be "jwt".                                                                                                                    | jwt                                                                                                                        |
| description | string | Filter description, used for informational purposes  |  My akkeris http filter |
| options  | require object  | The object containing various properties that may or may not be required depending on the filter type. | `{}` |
| options.jwks_uri | string | If the filter is type `jwt` then this must be set to the well known JSON jwks url |  https://domain.com/.well-known/jwks.json |
| options.issuer | string | If the filter is type `jwt` then this must be set to the issuer for the JWT token (the `iss` field) |  https://domain.com |
| options.audiences | array of strings | If the filter is type `jwt` then this should be an array of audiences to validate on each request. If blank, or empty, the audience is not validated. | ["group1","group2"] |


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/filters -d '{"org":"test", "name":"auth-check", "type":"jwt", "description":"JWT Auth Check", "options":{"jwks_uri":"https://example.com/.well-known/jwks.json", "issuer":"https://example.com", "audiences":[]}}'
```

**201 "Created" Response**

```json
{
  "created_at": "2019-06-28T16:40:22.759Z",
  "description": "JWT Auth Check",
  "id": "77cc4e5f-c76e-bb04-b94d-62cc0d06df45",
  "options": {
    "jwks_uri": "https://example.com/.well-known/jwks.json",
    "issuer": "https://example.com"
  },
  "name": "auth-check",
  "type": "jwt",
  "organization": {
    "id": "0b26ccb5-83cc-4d33-a01f-100c383e0066"
  },
  "updated_at": "2019-06-28T16:40:22.759Z"
}
```

### List Filters

`GET /filters`

This retrieves a list of filters available to be attached to applications.

**CURL Example**

```bash
curl -H 'Authorization: ...' -X GET https://apps.akkeris.io/filters
```

***200 "OK" Response***

```json
[
  {
    "created_at": "2019-06-28T16:40:22.759Z",
    "description": "JWT Auth Check",
    "id": "77cc4e5f-c76e-bb04-b94d-62cc0d06df45",
    "options": {
      "jwks_uri": "https://example.com/.well-known/jwks.json",
      "issuer": "https://example.com"
    },
    "name": "auth-check",
    "type": "jwt",
    "organization": {
      "id": "0b26ccb5-83cc-4d33-a01f-100c383e0066"
    },
    "updated_at": "2019-06-28T16:40:22.759Z"
  }
]
```


### Get Filter

`GET /filters/{filter_id_or_name}`

Return information on a specific filter

**CURL Example**

```bash
curl -H 'Authorization: ...' -X GET https://apps.akkeris.io/filters/auth-check
```

***200 "OK" Response***

```json

{
  "created_at": "2019-06-28T16:40:22.759Z",
  "description": "JWT Auth Check",
  "id": "77cc4e5f-c76e-bb04-b94d-62cc0d06df45",
  "options": {
    "jwks_uri": "https://example.com/.well-known/jwks.json",
    "issuer": "https://example.com"
  },
  "name": "auth-check",
  "type": "jwt",
  "organization": {
    "id": "0b26ccb5-83cc-4d33-a01f-100c383e0066"
  },
  "updated_at": "2019-06-28T16:40:22.759Z"
}
```

### Destroy Filter

`DELETE /filters/{filter_id_or_name}`

Remove a filter from being available.  Any applications with the filter attached will have the filter detached from their application implicitly. The filter
will no longer have an effect on the next deployment of the applications attached to it. Only users with elevated access may remove a filter.

**CURL Example**

```bash
curl -H 'Authorization: ...' -X DELETE https://apps.akkeris.io/filters/auth-check
```

**200 "OK" Response**

```json
{
  "created_at": "2019-06-28T16:40:22.759Z",
  "description": "JWT Auth Check",
  "id": "77cc4e5f-c76e-bb04-b94d-62cc0d06df45",
  "options": {
    "jwks_uri": "https://example.com/.well-known/jwks.json",
    "issuer": "https://example.com"
  },
  "name": "auth-check",
  "type": "jwt",
  "organization": {
    "id": "0b26ccb5-83cc-4d33-a01f-100c383e0066"
  },
  "updated_at": "2019-06-28T16:40:22.759Z"
}
```

### Attach Filter

`POST /apps/{app_id_or_name}/filters`

Attaches a filter that's been created and applies it to incoming HTTP requests for this application (regardless if address in-cluster, from its app url or within)
a sites route. The excludes option provides a way to exclude a path (and its sub-directories) from the filter. If left blank the entire app is protected. More than
one excluded path may be provided.

|   Name           |       Type      | Description                                                  | Example                              |
|:----------------:|:---------------:|--------------------------------------------------------------|--------------------------------------|
| filter           | required object | An object representing the filter to attach.                 | `{}`                                 |
| filter.id        | required string | The uuid of the filter to attach.                            | 77cc4e5f-c76e-bb04-b94d-62cc0d06df45 |
| options          | required object | An object representing the options for the filter.           | `{}`                                 |
| options.excludes | optional array  | An array of paths to exclude from the filter.                | ["/images","/javascript","/css"]     |
| options.includes | optional array  | An array of paths to include the filter                      | ["/"]     |


**CURL Example**

```bash
curl -H 'Authorization: ...' \
    -X POST \
    https://apps.akkeris.io/apps/myapp-space/filters \
    -d '{"filter":{"id":"77cc4e5f-c76e-bb04-b94d-62cc0d06df45"}, "options":{"exludes":["/images","/javascript","/css"]}}'
```

**201 "Created" Response**

```json
{
  "created_at": "2019-06-28T20:12:38.157Z",
  "filter":{
    "created_at": "2019-06-28T16:40:22.759Z",
    "description": "JWT Auth Check",
    "id": "77cc4e5f-c76e-bb04-b94d-62cc0d06df45",
    "options": {
      "jwks_uri": "https://example.com/.well-known/jwks.json",
      "issuer": "https://example.com"
    },
    "name": "auth-check",
    "type": "jwt",
    "organization": {
      "id": "0b26ccb5-83cc-4d33-a01f-100c383e0066"
    },
    "updated_at": "2019-06-28T16:40:22.759Z"
  },
  "app": {
    "id": "1ed9a370-eea1-4665-a525-0cfcfbb6906f"
  },
  "id": "8717f0d3-5632-a2b9-0ec7-8a307c0ef5f0",
  "options": {
    "excludes":[
      "/images",
      "/javascript",
      "/css"
    ]
  },
  "updated_at": "2019-06-28T20:12:38.157Z"
}
```

### Detach Filter


`DELETE /apps/{app_id_or_name}/filters/{filter_attachment_id}`

Detach filter from the application.  This will cause the application to restart and the filter will be immediately applied both for
incoming http requests (regardless if in-cluster, through the application host, or through a site). 

**CURL Example**

```bash
curl -H 'Authorization: ...' \
     -X DELETE \
     https://apps.akkeris.io/apps/myapp-space/filters/8717f0d3-5632-a2b9-0ec7-8a307c0ef5f0
```

**200 "OK" Response**

```json
{
  "created_at": "2019-06-28T20:12:38.157Z",
  "filter":{
    "created_at": "2019-06-28T16:40:22.759Z",
    "description": "JWT Auth Check",
    "id": "77cc4e5f-c76e-bb04-b94d-62cc0d06df45",
    "options": {
      "jwks_uri": "https://example.com/.well-known/jwks.json",
      "issuer": "https://example.com"
    },
    "name": "auth-check",
    "type": "jwt",
    "organization": {
      "id": "0b26ccb5-83cc-4d33-a01f-100c383e0066"
    },
    "updated_at": "2019-06-28T16:40:22.759Z"
  },
  "app": {
    "id": "1ed9a370-eea1-4665-a525-0cfcfbb6906f"
  },
  "id": "8717f0d3-5632-a2b9-0ec7-8a307c0ef5f0",
  "options": {
    "excludes":[
      "/images",
      "/javascript",
      "/css"
    ]
  },
  "updated_at": "2019-06-28T20:12:38.157Z"
}
```

### List Attached Filters

`GET /apps/{app_id_or_name}/filters`

Returns a list of http filters for incoming requests that are applied. Note the order of the response does not correlate to the order in which a filter is applied.

**CURL Example**

```bash
curl -H 'Authorization: ...'\
     -X GET \
     https://apps.akkeris.io/apps/myapp-space/filters
```

**200 "OK" Response**

```json
[
  {
    "created_at": "2019-06-28T20:12:38.157Z",
    "filter":{
      "created_at": "2019-06-28T16:40:22.759Z",
      "description": "JWT Auth Check",
      "id": "77cc4e5f-c76e-bb04-b94d-62cc0d06df45",
      "options": {
        "jwks_uri": "https://example.com/.well-known/jwks.json",
        "issuer": "https://example.com"
      },
      "name": "auth-check",
      "type": "jwt",
      "organization": {
        "id": "0b26ccb5-83cc-4d33-a01f-100c383e0066"
      },
      "updated_at": "2019-06-28T16:40:22.759Z"
    },
    "app": {
      "id": "1ed9a370-eea1-4665-a525-0cfcfbb6906f"
    },
    "id": "8717f0d3-5632-a2b9-0ec7-8a307c0ef5f0",
    "options": {
      "excludes":[
        "/images",
        "/javascript",
        "/css"
      ]
    },
    "updated_at": "2019-06-28T20:12:38.157Z"
  }
]
```
