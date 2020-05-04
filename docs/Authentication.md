## Authentication

OAuth should be used to authorize and revoke access to your account to yourself and third parties. You can either setup a new OAuth2 application with the Akkeris Auth API to retrieve tokens dynamically from end users or may use your own personal access token to authenticate against this API.  To setup a service others can use, see the article Auth API.

For personal scripts you may use your personal access token, note that you should never give this token to anyone. To get a personal access token run `aka token`, this value is along string of numbers and letters similar to `2173f7b4a07be08543e113a47c33b617771f5329`.  This is your bearer token that can be passed in to the `Authorization` header to authenticate any request.  

```bash
curl -H "Authorization: Bearer `aka token`" https://apps.akkeris.io/apps
```

> **tip**
> Remember to replace `apps.akkeris.io` with your Akkeris API host.
