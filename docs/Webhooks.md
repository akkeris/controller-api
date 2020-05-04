## Webhooks

### Managing Webhooks ##

A service, app or other addon may use webhooks to listen to various events that happen on an application.

### Creating a Webhook

`POST /apps/{appname_or_id}/hooks`

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "released",
    "preview",
    "preview-released",
    "build",
    "formation_change",
    "feature_change",
    "logdrain_change",
    "pipeline_promotion",
    "addon_change",
    "config_change",
    "destroy",
    "updated",
  ],
  "active":true,
  "secret":"some secret for hash"
}
```

**201 "Created" Response**

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "released",
    "preview",
    "preview-released",
    "build",
    "formation_change",
    "feature_change",
    "logdrain_change",
    "pipeline_promotion",
    "addon_change",
    "config_change",
    "destroy",
    "updated",
  ],
  "active":true,
  "created_at":"2016-08-09T12:00:00Z",
  "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "secret":"some secret for hash"
}
```

A successful webhook results in a 201 response with the id of the webhook.

### Updating a Webhook

Note any of these fields may be provided or left out and a partial update is applied.

`PATCH /apps/{appname_or_id}/hooks/{webhook_id}`

```
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "released",
    "preview",
    "preview-released",
    "build",
    "formation_change",
    "feature_change",
    "logdrain_change",
    "pipeline_promotion",
    "addon_change",
    "config_change",
    "destroy",
    "updated",
  ],
  "secret":"some secret for hash"
}
```

**200 "OK" Response**

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "released",
    "preview",
    "preview-released",
    "build",
    "formation_change",
    "feature_change",
    "logdrain_change",
    "pipeline_promotion",
    "addon_change",
    "config_change",
    "destroy",
    "updated",
  ],
  "active":true,
  "created_at":"2016-08-09T12:00:00Z",
  "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "secret":"some secret for hash"
}
```

Upon successfully being updated the API responds with 200 and the body contains the webhook entry.

### Deleting a Webhook

`DELETE /apps/{appname_or_id}/hooks/{webhook_id}`

**200 "OK" Response**

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "released",
    "preview",
    "preview-released",
    "build",
    "formation_change",
    "feature_change",
    "logdrain_change",
    "pipeline_promotion",
    "addon_change",
    "config_change",
    "destroy",
    "updated",
  ],
  "active":true,
  "created_at":"2016-08-09T12:00:00Z",
  "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "secret":"some secret for hash"
}
```

Upon successful deletion the API responds with 200.

### List Webhooks

`GET /apps/{appname_or_id}/hooks`

