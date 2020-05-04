## Spaces

All applications must exist in a space, spaces provide a network level isolation for a group of applications, in addition they allow developer to set "space-level" environment variables that are included in every app that is launched in the space.  This can be useful for network discovery of other applications, low latency isolation between related apps, to provide a secure boundary for dev, qa, etc environments and allow for auto-discovery of other services through space-level environment variables.  

Note that services in on space may not be attached to services in a seperate space, in addition there is a "default" space that provides a global area if an app has no need for inter-app communication.  Spaces are regional, meaning a specific space may not have applications in seperate regions within the same space.

### Create Space

`POST /spaces`

|   Name       |       Type      | Description            | Example          |
|:------------:|:---------------:|------------------------|------------------|
|     name     | required string | Unique short name (less than 12 characters), alpha numeric name                               | perf-dev-us                                             |
| description  | optional string | A description of the space                                                                    | Performance Devleopment in the US Region                |
| compliance   | optional array  | An array of compliance limitations | ["socs","prod"] or ["dev"] |
| stack        | optional string | The stack to place this space in (see stacks).  | ds1 |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  -d '{"name":"perf-dev-us","description":"Performance dev in US", "stack":"ds1"}'
  https://apps.akkeris.io/spaces
```

**201 "Created" Response**

```json
{
  "compliance": [
    "socs",
    "pci"
  ],
  "created_at": "2016-07-26T16:10:50.391Z",
  "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
  "name": "default",
  "region": {
    "id": "7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name": "us-seattle"
  },
  "stack": {
    "id": "77d8c44b-6a5e-09e1-ef3a-08084a904622",
    "name": "ds1"
  },
  "state": "allocated",
  "updated_at": "2016-07-26T16:10:53.114Z"
}
```


### Update Spaces

Update the compliance or description for a space.

`PATCH /spaces/{space_id_or_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/spaces/default \
  -d '{"compliance":["socs","canary"]}'
```

**200 "OK" Response**

```json
[
  {
    "compliance": [
      "socs",
      "canary"
    ],
    "created_at": "2016-07-26T15:47:05.126Z",
    "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
    "name": "default",
    "region": {
      "id": "7edbac4b-6a5e-09e1-ef3a-08084a904621",
      "name": "us-seattle"
    },
    "stack": {
      "id": "77d8c44b-6a5e-09e1-ef3a-08084a904622",
      "name": "ds1"
    },
    "state": "allocated",
    "updated_at": "2016-07-26T15:47:07.267Z"
  }
  ...
]
```

### List Spaces

Retrieves a list of all of the active/available spaces.

`GET /spaces`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/spaces
```

**200 "OK" Response**

```json
[
  {
    "compliance": [
      "socs",
      "pci"
    ],
    "created_at": "2016-07-26T15:47:05.126Z",
    "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
    "name": "default",
    "region": {
      "id": "7edbac4b-6a5e-09e1-ef3a-08084a904621",
      "name": "us-seattle"
    },
    "stack": {
      "id": "77d8c44b-6a5e-09e1-ef3a-08084a904622",
      "name": "ds1"
    },
    "state": "allocated",
    "updated_at": "2016-07-26T15:47:07.267Z"
  }
  ...
]
```


### Get Space Info

Retrieves info on a specific space.

`GET /spaces/{space}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/spaces/default
```

**200 "OK" Response**

```json
{
  "compliance": [
    "socs",
    "pci"
  ],
  "created_at": "2016-07-26T15:47:05.126Z",
  "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
  "name": "default",
  "region": {
    "id": "7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name": "us-seattle"
  },
  "stack": {
    "id": "77d8c44b-6a5e-09e1-ef3a-08084a904622",
    "name": "ds1"
  },
  "state": "allocated",
  "updated_at": "2016-07-26T15:47:07.267Z"
}
```