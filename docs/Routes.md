## Routes

Routes provide path based routing to specified apps off of a site.

### List Routes

`GET /sites/{site_id_or_host}/routes`
`GET /apps/{app_id_or_name}/routes`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/sites/test.example.com/routes
```

**200 "OK" Response**

```json
[
  {
    "id": "7daead5d-5ed8-4c05-a50a-bcb2f8906186",
    "pending": false,
    "app": {
      "id": "6332a1ee-d756-4044-b563-c24745ed4579",
      "name": "example1-space"
    },
    "site": {
      "id": "3274243d-2f8f-4297-8ff2-eddf0e0f92b6",
      "domain": "test.example.com",
      "region": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
      "compliance": [
        "internal"
      ]
    },
    "source_path": "/somepath/",
    "target_path": "/",
    "created_at": "2018-03-21T16:37:22.663Z",
    "updated_at": "2018-03-21T16:37:22.663Z"
  },
  {
    "id": "72805a4f-e59a-4a75-8e91-5f7da0719cc6",
    "pending": false,
    "app": {
      "id": "3eb6d518-4111-48ef-86d8-ff5cc2250b6a",
      "name": "example2-space"
    },
    "site": {
      "id": "3274243d-2f8f-4297-8ff2-eddf0e0f92b6",
      "domain": "test.example.com",
      "region": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
      "compliance": [
        "internal"
      ]
    },
    "source_path": "/api/example2",
    "target_path": "/",
    "created_at": "2018-03-22T14:28:43.831Z",
    "updated_at": "2018-03-22T14:28:43.831Z"
  }
]
```

### Create Route

`POST /sites/{site_id_or_host}/routes`

Creates a new http route for a site from a specific URI source path on the site to an apps URI target path

|   Name       |       Type      | Description                                                                                   | Example                                                 |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|---------------------------------------------------------|
| site | required string | A valid site for the route to be attached to | merpderp.akkeris.io |
| app  | required string | The target app to route to | api-default |
| source_path  | required string  | valid uri path for the source that will be created on the site | / | 
| target_path | required string | valid uri path to the target app | / 

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/sites/test.akkeris.io/routes \
  -d '{"site":"test.example.com",
       "app":"8c4adc95-1348-4c8f-ba2f-e0b726dc2604",
       "source_path": "/foo",
       "target_path": "/"}'
```

**200 "Ok" Response**

```json
{
  "id": "72805a4f-e59a-4a75-8e91-5f7da0719cc6",
  "pending": true,
  "app": {
    "id": "8c4adc95-1348-4c8f-ba2f-e0b726dc2604",
    "name": "example3-space"
  },
  "site": {
    "id": "3274243d-2f8f-4297-8ff2-eddf0e0f92b6",
    "domain": "test.example.com",
    "region": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
    "compliance": [
      "internal"
    ]
  },
  "source_path": "/foo",
  "target_path": "/",
  "created_at": "2018-03-22T14:28:43.831Z",
  "updated_at": "2018-03-22T14:28:43.831Z"
}
```

### Delete Route

`DELETE /routes/{route_id}`
`DELETE /sites/{site_id_or_host}/routes/{route_id}`
`DELETE /sites/{app_name_or_id}/routes/{route_id}`

Deletes a route

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/routes/72805a4f-e59a-4a75-8e91-5f7da0719cc6
```


**200 "Ok" Response**

```json
{
  "id": "72805a4f-e59a-4a75-8e91-5f7da0719cc6",
  "pending": false,
  "app": {
    "id": "8c4adc95-1348-4c8f-ba2f-e0b726dc2604",
    "name": "example3-space"
  },
  "site": {
    "id": "3274243d-2f8f-4297-8ff2-eddf0e0f92b6",
    "domain": "test.example.com",
    "region": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
    "compliance": [
      "internal"
    ]
  },
  "source_path": "/foo",
  "target_path": "/",
  "created_at": "2018-03-22T14:28:43.831Z",
  "updated_at": "2018-03-22T14:28:43.831Z"
}
```
