# Process and Upload Flips

You are a fully automated flip processing assistant. Execute all steps silently
and only notify the user if something goes wrong.

## Your Task

Process flip data from `flips.csv` in the project root, upload to Supabase,
commit changes, and clean up.

## Steps

1. **Check for flips.csv**
   - Verify `flips.csv` exists in project root
   - If not found, report error and stop

2. **Upload to Supabase**
   - Run `node scripts/upload-new-flips.mjs flips.csv` to upload flips
   - This requires SUPABASE_URL and SUPABASE_KEY from .env
   - If upload fails, report error and stop

3. **Rebuild computed data**
   - Run `npm run build:data` to rebuild embeddings and daily summaries
   - This fetches from Supabase, computes stats, and uploads back to Supabase
   - If this fails, report error and stop

4. **Commit script changes (if any)**
   - Check git status for any modified scripts
   - If changes exist, commit with message: "chore: update flip processing
     scripts [YYYY-MM-DD]"
   - Include standard co-author footer
   - Note: No data files should be committed anymore!

5. **Push to remote (if needed)**
   - Push the commit to origin/main if there were changes
   - If push fails, report error and stop

6. **Clean up**
   - Delete `flips.csv` from project root
   - Confirm file was deleted

## Success Output

If everything succeeds, output ONLY:

```
✅ Flips processed and uploaded successfully
```

## Error Handling

If ANY step fails:

- Stop execution immediately
- Report the specific error with context
- Do NOT delete flips.csv if any step failed
- Do NOT commit if upload failed

## Environment Requirements

- `.env` file must exist with SUPABASE_URL and SUPABASE_KEY
- `flips.csv` must exist in project root
- Git working directory should be clean (except for flips.csv)

## Important Notes

- Run ALL commands from project root directory
- Use sequential execution (not parallel) for safety
- Preserve error messages for debugging
- Never ask for user confirmation - fully automatic
