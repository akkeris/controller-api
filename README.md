# Akkeris Controller API #

## Setting Up ##

### Storage 
* **DATABASE_URL** - The database url to store build, release information.  This has no default.  Must be a postgres 9.5+ instance. See create.sql in sql folder for creating the tables and schema.

### Security
* AUTH_KEY - A shared secret simple authentication, this should be used in all API calls in the Authorization header.
* ENCRYPT_KEY - A private key used to encrypt secretive information in postgres.  This has no default.
* BLACKLIST_ENV - A comma delimited list of socs keywords causing config vars to be redacted, defaults to 'PASS,KEY,SECRET,PRIVATE,TOKEN'
* APPKIT_API_URL - Public URI (https://somehost/) for the appkit api in front of this api, generally appkit api url that handles user account/authorization (defaults to http://localhost:5000)
* APPKIT_UI_URL - Public URI (https://somehost/) for the appkit ui used by developers.

### Build Information
* BUILD_SHUTTLE_URL - The build shuttle is a small footprint API that manages specific build system such as jenkins. (see https://github.com/akkeris/buildshuttle).  This has no default.


### Deployment Information
* ALAMO_APP_CONTROLLER_URL - The API url for this host, defaults to http://localhost:5000
* [STACKNAME]_STACK_API - The URI for the stack api by the name of STACKNAME, for example if a stack exists called FOO the uri for the stack api must be set at FOO_STACK_API
* [REGIONNAME]_REGION_API - The URI for the regional api by the name of REGIONNAME, for example if a region exists called us-seattle the uri for the stack api must be set at US_SEATTLE_REGION_API
* DOCKER_REGISTRY_HOST - The host for storing image sources. E.g., docker.hostname.com, This has no default.
* DOCKER_REPO - The repo in DOCKER_REGISTRY_HOST to store gold master build images (changing this also requires changing jenkins_build_template.xml and existing build templates in jenkins). This has no default.


### Logging & Metric Information
* PROMETHEUS_METRICS_URL - The url to connect to for metric information stored in prometheus. This has no default.
* LOG_SHUTTLE_URL - The log shuttle url for log drains (https://github.com/akkeris/logshuttle). This has no default.
* LOG_SESSION_URL - The log session url for log sessions (https://github.com/akkeris/logshuttle). This has no default.
* INFLUXDB_METRICS_URL - The URL to the influxdb that holds running metrics for service, count and other http information. This has no default.

### Addon Envs
* TWILIO_AUTH_KEY - The master sid:token for the twilio account.
* ANOMALY_METRICS_DRAIN - The syslog drain end point for the opentsdb custom metrics collector. This has no default.
* PAPERTRAIL_DRAIN - The syslog standard drain end point for papertrail.  This has no default.

## Installing ##

```npm install```

## Running ##

Prior to running, ensure all of the prior environment variables are properly setup in the ENV.

```npm start```

## Testing ##

Set above env, in addition you'll need to set TEST_MODE=true, ALAMO_BASE_DOMAIN=.domain.io, and CODACY_PROJECT_TOKEN if you want code coverage.  Then run:

```
cat sql/create_testing.sql | psql $DATABASE_URL
```

```npm test```

OR, run a test manually:

```./node_modules/.bin/_mocha test/[test_to_run.js]```

# Using Akkeris and its API #

## Authentication ##

The alamo app controller uses a simple key based authorization via http in the "Authorization" header.  For example if your AUTH_KEY is `fugazi` then you would pass in `Authorization: fugazi` with all your http requests to authenticate it.  In addition a `X-Username` is required which contains the username or email address of the user taking the action. Note that this api is not intended to be exposed directly to people but other systems, developers interface through appkit-api project which handles permissions and passes requests through.

