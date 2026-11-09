-- Databasen for nettbestilling. Køyrast mot D1 ein gong:
--   npx wrangler d1 execute osteroykroa --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS ordre (
  nr        INTEGER PRIMARY KEY AUTOINCREMENT,
  dato      TEXT    NOT NULL,          -- YYYY-MM-DD, norsk lokaltid
  hentetid  TEXT    NOT NULL,          -- HH:MM
  status    TEXT    NOT NULL,          -- ny | godteken | klar | henta | avvist
  telefon   TEXT,
  sum       INTEGER NOT NULL,          -- heile kroner
  linjer    TEXT    NOT NULL,          -- JSON: menyane i ordren
  motteke   INTEGER NOT NULL,          -- epoch ms
  godteke   INTEGER
);

-- SJØLVE LÅSEN.
--
-- Dette er grunnen til at to kundar ikkje kan ta same tida. Ikkje ein
-- sjekk i koden — ein sjekk kan tape mot seg sjølv når to førespurnader
-- kjem i same augeblink, fordi begge rekk å lese «ledig» før nokon av
-- dei skriv. Databasen avgjer i staden: den andre innsettinga feilar,
-- og me fortel kunden at tida nett blei teken.
--
-- Avviste ordrar er haldne utanfor, så ei luke blir ledig att om
-- kjøkenet ikkje kan levere.
CREATE UNIQUE INDEX IF NOT EXISTS ein_ordre_per_luke
  ON ordre (dato, hentetid) WHERE status != 'avvist';

-- Raskt oppslag på dagens ordrar til grillskjermen.
CREATE INDEX IF NOT EXISTS ordre_dato ON ordre (dato);

-- Luker kjøkenet har stengt for nettbestilling.
CREATE TABLE IF NOT EXISTS stengd_luke (
  dato     TEXT NOT NULL,
  hentetid TEXT NOT NULL,
  stengd   INTEGER NOT NULL,           -- epoch ms
  PRIMARY KEY (dato, hentetid)
);
