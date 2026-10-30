-- A person picks a handle for mentions; without one, the email's local part
-- is the handle. Unique when set, and several people may have none.
ALTER TABLE users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX users_username ON users(username);

-- A WhatsApp number counts only once the person confirms it from that number.
-- Until then whatsapp_number is a claim and whatsapp_verified_at is NULL.
ALTER TABLE users ADD COLUMN whatsapp_verified_at TEXT;

-- A team's picture, shown where its letter badge was. It may be a GIF.
ALTER TABLE teams ADD COLUMN image_url TEXT;
