-- No-op migration kept only to reconcile local migration history.
-- The previous attempt tried to cast legacy TEXT ids to INTEGER and failed.
-- IDs remain TEXT for User.id and Player.userId, matching historical data.

SELECT 1;
