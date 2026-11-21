-- The "Teams" calendar the app created in the person's Google account. The
-- `calendar.app.created` scope reaches only calendars the app created, so
-- every mirrored event lives in one.
ALTER TABLE google_tokens ADD COLUMN calendar_id TEXT;

-- The Google calendar holding the mirrored event. Events mirrored before the
-- Teams calendar existed live in the creator's primary calendar.
ALTER TABLE events ADD COLUMN google_calendar_id TEXT;
UPDATE events SET google_calendar_id = 'primary' WHERE google_event_id IS NOT NULL;
