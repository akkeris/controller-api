## Regions

Regions are an area that addons, apps and sites share.  Regions have limitations based on their capabilities and available stacks within that region. Note an app must be in the same region as a provision addon to attach it.  If a plan is unavailable in a certain region it may not be created for an app.  A site may only include apps in the same region.

### List Regions ##

Lists all regions.

`GET /regions`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/regions
```

**200 "OK" Response**

```json
[
  {
    "country": "United States",
    "created_at": "2016-07-01T12:00:00Z",
    "description": "United States",
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "locale": "seattle",
    "name": "us-seattle",
    "private_capable": true,
    "provider": {
      "name": "amazon-web-services",
      "region": "us-west-2",
      "availability_zones":["us-west-2a","us-west-2b"]
    },
    "high_availiability":true,
    "updated_at": "2016-07-01T12:00:00Z"
  },
  {
    "country": "United Kingdom",
    "created_at": "2016-07-01T12:00:00Z",
    "description": "United Kingdom",
    "id": "b03d7641-a61e-fb09-654e-2def7c9f163e",
    "locale": "london",
    "name": "eu-london",
    "private_capable": true,
    "provider": {
      "name": "amazon-web-services",
      "region": "eu-west-2",
      "availability_zones":["eu-west-2a","eu-west-2b"]
    },
    "high_availiability":true,
    "updated_at": "2016-07-01T12:00:00Z"
  }
]
```

### Get Region Info ##

Get information on a specific region

`GET /regions/{region_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/regions/us-seattle
```

**200 "OK" Response**

```json
  {
    "country": "United States",
    "created_at": "2016-07-01T12:00:00Z",
    "description": "United States",
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "locale": "seattle",
    "name": "us-seattle",
    "private_capable": true,
    "provider": {
      "name": "amazon-web-services",
      "region": "us-west-2",
      "availability_zones":["us-west-2a","us-west-2b"]
    },
    "high_availiability":true,
    "updated_at": "2016-07-01T12:00:00Z"
  }
```

