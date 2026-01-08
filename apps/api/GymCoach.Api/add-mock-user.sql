-- Add mock user to PostgreSQL database
-- SubscriptionStatus enum: Free=0, Premium=1, Cancelled=2
INSERT INTO "Users" ("Id", "Email", "PasswordHash", "DisplayName", "SubscriptionStatus", "CreatedAt")
VALUES (1, 'guest@gymcoach.app', 'mock-password-hash', 'Guest User', 0, NOW())
ON CONFLICT ("Id") DO NOTHING;
