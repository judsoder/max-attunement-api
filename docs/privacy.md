Privacy Policy — Max’s Assistant

What this is
Max’s Assistant is a private tool used by our family to summarize school assignments, calendar events, and (optionally) performance snapshots, and to save brief weekly reflection notes.

What data is accessed
When you ask for schedule, assignments, or performance, the assistant may access:

Canvas data (assignments, due dates, and grade/performance fields that are available via the Canvas API)

Google Calendar events (from the configured calendar)

Google Drive (a single JSONL file used to store weekly reflection entries)

What data is stored

Weekly reflections you choose to save are appended to a file in Google Drive (max_reflections.jsonl or similar).

The service may use short-lived caching to improve performance (minutes, not permanent storage).

No other long-term database is used unless explicitly added later.

What data is not sold or shared
Data is not sold, rented, or shared with third parties for advertising.

Who can access the data
Only people with:

The API key (required in requests), and

Access to the underlying Google/Canvas accounts configured for the service
can retrieve information.

Security
Requests to the API require an X-API-Key. Secrets (API keys, OAuth tokens) are stored as environment variables on the server and are not intentionally logged.

User choices

You can choose not to save reflections.

You can request that reflections be deduplicated/cleaned.

You can revoke Google or Canvas access at any time by revoking tokens or changing credentials.

Contact
If you have questions or want data removed from the reflection log, contact the account owner/admin.

Changes
This policy may be updated as the project evolves. The latest version will be posted at this URL.
