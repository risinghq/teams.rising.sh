-- The people invited to an event. Google sends each one an invitation from the
-- creator's calendar.
CREATE TABLE event_attendees (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX event_attendees_user ON event_attendees(user_id);

-- The Google Meet link, set once Google has created the meeting.
ALTER TABLE events ADD COLUMN meet_url TEXT;
