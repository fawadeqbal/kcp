# Safety incident

For anything that puts a child at risk or exposes children's data: personal information in a project, a shared portfolio exposing something, an adult contacting a child, bullying in project content or in a team room, a sandbox escape, or a data exposure. Treat it as **SEV1** until you know otherwise.

The order is always: **contain, record, tell, follow up.** Never delete anything before it is recorded.

## 1. Contain (first 30 minutes)

Work in the admin panel (`<admin>`). Moderators can suspend and sign out students and parents; admins can also revoke certificates; staff accounts need a super admin.

1. Find the account: Users → search by the parent's email or the child's nickname. Note the user ID from the page address (`/users/<id>`).
2. **Suspend** the account involved, with a reason such as `Safety <date>: <short description>`. Suspending at once signs the account out everywhere, blocks logins, hides a student from every leaderboard, and stops the child's share link (the API refuses it; nothing is cached).
3. **Sign out everywhere** is enough when only the login is at risk (a stolen or shared password). The account keeps working after a new login.
4. Ask the parent to switch off **"Public projects"** on their dashboard. That stops the share link for good. "Stop sharing" or "New link" also end the old link. Staff can't change these switches; suspension covers the time until the parent acts.
5. Ask the parent to switch off **"Public leaderboards"** if the child's nickname or avatar was the way in.
6. **Revoke a certificate** if it shows something it shouldn't (for example a nickname with personal information): Users → the student → Certificates → Revoke, with a reason. Anyone checking the code then sees it was revoked, and the PDF can't be downloaded.

By incident type:

