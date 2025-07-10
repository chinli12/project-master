CREATE OR REPLACE FUNCTION get_group_member_count(group_id_param UUID)
RETURNS INT AS $$
DECLARE
  member_count INT;
BEGIN
  SELECT COUNT(*)
  INTO member_count
  FROM group_members
  WHERE group_id = group_id_param;

  RETURN member_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_group_last_activity(group_id_param UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  last_activity_time TIMESTAMPTZ;
BEGIN
  SELECT MAX(created_at)
  INTO last_activity_time
  FROM posts
  WHERE group_id = group_id_param;

  RETURN last_activity_time;
END;
$$ LANGUAGE plpgsql;
