
## Recommendations

A recommendation is a suggested action to take on an application. This could be something like scale a dyno up, change plan size, and so on. 

### Create a New Recommendation

`POST /apps/{appname}/recommendations`

|   Name               |       Type       | Description                                                                                              | Example                    |
|:--------------------:|:----------------:|:--------------------------------------------------------------------------------------------------------:|:--------------------------:|
|  resource_type       | required string  | The type of resource that the recommendation is targeting. Available types can be found by an api call.  | formation                  |
|  service             | required string  | The service providing the recommendation.                                                                | turbonomic                 |
|  action              | required string  | The type of action to take. Available actions vary by resource and can be found via an API call.         | scale                      |
|  details             | required object  | Details of the recommendation. Expected structure varies by action, and is available by api call.        | { description: ... }       |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/recommendations \
  -d '{""}'
  -d '{"resource_type":"formation","service":"turbonomic","action":"scale","details":{"description":"Scale web formation to 2","resource":"web","quantity":"2"}}'
```

**201 "Created" Response**

```json
{
  "id": "540b9de7-6074-49d0-96d8-f35d00046d17",
  "app": {
    "key": "app-space",
    "id": "846f4ffe-da8e-4851-8439-0fdddfcc3a0a"
  },
  "service": "turbonomic",
  "resource_type": "formation",
  "action": "scale",
  "details": {
    "resource": "web",
    "quantity": 0,
    "description": "Scale web formation to 0"
  }
}
```


### List Recommendations

`GET /apps/{appname}/recommendations`

List all of the recommendations for an application.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/recommendations
```

**200 "OK" Response**

```json
[
  {
    "app": {
      "id": "846f4ffe-da8e-4851-8439-0fdddfcc3a0a",
      "key": "app-space"
    },
    "service": "turbonomic",
    "resource_type": {
      "id": "354d810d-304c-46ef-83db-145ed94cd352",
      "name": "formation"
    },
    "action": "scale",
    "details": {
      "resource": "web",
      "quantity": 0,
      "description": "Scale web formation to 0"
    },
    "created": "2021-05-18T20:09:33.219Z",
    "updated": "2021-05-18T20:14:10.097Z",
    "id": "540b9de7-6074-49d0-96d8-f35d00046d17"
  }
]
```


### Get Recommendation

`GET /apps/{appname}/recommendations?parameter=value`

Fetch a specific recommendation based on either recommendation ID or resource_type, action, and service pairing.

**Query Parameters**

To fetch by recommendation ID, provide it as a `recommendation` parameter.

To fetch by details, provide the `resource_type`, `service`, and `details` parameters.

**CURL Examples**

The following two examples will return an identical response:

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/recommendations?recommendation=540b9de7-6074-49d0-96d8-f35d00046d17
```

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/recommendations?service=turbonomic&resource_type=formation&action=scale
```


**200 "OK" Response**

```json
{
  "app": {
    "id": "846f4ffe-da8e-4851-8439-0fdddfcc3a0a",
    "key": "app-space"
  },
  "service": "turbonomic",
  "resource_type": {
    "id": "354d810d-304c-46ef-83db-145ed94cd352",
    "name": "formation"
  },
  "action": "scale",
  "details": {
    "resource": "web",
    "quantity": 0,
    "description": "Scale web formation to 0"
  },
  "created": "2021-05-18T20:09:33.219Z",
  "updated": "2021-05-18T20:14:10.097Z",
  "id": "540b9de7-6074-49d0-96d8-f35d00046d17"
}
```

### Get Available Recommendation Resource Types

`GET /docs/recommendation_resource_types`

*WIP* - List all the recommendation resource types that can be used. There is currently no way for a user to update these, as they are set in the `create.sql` script when the `controller-api` starts. 

|   Name                  |  Type    | Description                                                                                                  | Example                       |
|:-----------------------:|:--------:|:------------------------------------------------------------------------------------------------------------:|:-----------------------------:|
|  name                   |  string  | The name of the resource type                                                                                | formation                     |
|  actions                |  string  | Valid actions that can be taken on the resource type                                                         | resize,scale                  |
|  details                |  object  | JSON object containing details for acting on the resource type                                               | See `200 "OK" Response` below |
|  details.description    |  string  | Human-readable description of the actions that can be taken on the resource type                             | See `200 "OK" Response` below |
|  details.action_fields  |  object  | Required fields for each action that must be supplied in the details payload when creating a recommendation  | See `200 "OK" Response` below |


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/docs/recommendation_resource_types
```

**200 "OK" Response**

```json
[
  {
    "resource_type_uuid": "354d810d-304c-46ef-83db-145ed94cd352",
    "name": "formation",
    "actions": "resize,scale",
    "details": {
      "description": "Resize - Change the plan of a formation. Scale - Change the quantity of a formation.",
      "action_fields": {
        "resize": [
          "resource",
          "plan",
          "description"
        ],
        "scale": [
          "resource",
          "quantity",
          "description"
        ]
      }
    },
    "created": "2021-05-18T19:55:10.969Z",
    "updated": "2021-05-18T19:55:10.969Z"
  }
]
```