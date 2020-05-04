## Builds

Builds are not necessarily builds in the sense of "testing", but the process of taking already existing source code from a URL and building a docker image to deploy.  If a docker image is already supplied from an external build process the image is copied and used (and no build occurs).  Builds can be tied into github for convenience to auto-build and deploy based on status check rules. 

Note that a "slug" as its termed here is the id of a successful build image, and not the build id, the build id may differ from the slug id based on whether the build had to be repeated due to an infrastructure failure (and not due to the application failure).  The slug is also idempotent and is always available, the build however may no longer be available if the application is removed. 

### Create a new build

`POST /apps/{appname}/builds`

Creates a new build from the source code or docker image contained in the specified URL, this can be a data URI (e.g., pushing the source code) or a URL to a system online where it can get the content. The build does not necessarily trigger a release, however if auto build and deploys are setup this will trigger an immediate release of the build.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|    org   | required string | Organization name, alphanumeric only                                                                                                                                                                       | akkeris                                                                                                                           |
| checksum | required string | The sha 256 checksum (prepended with sha256:) of the contents specified in the url parameter, note if the URL is a base64 data URI then it is the content of the base64 content DECODED.                   | sha256:0827...53f3                                                                                                                 |
|    url   | required string | The URI to fetch the image or sources for this build.  If an image is provided no build will occur, but the image will be fetched. See Docker Integrations at the top for more information on using build images. Data URI's are also allowed to push code rather than pull. |``data:application/zip;base64,abc==``OR,``https://host.com/contents.zip``, OR``https://host.com/contents.tgz``, OR``docker://registry.com/repo/image:tag``                              |
|   repo   | optional string | The href of the repo that will show in the logs and build information.                                                                                                                                     | http://github.com/akkeris/repo                                                                                                    |
|    sha   | optional string | SHA commit value (shown in logs and build info)                                                                                                                                                            | e7000...3523                                                                                                                       |
|  branch  | optional string | Branch of commit that caused the build (shown in logs and build info)                                                                                                                                      | master                                                                                                                             |
|  version | optional string | An optional version to specify that will show in the logs                                                                                                                                                  | v1.0                                                                                                                               |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/builds \
  -d "{\"sha\":\"e700000c19787fcd0c1a10b6a02b6221f5d73523\",\"org\":\"test\",\"repo\":\"https://github.com/akkeris/some-repo\",\"branch\":\"master\",\"version\":\"v1.0\",\"checksum\":\"sha256:...SHA256 checksum on zip file of source...\",\"url\":\"data:base64,...base 64 encoded zip file of source...\"}"
```

**201 "Created" Response**

```json
{  
  "app":{  
    "id":"app-name"
  },
  "created_at":"2016-07-12T23:36:16.976Z",
  "updated_at":"2016-07-12T23:36:16.976Z",
  "id":16,
  "output_stream_url":"/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result",
  "source_blob":{  
    "checksum":"sha256:b0cef53230ead3fb08b2b82d8f933a5a611fbabf416b2117d6896c7f5bde57b8",
    "url":"",
    "version":"v1.0",
    "commit":"123456"
  },
  "release":null,
  "slug":{  
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
  },
  "status":"succeeded",
  "user":{  
    "id":"anonymous",
    "email":""
  }
}
```


### List builds

`GET /apps/{appname}/builds`

List all of the builds for an application.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/builds
```

**200 "OK" Response**

```json
[
  {  
    "app":{  
      "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77"
    },
    "buildpacks":null,
    "created_at":"2016-07-18T19:34:07.740Z",
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78",
    "output_stream_url":"/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result",
    "source_blob":{  
      "checksum":"sha256:b0cef53230ead3fb08b2b82d8f933a5a611fbabf416b2117d6896c7f5bde57b8",
      "url":"",
      "version":"v1.0",
      "commit":"123456"
    },
    "release":null,
    "slug":{  
      "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
    },
    "status":"succeeded",
    "updated_at":"2016-07-18T19:36:56.609Z",
    "user":{  
      "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
      "email":""
    }
  }
]
```