**200 "OK" Response**

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "released",
    "preview",
    "preview-released",
    "build",
    "formation_change",
    "feature_change",
    "logdrain_change",
    "pipeline_promotion",
    "addon_change",
    "config_change",
    "destroy",
    "updated",
  ],
  "active":true,
  "created_at":"2016-08-09T12:00:00Z",
  "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "secret":"some secret for hash"
}
```

### Getting Webhook Results

`GET /apps/{appname_or_id}/hooks/{hook_id}/results`

**200 "OK" Response**

```json
[
  {
    "id": "189860a9-090e-4587-a409-4b82808119ee",
    "last_attempt": {
      "request": {
        "method": "post",
        "url": "https://example.com/webhook",
        "headers": {
          "x-appkit-event": "release",
          "x-appkit-delivery": "189860a9-090e-4587-a409-4b82808119ee",
          "content-type": "application/json",
          "user-agent": "appkit-hookshot",
          "x-appkit-signature": "sha1=ee4bddef4659146988ae47c369a830ba50bac918"
        },
        "body": {
          "action": "release",
          "app": {
            "name": "alamotest4131",
            "id": "f806f1f3-c41b-4ec0-9f50-6a226554d6cd"
          },
          "space": {
            "name": "default"
          },
          "release": {
            "id": "c5f5b3c5-4cac-4b32-adf5-719354332b01",
            "result": "succeeded",
            "created_at": "2018-04-16T19:53:48.196Z",
            "version": 1,
            "description": "Deploy e48f626a-5c53-40ba-a66c-7e8f710ffb70"
          },
          "build": {
            "id": "e48f626a-5c53-40ba-a66c-7e8f710ffb70",
            "result": "succeeded",
            "repo": "https://github.com/abcd/some-repo",
            "commit": "123456",
            "branch": "master"
          }
        }
      },
      "response": {
        "code": 200,
        "headers": {
          "date": "Mon, 16 Apr 2018 19:53:48 GMT",
          "connection": "close",
          "content-length": "0"
        }
      },
      "status": "succeeded",
      "updated_at": "2018-04-16T19:53:48.210Z"
    },
    "num_attempts": 1,
    "hook": {
      "id": "875e1d70-c843-476d-91fc-4bea901a76da",
      "events": [
        "release",
        "build",
        "formation_change",
        "logdrain_change",
        "addon_change",
        "config_change",
        "destroy"
      ]
    },
    "created_at": "2018-04-16T19:53:48.210Z"
  },
  {
    "id": "25634d4a-5c5a-4f15-9a6c-550eb3e45199",
    "last_attempt": {
      "request": {
        "method": "post",
        "url": "https://example.com/webhook",
        "headers": {
          "x-appkit-event": "formation_change",
          "x-appkit-delivery": "25634d4a-5c5a-4f15-9a6c-550eb3e45199",
          "content-type": "application/json",
          "user-agent": "appkit-hookshot",
          "x-appkit-signature": "sha1=85cad787fa7dbc9b35c43cf1ed3d3d43dbc433dc"
        },
        "body": {
          "action": "formation_change",
          "app": {
            "name": "alamotest4131",
            "id": "f806f1f3-c41b-4ec0-9f50-6a226554d6cd"
          },
          "space": {
            "name": "default"
          },
          "change": "update",
          "changes": [
            {
              "type": "web",
              "quantity": 2,
              "size": "gp2"
            }
          ]
        }
      },
      "response": {
        "code": 200,
        "headers": {
          "date": "Mon, 16 Apr 2018 19:53:49 GMT",
          "connection": "close",
          "content-length": "0"
        }
      },
      "status": "succeeded",
      "updated_at": "2018-04-16T19:53:49.298Z"
    },
    "num_attempts": 1,
    "hook": {
      "id": "875e1d70-c843-476d-91fc-4bea901a76da",
      "events": [
        "release",
        "build",
        "formation_change",
        "logdrain_change",
        "addon_change",
        "config_change",
        "destroy"
      ]
    },
    "created_at": "2018-04-16T19:53:49.298Z"
  }
]
```


### Getting Webhook Result

`GET /apps/{appname_or_id}/hooks/{hook_id}/results/${result_id}`

**200 "OK" Response**

```json
{
  "id": "189860a9-090e-4587-a409-4b82808119ee",
  "last_attempt": {
    "request": {
      "method": "post",
      "url": "https://example.com/webhook",
      "headers": {
        "x-appkit-event": "release",
        "x-appkit-delivery": "189860a9-090e-4587-a409-4b82808119ee",
        "content-type": "application/json",
        "user-agent": "appkit-hookshot",
        "x-appkit-signature": "sha1=ee4bddef4659146988ae47c369a830ba50bac918"
      },
      "body": {
        "action": "release",
        "app": {
          "name": "alamotest4131",
          "id": "f806f1f3-c41b-4ec0-9f50-6a226554d6cd"
        },
        "space": {
          "name": "default"
        },
        "release": {
          "id": "c5f5b3c5-4cac-4b32-adf5-719354332b01",
          "result": "succeeded",
          "created_at": "2018-04-16T19:53:48.196Z",
          "version": 1,
          "description": "Deploy e48f626a-5c53-40ba-a66c-7e8f710ffb70"
        },
        "build": {
          "id": "e48f626a-5c53-40ba-a66c-7e8f710ffb70",
          "result": "succeeded",
          "repo": "https://github.com/abcd/some-repo",
          "commit": "123456",
          "branch": "master"
        }
      }
    },
    "response": {
      "code": 200,
      "headers": {
        "date": "Mon, 16 Apr 2018 19:53:48 GMT",
        "connection": "close",
        "content-length": "0"
      }
    },
    "status": "succeeded",
    "updated_at": "2018-04-16T19:53:48.210Z"
  },
  "num_attempts": 1,
  "hook": {
    "id": "875e1d70-c843-476d-91fc-4bea901a76da",
    "events": [
      "release",
      "build",
      "formation_change",
      "logdrain_change",
      "addon_change",
      "config_change",
      "destroy"
    ]
  },
  "created_at": "2018-04-16T19:53:48.210Z"
}
```