- **Personal information in a project** (real name, school, phone, address). If the project is shared: suspend the child now. If it is private: SEV2, contact the parent the same day. Once the evidence is recorded, the child fixes the project and ships it again; only the newest version is kept.
- **A shared portfolio exposing something:** as above. Ask the parent where the link was posted, and to remove it there too.
- **Something said in a team, class or event room.** Room moderation (`<admin>/moderation`) lists every report with the messages around it. Deal with the report there: warn, mute for 1 hour to 7 days, remove the message, or suspend the account (which also signs it out). The student and their parents get a notification; the reporter is thanked. Every action is in the audit log (`moderation.*`). If a child is at risk, suspend first and record the evidence (below) before anything else: **room messages are deleted after 90 days**, and a report keeps a copy of the reported message only.
- **An adult contacting a child.** There is no private messaging. Rooms only hold a team's, class's or event's members (and the adults running it); under-13s send ready-made phrases only, and typed text from 13 is filtered for links, contact details and other apps. So contact starts from a room, something public (a shared portfolio, a leaderboard nickname) or happens outside the platform. Close what is public. If the adult has an account, suspend it. A parent sets their children's passwords, so a suspended parent can still sign in as their own children: suspend those accounts too if needed, and tell the lawyer. If a child is in immediate danger, call the local emergency services first.
- **Something in a hackathon team's code, commits or comments.** Team repositories are private (the team, its mentor, the event's judges and staff) and the code isn't filtered, so bullying or personal information can end up in a file, a commit message or a pull request comment. Admin → Hackathons → the event → **Remove** takes a student out of the team at once, with a reason: they leave the team's room and lose access to the repository. For the content itself, someone with Forgejo admin access (see [deployment.md](../deployment.md)) records it first, then rewrites or deletes it there; the API has no button for that. Mentors and judges report what they see to staff.
- **A teacher or mentor behaving wrongly.** Suspend their account first (Users → Suspend: it signs them out everywhere). They only ever see nicknames, and can't message a child privately: only team and class rooms, which moderators and parents can read. Record the evidence, then remove them from their school (Admin → Schools) or their teams (Admin → Hackathons). See [schools.md](schools.md).
- **Bullying in project content:** suspend the author's account while you look. Tell both families.
- **Sandbox escape or data exposure:**
  1. Take the affected part offline. Sandbox: take the sandbox site down on its host (lessons can't check code, but children are safe) or roll it back. API: roll back the image ([rollback.md](rollback.md)).
  2. If sessions or tokens may have been stolen, sign everyone out: run `UPDATE sessions SET revoked_at = now() WHERE revoked_at IS NULL;` and set a new `JWT_ACCESS_SECRET` (`openssl rand -base64 48`) on the host, then redeploy. The new secret invalidates every access token at once. Do **not** change `ENCRYPTION_KEY`: it decrypts staff two-factor secrets.
  3. If database or R2 credentials leaked, rotate them with the provider, then update the host's variables and the `DATABASE_URL` secret in the GitHub environment.

**Admin panel down?** Someone with database access can suspend an account directly. It takes effect within a minute (the session check is cached for 60 seconds). It is not in the audit log, so write it down:

```sql
UPDATE users SET status = 'SUSPENDED', updated_at = now() WHERE id = '<user id>';
UPDATE sessions SET revoked_at = now() WHERE user_id = '<user id>' AND revoked_at IS NULL;
```

## 2. Record the evidence

1. Write down: who reported it, when (UTC), what they saw, the user IDs involved, and every action you took, with times.
2. Take screenshots of what is visible (the shared page, the leaderboard). Store them in a restricted folder, never in email or chat.
3. **Do not delete the account, and ask the parent not to delete it yet.** Deleting a child removes their projects, drafts, check submissions, feedback, files and login history at once. Suspend instead.
4. Staff can't see project files in the admin panel. Someone with database and R2 access copies the child's `projects.files` (current draft), `submissions` (every checked attempt), `portfolio_items.files` (the R2 keys) and the R2 objects under `projects/<user id>/`.
5. For a room: copy the room's messages now (Room moderation → the report shows the context; someone with database access exports `chat_messages` for the room ID, and `chat_reports` / `moderation_actions` for the user IDs). The nightly job deletes messages older than 90 days.
6. Save the API logs for the time window now; the host may not keep them long. Search by `x-request-id` where you have one.
7. For a hackathon team: export the repository before changing anything (on the Forgejo server, `forgejo dump`, or clone it with the admin token), and note the team ID from Admin → Hackathons.
8. The audit log is append-only. Admin → Audit log, filter by entity ID and actor ID (the user IDs) to see suspensions, sign-outs, consent changes, share-link changes and certificate revocations with who, when and from which IP. Screenshot or copy the rows.
9. Backups keep deleted data until they age out. Tell the lawyer, because it matters for erasure requests.

## 3. Tell the right people

1. **The team:** Fawad and Meray, straight away.
2. **The lawyer:** every SEV1 safety or data incident, before any public statement and before contacting authorities.
3. **The parent(s):** the same day, in their language, from the team mailbox or by phone. What happened, what we did, what they can do. Don't blame the child. We never contact a child directly.
4. **Authorities where required:** child-protection bodies or the police when a child is at risk. The lawyer confirms which ones in each pilot country.
5. **Data-protection notifications:** for a personal-data breach, the regulator and the affected families may have to be told within a set time, counted from when you became aware. Deadlines and bodies differ by country: **check the lawyer-approved list for each pilot country**. Don't guess. Record the moment you became aware.
6. **Providers** (host, Cloudflare, Stripe) if their systems were involved.

## 4. Follow up

1. Decide each account's outcome with the parent: reactivate it (with a reason) once it is safe, keep it suspended, or delete it at the parent's request after the evidence is kept as long as the lawyer says.
2. Fix the cause with a test (for example the nickname check, the sandbox headers, a permission rule).
3. Write the post-incident review ([outage.md](outage.md#post-incident-review)) using user IDs, never names or nicknames.
4. Update this runbook and, if needed, the safety page (`apps/web/src/content/legal/safety.ts`, reviewed by the lawyer).
5. Reply to whoever reported it. Keep reading the admin panel's Feedback inbox every day. Messages sent as **Safety concern** come first and are counted on the Overview page, but read every message: a worried parent may choose another kind.
