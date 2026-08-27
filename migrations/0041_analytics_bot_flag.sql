-- 0041 — mark bot / AI-agent traffic in analytics so the operator's numbers
-- describe people.
--
-- Why a column instead of dropping the rows at ingest: knowing how much of the
-- traffic is crawlers is itself useful (and it is how we noticed that 22 of the
-- last 25 errors were a single bingbot pass). The dashboard filters on is_bot=0;
-- nothing is thrown away.
ALTER TABLE analytics_events ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0;

-- Backfill. SQLite has no regex, so this is the LIKE-shaped subset of the
-- worker's isBotUserAgent(): the generic crawler words plus the AI agents the
-- operator named. A few exotic bots will stay unflagged in historical rows —
-- new rows go through the worker's fuller check.
UPDATE analytics_events SET is_bot = 1 WHERE
     user_agent IS NULL OR TRIM(user_agent) = ''
  OR LOWER(user_agent) LIKE '%bot%'
  OR LOWER(user_agent) LIKE '%crawler%'
  OR LOWER(user_agent) LIKE '%crawl%'
  OR LOWER(user_agent) LIKE '%spider%'
  OR LOWER(user_agent) LIKE '%scraper%'
  OR LOWER(user_agent) LIKE '%slurp%'
  OR LOWER(user_agent) LIKE '%headless%'
  OR LOWER(user_agent) LIKE '%puppeteer%'
  OR LOWER(user_agent) LIKE '%playwright%'
  OR LOWER(user_agent) LIKE '%lighthouse%'
  OR LOWER(user_agent) LIKE '%curl/%'
  OR LOWER(user_agent) LIKE '%wget%'
  OR LOWER(user_agent) LIKE '%python-requests%'
  OR LOWER(user_agent) LIKE '%node-fetch%'
  OR LOWER(user_agent) LIKE '%go-http-client%'
  OR LOWER(user_agent) LIKE '%okhttp%'
  OR LOWER(user_agent) LIKE '%claude%'
  OR LOWER(user_agent) LIKE '%anthropic%'
  OR LOWER(user_agent) LIKE '%gpt%'
  OR LOWER(user_agent) LIKE '%openai%'
  OR LOWER(user_agent) LIKE '%perplexity%'
  OR LOWER(user_agent) LIKE '%grok%'
  OR LOWER(user_agent) LIKE '%bytespider%'
  OR LOWER(user_agent) LIKE '%ccbot%'
  OR LOWER(user_agent) LIKE '%google-extended%';

CREATE INDEX IF NOT EXISTS idx_analytics_is_bot_day ON analytics_events (is_bot, day);
