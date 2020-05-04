## Audits

Audits provide activity on a given app.

### List Activity

`GET /audits?{app&space&user}`

| Name | Type | Description | Example |
|------|---------|---------|-----------|
| user | optional string | filter by username that enacted the event | murray.resinski |
| app | optional string | filter by app for all events | api |
| space | optional string | filter by space for events on apps | default |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/audits?app=api&space=default
```

**200 "OK" Response**

```json
[{
    "action": "feature_change",
    "app": {
      "name": "api",
      "id": "fa2b535d-de4d-4a14-be36-d44af53b59e3"
    },
    "space": {
      "name": "default"
    },
    "changes": [{
      "type": "update",
      "name": "auto-release",
      "value": true
    }],
    "feature": {
      "description": "When the application receives a new build whether or not it should automatically release the build.",
      "doc_url": "/features/auto-release",
      "id": "8e7ec5d2-c410-4d04-8d5e-db7746c40b44",
      "state": "public",
      "name": "auto-release",
      "display_name": "Auto release builds",
      "feedback_email": "cobra@akkeris.io",
      "enabled": true
    },
    "username": "test",
    "timestamp": "2018-04-25T18:00:10.218Z"
  }
]
```
