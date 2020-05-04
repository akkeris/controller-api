## Release Statuses

Each release can have one or more release `statuses`.  A release can be marked by external services with an `error`, `failure`, `pending` or `success` state and a name and function of the external service called a context. This information is then reflected in various parts of Akkeris to provide information to users on the health of a release. Release statuses (outside of informational) are primarily used in pipeline status checks where a promotion can be blocked if a release status did not succeed.

Note: A release status has no bearing on the `status` field within a release (as the status field within a release object simply indicates if the release was performed or not).

Statues are comprised of a few peices of information: `state` (required), `context` (required), `name`, `description`, `target_url`, and `image_url`. 

* The `state` as discussed helps users determine the quality or condition of the release, it can only be the values `error`, `failure`, `pending` or `success`. 
* The `context` is a field that may only contain alpha numeric values in addition to `/-\+.` characters. It is used to indicate the name and function of the external service. By convention, contexts typically include the `function` first then the `name` of the service seperated by a `/` delimiter. For example, for CircleCI the context might be `ci/circleci` or say you want to ensure a release only has MIT licenses as dependenices it might be named `licenses/my-mit-license-check`.
* The `name` is the name of the external service that is intended for the end user (e.g., its human readable).
* The `description` should include a short (no more than a paragraph) informational note on why the release in in the state, should the user want to know more than could click on the `target_url` to learn more.
* The `target_url` is used to link to more information on why the release is in the current `state`.  
* The `image_url` should be an icon of the external service, or an icon plus status badge that is the same height as width and no larger than 512 by 512 pixels (preferably transparent png images).  

While the `name`, `description`, `target_url` and `image_url` fields are optional they are highly recommended as they make a release status more useful for users.  

### Create a Status

`POST /apps/{appname}/releases/{release_id}/statuses`

Creates a new release status for the specified release.

| Name | Type | Description | Example |
|:--------:|:--------:|--------|--------|
| state | required string | Either `error`, `failure`, `pending` or `success` | `pending` |
| context | required string | An alpha numeric string in addition to `/-\+.` characters representing the function and name of the external service reporting the status. | `tests/integration-test-xyz` |
| name | optional string | A human readable name that describes the external service. | My Integration Test XYZ |
| target_url | optional string | A URL that is used for linking off to more information on the status of the release.  Must be an https or http link. | https://example.com/xyz-job/release-status-info/ |
| image_url | optional string | A URL that provides a visual status icon, should be no larger than 512x512 resolution, transparent png. This could be the external service logo or a badge indicating a status | https://example.com/xyz-job/release-status-info/status.png |
| description | optional string | A description no longer than 1024 characters, typically a paragraph, that provides a brief note on why the release is in this status. | The integration tests are still running. |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/releases/999b5ce9-b60c-42c4-bca5-e442cd86df78/statuses \
  -d '{"state":"pending", "name":"My Integration Test XYZ", "context":"tests/integration-test-xyz", "target_url":"https://example.com/xyz-job/release-status-info/", "image_url":"https://example.com/xyz-job/release-status-info/status.png", "description": "The integration tests are still running."}'
