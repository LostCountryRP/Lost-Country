-- Eseguire dopo gli script di installazione; non cancella dati.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
