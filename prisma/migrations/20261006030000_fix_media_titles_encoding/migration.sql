-- Titres de médias dont les accents ont été mal décodés à l'upload (nom de
-- fichier UTF-8 lu comme Latin-1 par multer : « PrÃ©si » au lieu de « Prési »).
-- Réparation ligne par ligne : une valeur non convertible est laissée telle
-- quelle au lieu de faire échouer la migration.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT "id", "title" FROM "media_items" WHERE "title" LIKE '%Ã%' OR "title" LIKE '%Â%' LOOP
    BEGIN
      UPDATE "media_items"
        SET "title" = convert_from(convert_to(r."title", 'LATIN1'), 'UTF8')
        WHERE "id" = r."id";
    EXCEPTION WHEN OTHERS THEN
      NULL; -- titre laissé inchangé (modifiable depuis l'admin)
    END;
  END LOOP;
END $$;
