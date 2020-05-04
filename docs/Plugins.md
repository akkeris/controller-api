## Plugins

Plugins provide a registry for users of the CLI tools to access additional capabilities in appkit.

### List Plugins ##

Lists all public plugins.

`GET /plugins`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/plugins
```

**200 "OK" Response**

```json
[
  {
    "created_at": "2016-10-12T03:13:06.263Z",
    "id": "6c0416ad-7338-4f09-a57a-c36a40ae82db",
    "name": "test",
    "description": "This is the description for this plugin",
    "owner": {
      "name": "Trevor Linton",
      "email": "trevor.linton@akkeris.com"
    },
    "repo": "https://github.com/trevorlinton/appkit-test-plugin",
    "updated_at": "2016-10-12T03:13:06.263Z"
  },
  {
    "created_at": "2016-10-12T03:29:06.515Z",
    "id": "c0fd1fff-9157-47f1-b1cf-a524fc7ec3c4",
    "name": "test2",
    "description": "This is the description",
    "owner": {
      "name": "Fo",
      "email": "foo@akkeris.com"
    },
    "repo": "https://github.com/trevorlinton/appkit-test",
    "updated_at": "2016-10-12T03:29:11.775Z"
  },
  {
    "created_at": "2016-10-12T04:50:58.519Z",
    "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
    "name": "testing",
    "description": "description",
    "owner": {
      "name": "owner",
      "email": "email@email.com"
    },
    "repo": "https://foo.com",
    "updated_at": "2016-10-12T04:50:58.519Z"
  }
]
```

### Get a Plugin ##

Lists all public plugins.

`GET /plugins/{plugin_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/plugins/testing
```

**200 "OK" Response**

```json
{
  "created_at": "2016-10-12T04:50:58.519Z",
  "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
  "name": "testing",
  "description": "description",
  "owner": {
    "name": "owner",
    "email": "email@email.com"
  },
  "repo": "https://foo.com",
  "updated_at": "2016-10-12T04:50:58.519Z"
}
```


### Create a Plugin ##

Publishes a plugin for users to install.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
|  name   | required string | An alpha numeric name representing the plugin | myplugin |
|  repo   | required string | The repo where the plugin is installed from | https://github.com/foo/bar |
|  owner  | required string | The name of the owner of the plugin | Trevor Linton |
|  email  | required string | The email of the owner of the plugin | trevor.linton@akkeris.com |
|  description  | optional string | A description (generally one or two lines) describing the plugins functions | Im a plugin |

`POST /plugins`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  -d '{"name":"testing" "repo":"https://foo2.com", "owner":"owner2", "email":"email2@email.com", "description":"description2"}' \
  https://apps.akkeris.io/plugins
```

**201 "Created" Response**

```json
{
  "created_at": "2016-10-12T04:50:58.519Z",
  "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
  "name": "testing",
  "description": "description",
  "owner": {
    "name": "owner",
    "email": "email@email.com"
  },
  "repo": "https://foo.com",
  "updated_at": "2016-10-12T04:50:58.519Z"
}
```


### Update a Plugin ##

Revises a plugin for users to install.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
|  repo   | required string | The repo where the plugin is installed from | https://github.com/foo/bar |
|  owner  | required string | The name of the owner of the plugin | Trevor Linton |
|  email  | required string | The email of the owner of the plugin | trevor.linton@akkeris.com |
|  description  | optional string | A description (generally one or two lines) describing the plugins functions | Im a plugin |

`PATCH /plugins/{plugin_name_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  -d '{"repo":"https://foo2.com", "owner":"owner2", "email":"email2@email.com", "description":"description2"}' \
  https://apps.akkeris.io/plugins/testing
```

**200 "OK" Response**

```json
{
  "created_at": "2016-10-12T04:50:58.519Z",
  "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
  "name": "testing",
  "description": "description",
  "owner": {
    "name": "owner",
    "email": "email@email.com"
  },
  "repo": "https://foo.com",
  "updated_at": "2016-10-12T04:50:58.519Z"
}
```


### Delete a Plugin ##

Unpublishes a plugin from the public repo.

`DELETE /plugins/{plugin_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/plugins/testing
```

**200 "OK" Response**

```json
{
  "created_at": "2016-10-12T04:50:58.519Z",
  "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
  "name": "testing",
  "description": "description",
  "owner": {
    "name": "owner",
    "email": "email@email.com"
  },
  "repo": "https://foo.com",
  "updated_at": "2016-10-12T04:50:58.519Z"
}
```
