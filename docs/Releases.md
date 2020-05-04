
## Releases

Releasing a slug (or build) will immediately place the new image on all targeted app servers and restart the app in a rolling fashion to prevent downtime. The provided slug or build must be already built through the``/apps/{appname}/builds``end point. Note that releases may occur automatically if auto build and deploys are set. In addition, releases to downstream pipelined applications are not allowed and will result in a 422 error code if a release is attempted. Note that in a release the `state` represents the release status checks combined state, the `status` field represents whether the release was successfully deployed.

### Create a New Release

`POST /apps/{appname}/releases`

|   Name       |       Type      | Description                                                                                                       | Example           |
|:------------:|:---------------:|-------------------------------------------------------------------------------------------------------------------|-------------------|
|   slug       | required string | The build id (slug) to release on this app. This cannot be used in combination with release.                      | 4321-...-3242     |
|  release     | required string | The release id to rollback to, this should be a previous release. this cannot be used in combination with a slug. | 1234-...-3242     |
|  description | optional string | A description to add to the release notes.                                                                        | v1.0 release      |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/releases \
  -d '{"slug":"c5b5896f-7896-4a11-80f0-dbb0e6c00ac5","description":"new release v1.0"}'
```

**201 "Created" Response**

```json
{  
 "app":{  
    "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
    "name":"app-space"
 },
 "created_at":"2016-07-19T00:34:21.602Z",
 "description":"new release v1.0",
 "slug":{  
    "id":"c5b5896f-7896-4a11-80f0-dbb0e6c00ac5"
 },
 "status":"succeeded",
 "state":"success",
 "user":{  
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
    "email":""
 },
 "version":"",
 "current":true
}
```


### List Releases

`GET /apps/{appname}/releases`

List all of the release (and rollbacks) for an application.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/releases
```

**200 "OK" Response**

```json
[
  {  
    "app":{  
      "name":"app-space"
    },
    "created_at":"2016-07-19T01:56:02.441Z",
    "description":"new release of c4b86b55-edd6-4ee7-a898-409cca744180",
    "slug":{  
      "id":"c4b86b55-edd6-4ee7-a898-409cca744180"
    },
    "id":"09a1a1b8-8318-4445-8752-fb3339173100",
    "status":"succeeded",
    "state":"success",
    "user":{  
      "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
      "email":""
    },
    "version":"",
    "current":true
  }
]
```

### View Release Info

`GET /apps/{appname}/releases/{release uuid}`

Fetch the specific details of a release (or rollback) for an application.  The `status` field may have the values `succeeded`, `failed`, `pending`, `unknown`, or `queued`. The state field contains the aggregate of release statuses (`success`, `failure`, `error`, `pending`).

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/releases/09a1a1b8-8318-4445-8752-fb3339173100
```

**200 "OK" Response**

```json
{  
  "app":{  
    "name":"app-space"
  },
  "created_at":"2016-07-19T01:56:02.441Z",
  "description":"new release of c4b86b55-edd6-4ee7-a898-409cca744180",
  "slug":{  
    "id":"c4b86b55-edd6-4ee7-a898-409cca744180"
  },
  "id":"09a1a1b8-8318-4445-8752-fb3339173100",
  "status":"succeeded",
  "state":"success",
  "user":{  
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
    "email":""
  },
  "version":"",
  "current":true
}
```
