# Gym Assistant

Gym Assistant lets an independent private coach manage students, lesson entitlement, scheduling,
and training history while granting students narrowly scoped access without student accounts.

## Language

**Coach**:
The authenticated person who owns and operates one private-coaching business data set.
_Avoid_: Admin, staff, trainer account

**Workspace**:
The private data-ownership scope belonging to one Coach. It is a tenancy concept and is not a
multi-coach collaboration area.
_Avoid_: Team, organization

**Student**:
A person coached by the Coach who does not have a Gym Assistant account.
_Avoid_: User, member, customer account

**Student Introduction**:
A short Coach-written cue for recognizing a Student, such as an occupation, trait, or label. It may
mention a training aim, but is not limited to one.
_Avoid_: Training Goal

**Student Note**:
Private Coach-written context about a Student, including training aims or details that do not belong
in the brief introduction.

**Lesson Purchase**:
A recorded grant of lesson entitlement to a Student.
It may grant lessons usable at any Venue or lessons bound to one named Venue.
_Avoid_: Balance adjustment, payment

**Venue**:
A Coach-named place used for a Course Session. The Coach may record only its name or
optionally track the cost of teaching there.
_Avoid_: Treating an untracked Venue as a free Venue

**Venue Lesson Purchase**:
A Coach-recorded purchase of a number of lessons that can be taught at one Venue.
Its full price is an expense when purchased; using a lesson reduces the remaining count.
_Avoid_: Charging the purchase price again for each completed Course Session

**Venue Course Record**:
The Coach's view of one completed Course Session at a Venue, including the applied expense rule,
any fee or prepaid-lesson use, and its source links. It is not a second Course Session.
_Avoid_: Treating a monthly finance row as the source Course Session

**Customer Source**:
For dual-rate Venue commission, display the two sources as 「場地供客」 and 「自帶客」.
The source describes who brought the Student, not who collected the Lesson Purchase payment.

**Venue Lesson Allocation**:
The assignment of one completed Course Session to one Venue Lesson Purchase batch, consuming
one available Venue lesson. A Session can instead be explicitly exempt or await allocation.
_Avoid_: Assuming every completed Session automatically belongs to the oldest purchase

**Venue Base Salary**:
A fixed monthly amount a Venue pays the Coach, recorded as income on that Venue's configured
monthly pay day.
_Avoid_: Student Lesson Purchase, Venue expense

**Course Session**:
One scheduled occurrence of coaching that may later be completed or cancelled.
_Avoid_: Event, appointment

**Capability Link**:
An expiring, resource-scoped grant that lets an unauthenticated Student perform one named action or
read one named projection.
_Avoid_: Student login, share token

**Training Record**:
The exercises and set outcomes recorded for one Course Session.
_Avoid_: Workout plan, health record

**Recording Type**:
The combination of measurements used to record a set of one Exercise, such as weight and
repetitions, duration, or distance and duration.
_Avoid_: Best-performance metric, intensity

**Primary Progress Metric**:
A measurement selected for an Exercise's progress summaries and growth trajectory. An Exercise
can have one or two primary progress metrics allowed by its Recording Type.
_Avoid_: Recording type, RPE
