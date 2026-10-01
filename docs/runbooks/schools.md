# Schools, teachers and the readiness check

How to bring a school on, keep its licence right, and handle the hub readiness check.
Everything here is in the admin panel (`<admin>`) unless it says otherwise; admins
can do it, moderators can only look.

## Bring a school on

1. **Admin → Schools → Add a school.** The contact (name and email) is the person who
   gets invoices. It is staff-only: teachers, students and parents never see it.
2. **Add a teacher** on the school's page with their work email and the name students
   should see (for example "Ms Aslam"). A new address gets an invitation email: they
   choose a password, then set up two-factor login at their first sign-in (like
   mentors). An existing teacher account is simply linked.
3. **Add a licence** when the invoice goes out: seats (students), start and end dates,
   invoice number and amount. Nothing changes for students yet.
4. **Mark it paid** when the bank transfer arrives, with the transfer's reference.
   From that moment students in the school's classes get premium, first come first
   served, up to the seats. Students who join later get a seat while seats are free.

The teacher then makes classes in the web app (`<web>/en/teacher`), shares each
class's 6-character code, and each student's parent approves the place (dashboard,
app, email). Teachers see nicknames, avatars, progress on the lessons they set, and a
weekly XP board. They talk with the class in a moderated class room.

## During the year

- **More students than seats.** The teacher's class page shows "N of M places used";
  students past the seats are in the class without school premium. Add a second
  licence for the extra seats (its own invoice), then mark it paid.
- **Renewal.** Add next year's licence before this one ends (start date = the old end
  date). Mark it paid when the money arrives; premium carries on without a gap only if
  it is paid before the old one ends.
- **A student leaves.** The teacher removes them from the class (or the student
  leaves). School premium ends unless they are in another of the school's classes.
- **A teacher leaves.** They archive their classes (or you ask them to), then remove
  them from the school. The panel refuses to remove a teacher who still has open
  classes. To stop access at once, suspend the account (Users) as for any adult.
- **The school stops.** Cancel the licence with a reason: premium from it ends for
  every student at once. Refunds happen outside the platform (record them in your
  accounting); the licence stays in the history.
- **End of the school year.** Teachers archive their classes: codes stop working,
  rooms stay readable, premium from the school ends.

All of this is in the audit log (`school.*`, `license.*`).

## A problem in a class

- **Something said in a class room**: Room moderation, as for team rooms
  ([safety-incident.md](safety-incident.md)).
- **A teacher behaving wrongly** (contacting a child, sharing something they
  shouldn't): suspend the teacher's account first (Users → the teacher → Suspend),
  record the evidence, tell the school's contact and the lawyer. Then remove them from
  the school. Teachers can't message a child privately: only the class room.

## The hub readiness check

Students aged 13 and older who finished the Pro track (and have premium) can take a
3-hour practical brief in the web app (`/learn/readiness`). The timer runs on the
server; what they saved is handed in when time runs out. It arrives in the mentor
console as a review marked "Hub readiness check", graded on four criteria (works, code,
design, independence) with "Passed" or "Not yet". "Not yet" can be tried again after
30 days (7 days after an empty attempt).

- **Queue.** The target is the same as project reviews: a decision within 48 hours.
  The mentor console shows overdue ones.
- **Disputes.** A family who disagrees: another mentor can look at the review (the
  first one releases it, or you ask them to). The decision itself isn't changed in the
  database by hand.
- **What passing means.** It records readiness only. It does **not** make a student
  eligible for hub work: that needs the Phase 3 eligibility flow, a mentor sign-off
  and a parent's approval.
- **Gate 2 number.** Students who passed: `SELECT count(DISTINCT student_id) FROM
readiness_checks WHERE status = 'PASSED';`
