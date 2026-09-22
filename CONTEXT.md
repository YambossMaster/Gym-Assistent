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

**Lesson Purchase**:
A recorded grant of lesson entitlement to a Student.
_Avoid_: Balance adjustment, payment

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
