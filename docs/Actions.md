## Actions

Actions allow a user to run a script or other arbitrary code once and then exit. More specifically, an Action is created on an app to run its Docker image on a one-off basis. An action can be triggered manually or triggered automatically by an event.

### Create an Action

`POST /apps/{appname}/actions`

Create a new action on an app.

| Name | Type | Description | Example |
|---|---|---|---|
| name | required string | The name of the action. | testsuite |
| description | string | A description of the action. | End-to-end automated tests |
| size | string | The dyno size to use for the action | gp1 |
| command | string | The command to run inside the action container | ./start.sh |
| options | object | Override certain app configuration (see below) | {} |
| options.image | string | Run a different image than the one configured for the application | "hello-world:latest" |
| options.env | object | Add (or override) environment variables | { "foo": "bar", "merp": "derp" }

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/actions
  -d '{ "name": "testsuite", "descripiton": "End-to-end automated tests", "size": "gp1", "command": "./start.sh", "options": { "image": "domain.io/project/image:tag-1", "env": { "foo": "bar" } } }'
```

**201 "Created" Response**

```json
{
  "action": "5be7fc31-ac79-48df-b58d-4ce2d292ee91",
  "app": "d5f42929-cddb-48be-8fd7-77d41d8c79be",
  "formation": "5a4cde36-e290-45b8-a9b9-9579bdfd7a0d",
  "name": "testsuite",
  "description": "End-to-end automated tests",
  "created_by": "Calaway",
  "created": "2021-03-12T03:52:42.769Z",
  "updated": "2021-03-12T03:52:42.769Z",
  "deleted": false
}
```

### List Actions

`GET /apps/{appname}/actions`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/actions
```

**200 "OK" Response**

```json
[
  {
    "action": "5be7fc31-ac79-48df-b58d-4ce2d292ee91",
    "app": "d5f42929-cddb-48be-8fd7-77d41d8c79be",
    "name": "testsuite",
    "description": "End-to-end automated tests",
    "created_by": "Calaway",
    "created": "2021-03-12T03:52:42.769Z",
    "updated": "2021-03-12T03:52:42.769Z",
    "deleted": false,
    "formation": {
      "id": "1aa5558e-4216-46bb-a15e-627a6fe62c22",
      "type": "actionstestsuite",
      "size": "gp1",
      "command": "./start.sh",
      "options": {
        "image": "domain.io/project/image:tag-1",
        "env": {
          "foo": "bar"
        }
      }
    }
  }
]
```

### Get Action Info

`GET /apps/{appname}/actions/{action_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/actions/testsuite
```

**200 "OK" Response**

```json
{
  "action": "5be7fc31-ac79-48df-b58d-4ce2d292ee91",
  "app": "d5f42929-cddb-48be-8fd7-77d41d8c79be",
  "name": "testsuite",
  "description": "End-to-end automated tests",
  "created_by": "Calaway",
  "created": "2021-03-12T03:52:42.769Z",
  "updated": "2021-03-12T03:52:42.769Z",
  "deleted": false,
  "formation": {
    "id": "1aa5558e-4216-46bb-a15e-627a6fe62c22",
    "type": "actionstestsuite",
    "size": "gp1",
    "command": "./start.sh",
    "options": {
      "image": "domain.io/project/image:tag-1",
      "env": {
        "foo": "bar"
      }
    }
  }
}
```

### Create an Action Run

`POST /apps/{appname}/actions/{action_name}/runs`

Manually trigger an action.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/actions/testsuite/runs
```

**201 "Created" Response**

```json
{
  "action_run": "8e3cabac-afb6-44d5-8c01-de2d463460cb",
  "action": "5be7fc31-ac79-48df-b58d-4ce2d292ee91",
  "runid": "b8902377-11b6-4149-8a9d-36a1d4cb3271",
  "status": "running",
  "exit_code": null,
  "created_by": "Calaway",
  "created": "2021-03-12T03:52:43.125Z"
}
```

### List Action Runs

`GET /apps/{appname}/actions/{action_name}/runs`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/actions/testsuite/runs
```

**200 "OK" Response**

```json
[
  {
    "action_run": "3e4fd725-bfb9-49c5-8393-6684fb5e3936",
    "action": "9cad8674-d56f-4068-b293-5eb0f30ecbb4",
    "status": "running",
    "exit_code": null,
    "created_by": "Calaway",
    "created": "2021-10-14T16:35:35.069Z"
  }
]
```

### Get Action Run Info

`GET /apps/{appname}/actions/{action_name}/runs/{run_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/actions/testsuite/runs/3e4fd725-bfb9-49c5-8393-6684fb5e3936
```

**200 "OK" Response**

```json
{
    "action_run": "3e4fd725-bfb9-49c5-8393-6684fb5e3936",
    "action": "9cad8674-d56f-4068-b293-5eb0f30ecbb4",
    "status": "running",
    "exit_code": null,
    "created_by": "unknown",
    "created": "2021-10-14T16:35:35.069Z"
}
```

### Delete an Action

`DELETE /apps/{appname}/actions/{action_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/app-space/actions/testsuite
```

**200 "OK" Response**

```json
{
  "action": "5be7fc31-ac79-48df-b58d-4ce2d292ee91",
  "app": "d5f42929-cddb-48be-8fd7-77d41d8c79be",
  "name": "testsuite",
  "description": "End-to-end automated tests",
  "created_by": "Calaway",
  "created": "2021-03-12T03:52:42.769Z",
  "updated": "2021-03-12T03:52:42.769Z",
  "deleted": false,
  "formation": {
    "id": "1aa5558e-4216-46bb-a15e-627a6fe62c22",
    "type": "actionstestsuite",
    "size": "gp1",
    "command": "./start.sh",
    "options": {
      "image": "domain.io/project/image:tag-1",
      "env": {
        "foo": "bar"
      }
    }
  }
}
```

