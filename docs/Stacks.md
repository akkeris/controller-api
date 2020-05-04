## Stacks

Stacks are unique runtimes in alamo.  One or more of them may exist in any one region.  The difference between stacks may be physical location, an upgrade to backend components on one stack vs the other or on prem vs cloud offerings. A space must soley exist in one stack.

### List Stacks ##

Lists all stacks.

`GET /stacks`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/stacks
```

**200 "OK" Response**

```json
[
  {
    "created_at": "2016-07-01T12:00:00Z",
    "id": "abcd7641-a61e-fb09-654e-2def7c9feee",
    "name": "ds1",
    "region":{
        "id":"3bcd7641-a61e-fb09-654e-2def7c9feff",
        "name":"us-seattle"
    },
    "updated_at": "2016-07-01T12:00:00Z"
  }
]
```

### Get Stack Info ##

Get information on a specific stack

`GET /stack/{stack_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/stacks/ds1
```

**200 "OK" Response**

```json
  {
    "created_at": "2016-07-01T12:00:00Z",
    "id": "abcd7641-a61e-fb09-654e-2def7c9feee",
    "name": "ds1",
    "region":{
        "id":"3bcd7641-a61e-fb09-654e-2def7c9feff",
        "name":"us-seattle"
    },
    "updated_at": "2016-07-01T12:00:00Z"
  }
```
