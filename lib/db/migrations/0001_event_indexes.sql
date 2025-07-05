-- Add indexes for performance
CREATE INDEX idx_event_participation_event_id ON event_participation(event_id);
CREATE INDEX idx_event_participation_user_id ON event_participation(user_id);
CREATE INDEX idx_event_messages_event_id ON event_messages(event_id);
CREATE INDEX idx_event_messages_created_at ON event_messages(created_at DESC); 