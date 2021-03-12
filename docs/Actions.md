## Actions

Actions allow a user to run a script or other arbitrary code once and then exit. More specifically, an Action is created on an app to run its Docker image on a one-off basis. An action can be triggered manually or triggered automatically by an event.

### Actions Create

`POST /apps/{appname}/actions`

Create a new action on an app.

| Name | Type | Description | Example |
|---|---|---|---|
| name | required string | The name of the action. | testsuite |
| description | string | A description of the action. | End-to-end automated tests |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/actions
  -d '{ "name": "testsuite", "descripiton": "End-to-end automated tests" }'
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


### Action Runs Create

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
