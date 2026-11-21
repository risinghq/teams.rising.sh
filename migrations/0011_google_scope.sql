-- The scopes Google granted with the refresh token, space-separated. A row
-- from before this column holds a grant for the full `calendar` scope, so
-- NULL asks its owner to review the permissions.
ALTER TABLE google_tokens ADD COLUMN scope TEXT;
