## Pipelines

Pipelines allow users to promote code from one app to one or more other apps (assumingly in different spaces). This is a useful tool and alternative to performing a release on a production or staging application, promotions add more assurances that code test in QA or DEV is exactly the same as that in production. It also alleviates the need for long lived branches (e.g., dev, qa, prod, master) within your source control repo. 

To create a pipeline you'll first create the pipeline name, then couple (or add) the apps to a pipeline using the pipeline couplings end points, when you add an app to a pipeline you'll need to state its "stage" which can be one of "review", "development", "staging" and "production".  Once apps are added to a pipeline via pipeline coupling the application can be promoted using the "Create Pipeline Promotion" end points.

Note its customary to use the app name as the pipeline name, pipelines should not be used for promoting multiple different types of apps.

### Create Pipeline

Create a new pipeline for a set of apps.


|   Name       |       Type      | Description                                                                                   | Example          |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|------------------|
|    name      | required string | The name of the pipeline, less than 24 characters, alpha numeric only                         | my-test-pipeline |


`POST /pipelines`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/pipelines -d '{"name":"my-test-pipeline"}'
```

**201 "Created" Response**

```json
{
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "name": "my-test-pipeline",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### List Pipelines

Lists all available existing pipelines.

`GET /pipelines`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipelines
```

**200 "OK" Response**

```json
[
  {
    "created_at": "2016-01-01T12:00:00Z",
    "id": "abc34567-99ab-cdef-0123-456789abcdef",
    "name": "my-test-pipeline",
    "updated_at": "2016-01-01T12:00:00Z"
  },
  ...
]
```

### Get Pipeline Info

Gets information on a specific pipeline

`GET /pipelines/{pipeline_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipelines/my-test-pipeline
```

**200 "OK" Response**

```json
{
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "name": "my-test-pipeline",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### Delete a Pipeline

Removes a pipeline (and all of its couplings)

`DELETE /pipelines/{pipeline_name_or_id`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/pipelines/my-test-pipeline
```

**200 "OK" Response**

```json
{
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "name": "my-test-pipeline",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### List Pipeline Stages

Get a directed graph of the pipeline stages and their next stage.

`GET /pipeline-stages`

**CURL Examplee**

```bash
curl -H 'Authorization: ...' \
  https://apps.akkeris.io/pipeline-stages
```

**200 "OK" Response**

```json
{
  "review":"development",
  "development":"staging",
  "staging":"production",
  "production":null
}
```

### List Available Pipeline Statuses

Get a list of all the available statuses on all releases associated with a pipeline.  This is useful for selecting a status check you'd like to add to a pipeline stage (e.g., pipeline-coupling below).

`GET /pipelines/{pipeline_name_or_id}/statuses`

**CURL Examplee**

```bash
curl -H 'Authorization: ...' \
  https://apps.akkeris.io/pipelines/my-test-pipeline/statuses
```

**200 "OK" Response**

```json
[
  {
    "context":"taas/integration-test-2",
    "name":"Integration Smoke Test 2"
  },
  {
    "context":"circleci/integration-test-1",
    "name":"Integration Smoke Test 1"
  }
]
```

### Create Pipeline Coupling ##

Adds an application to a pipeline at the specified stage.  Note that the only valid stages are "review", "development", "staging", "production".


|   Name       |       Type      | Description                                                                                   | Example              |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|----------------------|
|     app      | required string | The application name or id to add to the pipeline.                                            | my-test-app-dev      |
|  pipeline    | required string | The pipeline name or id to add the application to.                                            | my-test-app-pipeline |
|   stage      | required string | The stage of the pipeline this app represents.                                                | development          |
| required_status_checks | optional object | An object containing one field `contexts` which is an string array containing any release status checks that must be successful for promotions to happen on the app in this pipeline. Status checks on review stages are not allowed. | `{"contexts":["tests/integration-xyz"]}` |

`POST /pipeline-couplings`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/pipeline-couplings -d '{"app":"my-test-app-dev", "pipeline":"my-test-app-pipeline", "stage":"development", "required_status_checks":{"contexts":["tests/integration-xyz"]}}'
```

**201 "Created" Response**

```json
{
  "app":{
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "pipeline":{
    "id":"abc34567-99ab-cdef-0123-456789abcdef"
  },
  "required_status_checks":{
    "contexts":[
      "circleci/unit-tests-appb",
      "taas/integration-tests-appc",
      "approvals/product"
    ]
  },
  "stage": "development",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### List Apps added to a Pipeline (by Pipeline)

Lists all available apps added to the pipeline (e.g., a pipeline coupling)

`GET /pipelines/{pipeline_name_or_id}/pipeline-couplings`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipelines/my-test-pipeline/pipeline-couplings
```

**200 "OK" Response**

```json
[
  {
    "app":{
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    },
    "created_at": "2016-01-01T12:00:00Z",
    "id": "abc34567-99ab-cdef-0123-456789abcdef",
    "pipeline":{
      "id":"abc34567-99ab-cdef-0123-456789abcdef"
    },
    "required_status_checks":{
      "contexts":[
        "circleci/unit-tests-appb",
        "taas/integration-tests-appc",
        "approvals/product"
      ]
    },
    "stage": "development",
    "updated_at": "2016-01-01T12:00:00Z"
  }
]
```

### List All Pipline Couplings ##

Lists all pipeline couplings

`GET /pipeline-couplings`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipeline-couplings
```

**200 "OK" Response**

```json
[
  {
    "app":{
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    },
    "created_at": "2016-01-01T12:00:00Z",
    "id": "abc34567-99ab-cdef-0123-456789abcdef",
    "pipeline":{
      "id":"abc34567-99ab-cdef-0123-456789abcdef"
    },
    "required_status_checks":{
      "contexts":[]
    },
    "stage": "development",
    "updated_at": "2016-01-01T12:00:00Z"
  }
]
```


### Get Pipeline Coupling By App ##

Gets the pipeline coupling (or pipeline an app is added to) by the application, rather than pipeline.

`GET /apps/{app_id_or_name}/pipeline-couplings`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/my-test-app-dev/pipeline-couplings
```

**200 "OK" Response**

```json
{
  "app":{
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "pipeline":{
    "id":"abc34567-99ab-cdef-0123-456789abcdef"
  },
  "required_status_checks":{
    "contexts":[
      "circleci/unit-tests-appb",
      "taas/integration-tests-appc",
      "approvals/product"
    ]
  },
  "stage": "development",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### Update Pipeline Coupling ##

Updates a pipeline coupling, this can only update the field `required_status_checks`. Note, the `contexts` field is fully replaced and must include all contexts to require.

`PATCH /pipeline-couplings/{pipeline_coupling_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/pipeline-couplings/abc34567-99ab-cdef-0123-456789abcdef \
  -d '{"required_status_checks":{"contexts":["foo/bar"]}}'
```

**200 "OK" Response**

```json
{
  "app":{
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "pipeline":{
    "id":"abc34567-99ab-cdef-0123-456789abcdef"
  },
  "required_status_checks":{
    "contexts":[
      "foo/bar"
    ]
  },
  "stage": "development",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### Remove an App from Pipeline ##

Removes an application from a pipeline.

`DELETE /pipeline-couplings/{pipeline_coupling_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/pipeline-couplings/abc34567-99ab-cdef-0123-456789abcdef
```

**200 "OK" Response**

```json
{
  "app":{
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "pipeline":{
    "id":"abc34567-99ab-cdef-0123-456789abcdef"
  },
  "stage": "development",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### Create Pipeline Promotion ##

Promote an app coupled to a pipeline up the pipeline. If a safe promote is indicated the source and destination apps config are compared, if an environment variable exists in one and not the other the safe promotion fails. This prevents promoting apps that require specific services or config changes prior to promotion.

|   Name           |       Type      | Description                                                                                   | Example                                   |
|:----------------:|:---------------:|-----------------------------------------------------------------------------------------------|-------------------------------------------|
| pipeline/id      | required string | The pipeline to promote an app in                                                             | abc34567-99ab-cdef-0123-456789abcdef      |
| source/app/id    | required string | The source application to promote                                                             | 11334567-99ab-cdef-0123-456789abcdef      |
| source/app/release/id | optional string | The release uuid on the source application to promote | 11334567-99ab-cdef-0123-456789abcdef |
| targets[]/app/id | required string | The target application to receive the promotion                                               | 22334567-99ab-cdef-0123-456789abc123      |
| safe             | optional boolean | Indicates a safe promotion | true |

`POST /pipeline-promotions`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/pipeline-promotions
  -d '{
    "pipeline":{
      "id": "abc34567-99ab-cdef-0123-456789abcdef"
    },
    "source":{
      "app":{
        "id":"11334567-99ab-cdef-0123-456789abcdef"
      }
    },
    "targets":[
      {
        "app":{
          "id":"22334567-99ab-cdef-0123-456789abc123"
        }
      }
    ]
  }'
```

**200 "OK" Response**

```json
{
  "created_at": "2012-01-01T12:00:00Z",
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "pipeline": {
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "source": {
    "app": {
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    },
    "release": {
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    }
  },
  "status": "pending",
  "updated_at": "2012-01-01T12:00:00Z"
}
```

**409 "Conflict" Response**

If a pipeline promotion cannot be created due to an unmet pipeline status check a 422 Conflict error is returned. The response contains a description of why the promotion failed.

### Get Pipeline Promotion ##

Gets the promotion record from one app to others.

`GET /pipeline-promotions/{pipeline_promotion_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipeline-promotions/01234567-89ab-cdef-0123-456789abcdef
```

**200 "OK" Response**

```json
{
  "created_at": "2012-01-01T12:00:00Z",
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "pipeline": {
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "source": {
    "app": {
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    },
    "release": {
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    }
  },
  "status": "pending",
  "updated_at": "2012-01-01T12:00:00Z"
}
```

### Get Pipeline Promotion Targets

Gets the result of the targets during the promotion.

`/pipeline-promotions/{pipeline_promotion_id}/promotion-targets`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipeline-promotions/01234567-89ab-cdef-0123-456789abcdef/promotion-targets
```

**200 "OK" Response**

```json
{
  "app":{
    "id":"5553223-89ab-cdef-0123-456789abcdef"
  },
  "error_message":"",
  "id":"51234567-89ab-cdef-0123-456789abcdee",
  "pipeline_promotion":{
    "id":"01234567-89ab-cdef-0123-456789abcdef"
  },
  "release":{
    "id":"11114567-89ab-cdef-0123-456753232ef"
  },
  "status":"successful"
}
```

