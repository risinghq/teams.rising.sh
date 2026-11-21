# Deploy

A push to `main` runs `.github/workflows/deploy.yml`. It checks, applies the D1
migrations to the remote database, then runs `wrangler deploy`. A pull request
runs `bun run check` (format, types, import layers, dead code, tests) and
`bun run build`.

## Settings

Set the Google values as Worker secrets. Never write a secret into the
repository. The allow-lists are not secret. `ALLOWED_DOMAINS` and
`ALLOWED_EMAILS` live in `wrangler.jsonc` under `vars`, and a deploy applies
them.

| Name                    | Meaning                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`      | OAuth client id from Google Cloud Console.                                        |
| `GOOGLE_CLIENT_SECRET`  | OAuth client secret.                                                              |
| `GITHUB_WEBHOOK_SECRET` | Shared secret of the GitHub webhook at `/hooks/github`.                           |
| `ALLOWED_DOMAINS`       | Comma-separated email domains allowed to sign in.                                 |
| `ALLOWED_EMAILS`        | Comma-separated emails allowed to sign in. Use it for addresses outside a domain. |

When neither allow-list is set, nobody can sign in. `DEV_LOGIN=1` enables
`POST /api/auth/dev` and must never be set in production.

```
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_WEBHOOK_SECRET
```

## Google OAuth client

1. Use the Google Cloud project `teams-rising-sh`. Every rising.sh app signs in
   through it, and its consent screen is verified as "rising.sh". Under **Data
   Access** it declares `openid`, `email`, `profile`,
   `https://www.googleapis.com/auth/calendar.app.created` and
   `https://www.googleapis.com/auth/calendar.freebusy`.
2. Create an OAuth client of type Web application named `teams`.
3. Add these authorized redirect URIs:
   - `https://teams.rising.sh/api/auth/google/callback`
   - `http://localhost:8787/api/auth/google/callback`
4. Store the client id and secret as the secrets above.

The app is published (status In production), so Google lets any account through
and `ALLOWED_DOMAINS` and `ALLOWED_EMAILS` alone decide access. Do not move it
back to Testing: Google then refuses accounts that are not on the test user
list, and it expires refresh tokens after 7 days, which stops the calendar
mirror. The Branding page links the home page https://rising.sh and the privacy
policy https://rising.sh/privacy/, which lives in the `risinghq/rising.sh`
repository; `/privacidad` redirects there. Google rates both calendar scopes
non-sensitive, so the app needs no sensitive-scope review and shows no
unverified-app warning. Asking for a broader calendar scope, such as `calendar`
or `calendar.events`, brings that review back, so a change that needs one
updates the policy and Data Access first.

## Local run

```
bun install
bun run db:migrate:local
bun run db:seed:local
bun run dev
```

Set `DEV_LOGIN=1` in `.dev.vars` to sign in without Google.