### View Build Details

`GET /apps/{appname}/builds/{build uuid}`

Fetch information on a specific build.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78
```

**200 "OK" Response**

```json
{  
  "app":{  
    "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77"
  },
  "buildpacks":null,
  "created_at":"2016-07-18T19:34:07.740Z",
  "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78",
  "output_stream_url":"/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result",
  "source_blob":{  
    "checksum":"sha256:b0cef53230ead3fb08b2b82d8f933a5a611fbabf416b2117d6896c7f5bde57b8",
    "url":"",
    "version":"v1.0",
    "commit":"123456"
  },
  "release":null,
  "slug":{  
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
  },
  "status":"succeeded",
  "updated_at":"2016-07-18T19:36:56.609Z",
  "user":{  
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
    "email":""
  }
}
```


### View Build Logs

`GET /apps/{appname}/builds/{build uuid}/result`

Fetch the build logs and result for a specific build.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result
```

**200 "OK" Response**

```json
{
  "build":{
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78",
    "status":"succeeded"
  },
  "lines":[
    "Getting source code for https://github.com/akkeris/some-repo/master SHA 123456... done",
    "...",
    "Deploying ... done",
    "Finshed: SUCCESS"
  ]
}
```


### Stop a Running Build

`DELETE /apps/{appname}/builds/{build uuid}`

Stop running a build, this will return a 422 or 409 depending on whether the build cannot be stopped or is not currently running.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78
```

**205 "Reset Content" Response**

This is returned with no data when the build has successfully been stopped.

**422 "Unprocessable Entity" Response**

This is returned with no data when the build has completed building and cannot be stopped.


### Rebuild a Failed Build

`PUT /apps/{appname}/builds/{build uuid}`

This will create a new build using the same sources from the specified build uuid, note if configuration variables or other properties of the build have changed this will not retain the old ones.  Note that a new build uuid is returned, all aspects of the old build are left intact.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PUT \
  https://apps.akkeris.io/apps/app-space/builds/966b5ce9-b60c-42c4-bca5-e442cd86df77 
```

**201 "Created" Response**

```json
{  
  "app":{  
    "key":"app-name"
  },
  "created_at":"2016-07-12T23:36:16.976Z",
  "updated_at":"2016-07-12T23:36:16.976Z",
  "id":16,
  "source_blob":{  
    "checksum":"sha256:0827f94194a9d99554f4fafbfa6661a676450814e5293b64cc5fc396963c53f3"
  },
  "output_stream_url":"/apps/api/builds/169/result",
  "release":null,
  "slug":{  
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
  },
  "status":"succeeded",
  "user":{  
    "id":"anonymous",
    "email":""
  }
}
```

**422 "Unprocessable Entity" Response**

This is returned when the builds sources are unavialable (they've been archived or otherwise unavailable).  Periodically sources for builds will be archived or removed from our build repository. In this case, a build must be submitted from scratch.


### View Slug Details

A slug is an image produced by build, a slug may be associated as running on one or more applications at any point in time using pipeline promotions.  Slugs are therefore unassociated with a specific application and have their own unique end point.  However slugs do return the near same structure as builds. Unlike the builds API end point, the slug end point is always available (even when the application that caused the slug to be built is destroyed).

`GET /slugs/{slug_uuid}`

Fetch information on a specific slug.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/slugs/999b5ce9-b60c-42c4-bca5-e442cd86df78
```

**200 "OK" Response**

```json
{  
  "app":{  
    "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77"
  },
  "buildpacks":null,
  "created_at":"2016-07-18T19:34:07.740Z",
  "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78",
  "output_stream_url":"/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result",
  "source_blob":{  
    "checksum":"sha256:b0cef53230ead3fb08b2b82d8f933a5a611fbabf416b2117d6896c7f5bde57b8",
    "url":"",
    "version":"v1.0",
    "commit":"123456"
  },
  "release":null,
  "slug":{  
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
  },
  "status":"succeeded",
  "updated_at":"2016-07-18T19:36:56.609Z",
  "user":{  
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
    "email":""
  }
}
```