```

**201 "Created" Response**

```json
{  
  "id":"193b58e9-b60c-4224-bca5-14423d861f79",
  "state":"pending",
  "name":"My Integration Test XYZ",
  "context":"tests/integration-test-xyz",
  "description":"The integration tests are still running.",
  "target_url":"https://example.com/xyz-job/release-status-info/",
  "image_url":"https://example.com/xyz-job/release-status-info/status.png",
  "created_at":"2019-07-19T01:56:02.441Z",
  "release":{  
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
    "user":{  
      "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
      "email":""
    },
    "version":"",
    "current":true
  },
  "updated_at":"2019-07-19T01:56:02.441Z",
}
```

### Get a Release Status

`GET /apps/{appname}/releases/{release_id}/statuses/{status_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/releases/999b5ce9-b60c-42c4-bca5-e442cd86df78/statuses/193b58e9-b60c-4224-bca5-14423d861f79
```

**200 "OK" Response**

```json
{  
  "id":"193b58e9-b60c-4224-bca5-14423d861f79",
  "state":"pending",
  "name":"My Integration Test XYZ",
  "context":"tests/integration-test-xyz",
  "description":"The integration tests are still running.",
  "target_url":"https://example.com/xyz-job/release-status-info/",
  "image_url":"https://example.com/xyz-job/release-status-info/status.png",
  "created_at":"2019-07-19T01:56:02.441Z",
  "release":{  
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
    "user":{  
      "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
      "email":""
    },
    "version":"",
    "current":true
  },
  "updated_at":"2019-07-19T01:56:02.441Z",
}
```

### List Release Statuses

`GET /apps/{appname}/releases/{release_id}/statuses`

The list response is slightly different than most responses in that it contains the overall status of the release in addition to the individual statuses.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/releases/999b5ce9-b60c-42c4-bca5-e442cd86df78/statuses
```

**200 "OK" Response**

```json
{
  "state":"pending",
  "statuses": [
    {  
      "id":"193b58e9-b60c-4224-bca5-14423d861f79",
      "state":"pending",
      "name":"My Integration Test XYZ",
      "context":"tests/integration-test-xyz",
      "description":"The integration tests are still running.",
      "target_url":"https://example.com/xyz-job/release-status-info/",
      "image_url":"https://example.com/xyz-job/release-status-info/status.png",
      "created_at":"2019-07-19T01:56:02.441Z",
      "release":{  
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
        "user":{  
          "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
          "email":""
        },
        "version":"",
        "current":true
      },
      "updated_at":"2019-07-19T01:56:02.441Z",
    }
  ],
  "release":{  
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
    "user":{  
      "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
      "email":""
    },
    "version":"",
    "current":true
  }
}
```

### Update a Release Status

`PATCH /apps/{appname}/releases/{release_id}/statuses`

Updates a status with a new state, name, description, target_url or image_url.  The context may not be changed. Any field left off will be unchanged.

| Name | Type | Description | Example |
|:--------:|:--------:|--------|--------|
| state | required string | Either `error`, `failure`, `pending` or `success` | `pending` |
| name | optional string | A human readable name that describes the external service. | My Integration Test XYZ |
| target_url | optional string | A URL that is used for linking off to more information on the status of the release.  Must be an https or http link. | https://example.com/xyz-job/release-status-info/ |
| image_url | optional string | A URL that provides a visual status icon, should be no larger than 512x512 resolution, transparent png. This could be the external service logo or a badge indicating a status | https://example.com/xyz-job/release-status-info/status.png |
| description | optional string | A description no longer than 1024 characters, typically a paragraph, that provides a brief note on why the release is in this status. | The integration tests are still running. |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/app-space/releases/999b5ce9-b60c-42c4-bca5-e442cd86df78/statuses/193b58e9-b60c-4224-bca5-14423d861f79 \
  -d '{"state":"success", "name":"My Integration Test XYZ", "target_url":"https://example.com/xyz-job/release-status-info/", "image_url":"https://example.com/xyz-job/release-status-info/status.png", "description": "The integration succeeded!"}'
```

**201 "Created" Response**

```json
{  
  "id":"193b58e9-b60c-4224-bca5-14423d861f79",
  "state":"success",
  "name":"My Integration Test XYZ",
  "context":"tests/integration-test-xyz",
  "description":"The integration succeeded!",
  "target_url":"https://example.com/xyz-job/release-status-info/",
  "image_url":"https://example.com/xyz-job/release-status-info/status.png",
  "created_at":"2019-07-19T01:56:02.441Z",
  "release":{  
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
    "user":{  
      "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
      "email":""
    },
    "version":"",
    "current":true
  },
  "updated_at":"2019-07-19T01:56:02.441Z",
}
```
