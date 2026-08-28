# Rabto Skill Development Guidelines

Whenever you create, update, or import a skill in this repository:

1. **Frontmatter Validation**: Ensure the `SKILL.md` contains all required YAML frontmatter fields as verified by the registry validator:
   - `name`: string
   - `description`: string
   - `version`: string (e.g. 1.0.0)
   - `owner`: "rabto"
   - `status`: "active"
   - `categories`: list of strings
   - `triggers`: list of strings (phrases that activate the skill)
   - `related_skills`: list of strings
   - `conflicting_skills`: list of strings
   - `primary_tools`: list of strings
   - `minimum_inputs`: list of strings
   - `verification_required`: boolean
   - `last_reviewed`: string (YYYY-MM-DD)

2. **Registry Sync**: After adding or modifying files inside `skills/`, you must always regenerate the registry checksums and validate the registry before committing. Run:
   ```bash
   node scripts/generate-checksums.mjs
   npm run validate:registry
   ```

3. **Verify Tests**: Ensure the workspace tests pass successfully before pushing:
   ```bash
   npm run test
   ```
