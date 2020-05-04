## Sites

Sites provide a domain in which you can route various url paths to apps in Alamo.

### List Sites

`GET /sites`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/sites
```

**200 "OK" Response**

```json
[
  {
    "id": "ee1664e0-2e30-4edc-8b2d-f9a436b439cc",
    "domain": "test.example.com",
    "region": {
      "id": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
      "name": "us-seattle"
    },
    "created_at": "2018-04-18T22:08:47.481Z",
    "updated_at": "2018-04-18T22:08:47.481Z",
    "compliance": [
      "internal"
    ]
  },
  {
    "id": "aa1664e0-ee30-cedc-bb2d-39a436b43911",
    "domain": "test2.example.com",
    "region": {
      "id": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
      "name": "us-seattle"
    },
    "created_at": "2017-03-18T22:08:47.481Z",
    "updated_at": "2017-03-18T22:08:47.481Z",
    "compliance": [
      "internal"
    ]
  }
]
```

### Create Site

`POST /sites`

Creates a new https website.

|   Name       |       Type      | Description                                                                                   | Example                                                 |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|---------------------------------------------------------|
| domain | required string | A name for your domain, must only contain alpha-numerics, hypens, and full stops | merpderp.akkeris.io
| region  | required string | Cluster region | us-seattle
| internal  | required boolean | If routing to internal apps | true  
| description | string | Site description, used for informational purposes  |  My akkeris site |
| labels | string | Comma-separated list of labels, used for categorization |  perf,akkeris |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/sites \
  -d '{"domain":"test.example.com",
       "regoin":"us-seattle",
       "internal": false,
       "description":"desc",
       "labels":"label1,label2"}'
```

**200 "Ok" Response**

```json
{
  "id": "ee1664e0-2e30-4edc-8b2d-f9a436b439cc",
  "domain": "test.example.com",
  "region": {
    "id": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
    "name": "us-seattle"
  },
  "created_at": "2018-04-18T22:08:47.481Z",
  "updated_at": "2018-04-18T22:08:47.481Z",
  "description": "desc",
  "labels": "label1,label2",
  "compliance": [
    "internal"
  ]
}
```

### Get Site Info

`GET /sites/{site_id_or_host}`

Gets information on the specified site

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/sites/test.example.com

**200 "OK" Response**

```json
{
  "id": "ee1664e0-2e30-4edc-8b2d-f9a436b439cc",
  "domain": "test.example.com",
  "region": {
    "id": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
    "name": "us-seattle"
  },
  "created_at": "2018-04-18T22:08:47.481Z",
  "updated_at": "2018-04-18T22:08:47.481Z",
  "description": "desc",
  "labels": "label1,label2",
  "compliance": [
    "internal"
  ]
}
```

### Update Site

`PATCH /sites/{site_id_or_host}`

Update the description and labels of a site

|   Name       |       Type      | Description                                                                                   | Example                                                 |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|---------------------------------------------------------|
| description | string | Site description, used for informational purposes  |  My akkeris site |
| labels | string | Comma-separated list of labels, used for categorization |  perf,akkeris |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/sites \
  -d '{"description":"desc",
       "labels":"label1,label2"}'
```

**200 "Ok" Response**

```json
{
  "id": "ee1664e0-2e30-4edc-8b2d-f9a436b439cc",
  "domain": "test.example.com",
  "region": {
    "id": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
    "name": "us-seattle"
  },
  "created_at": "2018-04-18T22:08:47.481Z",
  "updated_at": "2018-04-18T22:08:47.481Z",
  "description": "desc",
  "labels": "label1,label2",
  "compliance": [
    "internal"
  ]
}
```


### Delete Site

`DELETE /sites/{site_id_or_host}`

Deletes the specified website.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/sites/test.example.com

**200 "OK" Response**

```json
{
  "id": "ee1664e0-2e30-4edc-8b2d-f9a436b439cc",
  "domain": "test.example.com",
  "region": {
    "id": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3",
    "name": "us-seattle"
  },
  "created_at": "2018-04-18T22:08:47.481Z",
  "updated_at": "2018-04-18T22:08:47.481Z",
  "compliance": [
    "internal"
  ]
}
```
