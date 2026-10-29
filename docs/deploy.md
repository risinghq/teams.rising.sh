# Deploy

A push to `main` runs `.github/workflows/deploy.yml`. It checks, applies the D1
migrations to the remote database, then runs `wrangler deploy`. A pull request
runs `bun run check` and `bun run build`.

## Settings

Set the Google values as Worker secrets. Never write a secret into the
repository. The allow-lists are not secret. `ALLOWED_DOMAINS` lives in
`wrangler.jsonc` under `vars`, and a deploy applies it.

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

1. In Google Cloud Console, create a project and configure the OAuth consent
   screen. Add the scopes `openid`, `email`, `profile` and
   `https://www.googleapis.com/auth/calendar`.
2. Create an OAuth client of type Web application.
3. Add these authorized redirect URIs:
   - `https://teams.rising.sh/api/auth/google/callback`
   - `http://localhost:8787/api/auth/google/callback`
4. Store the client id and secret as the secrets above.

## Local run

```
bun install
bun run db:migrate:local
bun run db:seed:local
bun run dev
```

Set `DEV_LOGIN=1` in `.dev.vars` to sign in without Google.
