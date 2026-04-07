# SkillSync Frontend — Complete Developer Guide

This document explains the entire frontend: what it does, how it is structured, every major decision, and why things were built the way they were. Read this top to bottom to get a full picture.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [How the App Boots](#how-the-app-boots)
4. [Routing & Guards](#routing--guards)
5. [Authentication](#authentication)
6. [JWT Interceptor](#jwt-interceptor)
7. [Dashboard Shell](#dashboard-shell)
8. [Learner Dashboard](#learner-dashboard)
9. [Mentor Dashboard](#mentor-dashboard)
10. [Session Booking Flow](#session-booking-flow)
11. [My Sessions Page](#my-sessions-page)
12. [Find Mentors](#find-mentors)
13. [Learning Groups](#learning-groups)
14. [Profile & Profile Picture Upload](#profile--profile-picture-upload)
15. [Google OAuth Login](#google-oauth-login)
16. [Notifications](#notifications)
17. [Admin Panel](#admin-panel)
18. [Toast Notification System](#toast-notification-system)
19. [User Lookup Service](#user-lookup-service)
20. [Services Reference](#services-reference)
21. [Key Design Decisions](#key-design-decisions)
22. [Backend Connection](#backend-connection)

---

## Tech Stack

| Tool | Version | Why |
|------|---------|-----|
| Angular | 21 | Latest version with built-in control flow (`@if`, `@for`) and signals |
| Angular Material | 21 | Pre-built, accessible UI components that match the design |
| Angular Signals | built-in | Reactive state without needing RxJS everywhere — simpler than BehaviorSubjects for local state |
| RxJS | built-in | For HTTP calls, combining streams, switchMap chains |
| Razorpay | CDN | Payment gateway — loaded via script tag, not npm, so no tree-shaking issues |
| Google Identity Services | CDN | Google OAuth — same reason: loaded async via script tag |

---

## Project Structure

```
src/app/
├── core/                        # Shared infrastructure, not tied to any feature
│   ├── auth/
│   │   ├── auth.model.ts        # TypeScript interfaces: UserDTO, LoginRequest, etc.
│   │   ├── auth.service.ts      # Login, register, Google login, profile fetch/update
│   │   └── auth.guard.ts        # Route protection: authGuard, noAuthGuard, adminGuard
│   ├── interceptors/
│   │   └── jwt.interceptor.ts   # Attaches Bearer token to every outgoing HTTP request
│   ├── layout/
│   │   └── sidebar/             # Left navigation sidebar
│   ├── services/
│   │   ├── mentor.service.ts    # Mentor-service API calls
│   │   ├── session.service.ts   # Session-service API calls
│   │   ├── payment.service.ts   # Payment-service API calls
│   │   ├── group.service.ts     # Group-service API calls
│   │   ├── notification.service.ts
│   │   ├── review.service.ts
│   │   ├── skill.service.ts
│   │   ├── admin.service.ts
│   │   ├── toast.service.ts     # Global toast notification state
│   │   └── user-lookup.service.ts  # Batch-fetch user names from user-service
│   └── ui/
│       └── toast/               # Toast popup component (slide-in animation)
├── features/                    # One folder per feature/page
│   ├── welcome-page/            # Landing page for unauthenticated users
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dashboard/               # The main app shell after login
│   │   ├── dashboard.component  # Topbar + sidebar layout wrapper
│   │   ├── learner-dashboard/   # Dashboard content for LEARNER role
│   │   ├── mentor-dashboard/    # Dashboard content for MENTOR role
│   │   └── components/
│   │       └── mentor-application-dialog/
│   ├── sessions/
│   │   ├── book-session/        # Full multi-step booking + payment page
│   │   └── my-sessions.component
│   ├── mentors/
│   │   └── find-mentors/
│   ├── groups/
│   │   ├── groups.component
│   │   └── create-group-dialog/
│   ├── profile/
│   ├── notifications/
│   ├── reviews/
│   └── admin/
│       ├── admin-overview/
│       ├── user-management/
│       ├── mentor-approvals/
│       ├── platform-analytics/
│       └── skill-catalog/
└── shared/
    └── placeholder/
```

**Why this structure?** Separating `core` from `features` keeps infrastructure (auth, HTTP, interceptors) away from business logic pages. Each feature is self-contained — you can open any feature folder and understand it without reading the rest of the app.

---

## How the App Boots

`app.config.ts` is the entry point that wires everything together:

```
bootstrap → app.config.ts → provideRouter(routes) + provideHttpClient(withInterceptors([jwtInterceptor]))
```

- `provideHttpClient(withInterceptors([jwtInterceptor]))` — registers the JWT interceptor globally. Every HTTP call made anywhere in the app will automatically get the `Authorization: Bearer <token>` header attached.
- `provideRouter(routes)` — sets up lazy-loaded routing.
- `provideAnimations()` — required for Angular Material and the toast slide-in animations.

**Why standalone components?** Angular 21 uses standalone by default. There is no `AppModule`. Each component declares its own `imports: []` list. This makes tree-shaking more effective and removes the need for shared barrel modules.

---

## Routing & Guards

```
/                   → WelcomeComponent          (public)
/login              → LoginComponent            (noAuthGuard: redirect to /dashboard if already logged in)
/register           → RegisterComponent         (noAuthGuard)
/forgot-password    → ForgotPasswordComponent   (noAuthGuard)
/reset-password     → ResetPasswordComponent    (noAuthGuard)
/dashboard          → DashboardComponent        (authGuard: redirect to /login if not authenticated)
/book-session/:id   → BookSessionComponent      (authGuard)
/**                 → redirect to /
```

All routes use `loadComponent` (lazy loading) — the bundle for each page is only downloaded when the user navigates to it.

**Two guards:**

- `authGuard` — checks `isLoggedIn` OR that a token exists in `localStorage`. The token check handles the edge case where the user refreshes the page: the profile hasn't loaded yet but the token is there, so we let them through and the dashboard fetches the profile.
- `noAuthGuard` — the opposite: if the user is already logged in, redirect them away from `/login` and `/register` so they can't see those pages again.

---

## Authentication

**File:** `src/app/core/auth/auth.service.ts`

The auth service is the single source of truth for the logged-in user. It uses a `BehaviorSubject<UserDTO | null>` so any component can subscribe to `currentUser$` and react to login/logout changes.

### Login / Register flow

```
POST /auth/login (or /auth/register)
  → returns { token }
  → store token in localStorage
  → GET /users (with the token in Authorization header)
  → returns UserDTO (id, username, name, email, role, profilePictureUrl)
  → store UserDTO in BehaviorSubject
  → navigate to /dashboard
```

**Why fetch the profile separately?** The login endpoint only returns a JWT token. The JWT contains the user's email, roles, and ID — but not the full name, profile picture, or other fields. We need those for the UI, so we make a second call to user-service to get the full user object.

### Logout

Clears the BehaviorSubject (sets it to `null`), removes the token from localStorage, and navigates to `/login`.

### Google Login

```
User clicks "Sign in with Google"
  → Google Identity Services opens the Google account picker
  → User selects account
  → GIS calls our callback with a credential (ID token)
  → POST /auth/google { idToken }
  → Backend verifies the token with Google's tokeninfo endpoint
  → Backend finds or creates the user
  → Backend returns { token }
  → Same flow as normal login: store token → fetch profile → navigate
```

**Why send the ID token to the backend instead of handling OAuth entirely on the frontend?** We need the backend to create the user in the database and issue our own JWT. If we kept Google's token, every API call would need to verify it against Google, which adds latency and a Google dependency to every service.

---

## JWT Interceptor

**File:** `src/app/core/interceptors/jwt.interceptor.ts`

This is a functional HTTP interceptor (Angular 15+ style — no class needed):

```typescript
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (token && !isPublicUrl) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
```

**Why clone the request?** HTTP requests in Angular are immutable. You cannot modify them directly. `req.clone()` creates a new request object with the added header, then passes it forward with `next(req)`.

**Why skip public URLs?** Login and register don't need a token — they don't exist yet. Sending `Authorization: Bearer null` would cause backend errors.

The API Gateway reads this Bearer token, extracts the user's ID and email from the JWT, and injects them as `X-User-Id` and `X-User-Email` headers into the downstream microservice calls. This is why the frontend never sends the user ID explicitly in request bodies.

---

## Dashboard Shell

**File:** `src/app/features/dashboard/dashboard.component.ts`

The dashboard is a layout shell — it does not show any content itself. It contains:

1. **Sidebar** (`app-sidebar`) — left navigation
2. **Topbar** — page title, notification bell, user avatar
3. **Content area** — switches between feature components using `@switch (activePage)`

```html
@switch (activePage) {
  @case ('overview') {
    @if (isLearner) { <app-learner-dashboard /> }
    @else if (isMentor) { <app-mentor-dashboard /> }
  }
  @case ('sessions') { <app-my-sessions /> }
  @case ('groups') { <app-groups /> }
  ...
}
```

**Why not use the router for sub-pages?** The entire dashboard (sidebar + topbar) must stay on screen while the content area changes. Using the router would require a nested route setup with `<router-outlet>` inside the dashboard. The `activePage` signal approach is simpler and avoids URL changes for internal navigation — the URL stays `/dashboard` regardless of which tab is open.

### Topbar Avatar

The topbar shows the user's profile picture if `user.profilePictureUrl` is set, otherwise falls back to initials. This is done with a simple `@if` in the template:

```html
<div class="topbar-avatar">
  @if (user.profilePictureUrl) {
    <img class="topbar-avatar-img" [src]="user.profilePictureUrl" />
  } @else {
    {{ userInitials() }}
  }
</div>
```

---

## Learner Dashboard

**File:** `src/app/features/dashboard/learner-dashboard/`

Shows:
- Stats row: upcoming sessions count, connected mentors, completed sessions, total sessions
- "Apply to be a Mentor" promo banner
- Recommended Mentors grid (top 3 by rating)
- Upcoming Sessions table

### State management with Signals

```typescript
sessions        = signal<SessionResponse[]>([]);
mentors         = signal<MentorResponse[]>([]);
userMap         = signal(new Map<number, UserBasic>());
sessionMentorNames = signal(new Map<number, string>());
loadingSessions = signal(true);
loadingMentors  = signal(true);
```

Computed values derive from signals automatically — no manual subscriptions needed:

```typescript
upcomingSessions = computed(() =>
  this.sessions().filter(s => s.status === 'REQUESTED' || s.status === 'ACCEPTED')
);
```

**Why signals instead of RxJS BehaviorSubjects for local state?** Signals are simpler for UI state that doesn't need to be streamed or combined with other observables. They update synchronously and Angular's change detection picks them up automatically. RxJS is still used for HTTP calls (which are inherently async streams).

### Resolving mentor names

Mentors only expose `userId` — their name lives in user-service. The resolution chain is:

```
sessions → unique mentorIds → GET /mentors/{id} for each → get userId → POST /users/batch → names
```

This uses `forkJoin` to fetch all mentor profiles in parallel, then a single batch call to user-service:

```typescript
forkJoin(uniqueMentorIds.map(id => this.mentorService.getById(id)))
  → collect userIds
  → userLookup.batchFetch(userIds)
  → build mentorId → name map
```

The session table shows `Mentor #${id}` while loading, then switches to the real name once resolved.

---

## Mentor Dashboard

**File:** `src/app/features/dashboard/mentor-dashboard/`

Shows:
- Hero banner with greeting, quick stats (pending requests, active learners, rating), and profile picture
- Stat cards (total sessions, accepted, earnings estimate, rating)
- Pending requests table (sessions with status REQUESTED — these need accept/reject)
- Recent reviews

**Why do mentors see REQUESTED sessions as "pending"?** In the session lifecycle, `REQUESTED` means payment is confirmed (the learner paid) and the mentor hasn't responded yet. So from the mentor's perspective, these are incoming requests to approve.

---

## Session Booking Flow

**File:** `src/app/features/sessions/book-session/`

This is one of the most complex flows in the app. It is a multi-step page — not a dialog — because it involves date picking, payment, and result screens that need full page space.

### Steps

```
'select' → 'confirm' → 'processing' → 'success'
                                    → 'failed'
                                    → 'cancelled'
```

### Step 1: Select (pick date/slot/duration/topic)

- Calendar (Angular Material DatePicker) restricted to today → +1 month
- Time slots are hardcoded but filtered: if today is selected, past time slots are hidden
- Duration chips: 30, 60, 90 minutes
- Total price is computed: `hourlyRate × duration / 60`
- A sticky summary card on the right updates live as you pick options

### Step 2: Confirm

- Shows a summary grid of all selected details
- Price breakdown (base rate, duration, total)
- "Pay Securely" button triggers the payment flow

### Step 3: Processing → Payment

When the user clicks "Pay Securely":

```
1. POST /sessions → creates session with status PENDING_PAYMENT
2. POST /payments/initiate → creates a Razorpay order
3. Open Razorpay modal
```

**Why create the session first, then open payment?** Razorpay needs an `order_id` from our backend, which requires the session to exist so we can attach a payment to it.

**Why PENDING_PAYMENT status?** Sessions created but not yet paid should not appear on the mentor's dashboard as real requests. PENDING_PAYMENT is invisible to mentors — only the learner sees it in a "Pending Payment" tab on their sessions page.

### Payment outcomes

| What happens | Result |
|---|---|
| User pays successfully | Backend verifies signature → publishes `payment.success` event via RabbitMQ → session-service moves session to `REQUESTED` → learner sees success screen |
| User closes Razorpay modal | Frontend calls `PUT /sessions/{id}/cancel` immediately → session moved to `CANCELLED` → learner sees "cancelled" screen |
| Payment verification fails | Backend auto-cancels session via `payment.failed` RabbitMQ event → learner sees "failed" screen with support reference |

**Why cancel immediately when the modal is closed (ondismiss)?** If we didn't, the PENDING_PAYMENT session would stay in the database forever. The learner would see a "pending payment" session they can never pay for. Cancelling it keeps the data clean.

**Why no retry button on failure?** Once verification fails, the session is already cancelled on the backend. There is nothing to retry — a fresh booking (step 1 again) is needed. Showing a retry button would be misleading.

---

## My Sessions Page

**File:** `src/app/features/sessions/my-sessions.component.ts`

Shows sessions in tabs by status:

| Tab | Statuses shown | Who sees it |
|---|---|---|
| Pending Payment | PENDING_PAYMENT | Learner only |
| Upcoming | REQUESTED, ACCEPTED | Both |
| Completed | COMPLETED | Both |
| Cancelled | CANCELLED, REJECTED | Both |

**Why separate PENDING_PAYMENT into its own tab?** These are sessions where the user started booking but didn't finish paying. Mixing them with real upcoming sessions would be confusing — they are not confirmed yet.

**Why do REQUESTED and ACCEPTED both appear in "Upcoming"?** REQUESTED = payment done, waiting for mentor approval. ACCEPTED = mentor confirmed. Both are real, confirmed sessions from the learner's perspective (money has been exchanged for both). The distinction only matters for the mentor (they need to approve REQUESTED ones).

---

## Find Mentors

**File:** `src/app/features/mentors/find-mentors/`

Lists all ACTIVE mentors with filters (skill, min rating, max hourly rate).

- `filteredMentors` is a computed signal — it reactively filters the mentor list based on `searchTerm` without hitting the API again for client-side text search
- Mentor names are resolved via `UserLookupService.batchFetch()` after the mentor list loads
- The `avatarColor()` function deterministically picks a color from an array based on `mentor.id % colors.length` — so the same mentor always gets the same color across sessions

---

## Learning Groups

**File:** `src/app/features/groups/`

### Layout decision: list instead of cards

Groups are displayed as a horizontal list (one group per row) rather than a card grid. This allows:
- More groups visible at once without scrolling
- A colored left accent bar per group that acts as a visual identity marker
- Creator info (avatar + name) inline without needing to open a detail page

### Creator name resolution

Groups have a `createdBy` field which is a user ID (number). To show the name:

```
groups.map(g => g.createdBy) → unique IDs → POST /users/batch → Map<userId, UserBasic>
```

The result is stored in a `userMap` signal. Helper methods use it:

```typescript
creatorName(group): string
creatorPicture(group): string | null
creatorInitials(group): string
```

If the creator is the logged-in user, `creatorName()` returns `"You"` instead of their username.

### Creator cannot join or leave their own group

A creator is already the owner — showing Join/Leave buttons would be meaningless and potentially destructive. The button is hidden with:

```html
@if (g.createdBy !== user.id) {
  <div class="row-action">...</div>
}
```

The "Creator" badge is shown instead to indicate ownership.

---

## Profile & Profile Picture Upload

**File:** `src/app/features/profile/`

### Profile editing

Uses Angular Reactive Forms with validators. The form is read-only by default — the user clicks "Edit" to enable it, then "Save" or "Cancel". This prevents accidental edits.

### Profile picture upload

There is no file storage service (no S3, no separate image server). Instead:

1. User picks an image file via `<input type="file">`
2. The file is read with `FileReader.readAsDataURL()`
3. The data URL is drawn onto an HTML `<canvas>`, resized to max 256×256 pixels
4. `canvas.toDataURL('image/jpeg', 0.8)` converts it to a JPEG base64 string (~30–50KB)
5. This base64 string is sent to `PUT /users/me/picture` and stored as a `TEXT` column in MySQL

**Why base64 in the database instead of a proper file storage service?** This was a deliberate trade-off for simplicity. A proper setup would use S3/GCS + a CDN URL. But that requires extra infrastructure (buckets, IAM, signed URLs). Base64 in MySQL works fine for small avatar images (max 256px) and requires zero additional services.

**Why resize on the client side?** To keep the payload small. A raw phone photo could be 5MB+. Sending that over the network for an avatar is wasteful. The canvas resize happens entirely in the browser before any network call.

**Why the hover overlay?** The camera icon only appears when hovering over the avatar. This keeps the UI clean — users who don't want to change their picture are not distracted by the button.

---

## Google OAuth Login

**File:** `src/app/features/auth/login/login.component.ts`

Google Identity Services (GIS) is loaded via a `<script>` tag in `index.html`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**Why a script tag instead of an npm package?** GIS does not have an npm package. Google only distributes it as a CDN script. The `declare const google: any;` in the component tells TypeScript to trust that the `google` global exists at runtime.

### Initialization

```typescript
google.accounts.id.initialize({
  client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  callback: (response) => this.handleGoogleCredential(response)
});
```

When the user clicks the Google button, `google.accounts.id.prompt()` opens Google's account picker. After the user selects an account, Google calls our `callback` with an `id_token` (a JWT signed by Google).

### Why only the client ID is needed (no client secret)

We use the **ID token verification** flow, not the authorization code flow. The backend calls `https://oauth2.googleapis.com/tokeninfo?id_token=...` to verify the token — this endpoint only needs the ID token itself and checks that the `aud` (audience) field matches our client ID. The client secret is only needed for server-side authorization code exchanges, which we don't use.

---

## Notifications

**File:** `src/app/features/notifications/`

The unread count badge on the topbar bell is fetched once on dashboard init. When the user clicks the bell, the count is reset to 0 (optimistic update — assumes reading clears them).

---

## Admin Panel

Admin users see a different set of sidebar items:

- **Admin Overview** — platform-wide stats
- **User Management** — view/block/unblock all users
- **Mentor Approvals** — approve or reject pending mentor applications
- **Analytics** — session and revenue charts
- **Skill Catalog** — manage the skills that mentors can list

Role detection is done simply:

```typescript
get isAdmin() { return this.authService.currentUser?.role?.toUpperCase().includes('ADMIN'); }
```

The role string from the backend is `ROLE_ADMIN` / `ROLE_LEARNER` / `ROLE_MENTOR`. Using `.includes('ADMIN')` instead of strict equality makes it robust to prefix variations.

---

## Toast Notification System

**Files:** `src/app/core/services/toast.service.ts`, `src/app/core/ui/toast/toast.component.ts`

A global toast system that shows slide-in notifications in the bottom-right corner.

### How it works

`ToastService` holds a signal of active toasts. Any component or service can call:

```typescript
toastService.success('Profile updated!');
toastService.error('Something went wrong.');
toastService.warning('Session is about to expire.');
```

`ToastComponent` is placed in `app.component.html` once, at the root level, so it's always present regardless of which page you're on.

Each toast auto-dismisses after a configurable timeout (default 3 seconds). The slide-in/slide-out animation uses Angular's `@angular/animations` with `cubic-bezier` easing.

**Why a global service instead of per-component alerts?** Alerts in-line with content push the layout around and disappear when you navigate away. A global toast stays visible even during navigation and doesn't affect layout.

---

## User Lookup Service

**File:** `src/app/core/services/user-lookup.service.ts`

This service solves a repeated problem: many parts of the app display a user ID (from sessions, groups, mentors) but need to show a name.

```typescript
batchFetch(ids: number[]): Observable<Map<number, UserBasic>>
```

It calls `POST /api/users/batch` with a list of user IDs and returns a Map for O(1) lookups.

**Why batch instead of individual calls?** If there are 20 groups each with a different creator, making 20 separate GET requests would be slow and wasteful. One POST with all 20 IDs is a single round-trip.

**Why an in-memory cache?** The `UserLookupService` is a singleton (`providedIn: 'root'`). It keeps a `Map<number, UserBasic>` cache. If the dashboard already fetched user 42's info, the groups page won't re-fetch it — `batchFetch` filters out already-known IDs before making any HTTP call.

```typescript
const unknown = ids.filter(id => !this.cache.has(id));
if (unknown.length === 0) return of(result from cache);
// only hit the network for new IDs
```

---

## Services Reference

| Service | Base URL | What it calls |
|---|---|---|
| `AuthService` | `/api/auth`, `/api/users` | Login, register, Google, profile fetch/update |
| `MentorService` | `/api/mentors` | Get all mentors, get by ID, apply as mentor |
| `SessionService` | `/api/sessions` | Book, cancel, accept, reject, complete, get user sessions |
| `PaymentService` | `/api/payments` | Initiate Razorpay order, verify signature |
| `GroupService` | `/api/groups` | Get groups, create, join, leave |
| `ReviewService` | `/api/reviews` | Get reviews, submit review |
| `SkillService` | `/api/skills` | Get all skills |
| `NotificationService` | `/api/notifications` | Get notifications for user |
| `AdminService` | `/api/admin` | Admin-only: user management, mentor approvals |
| `UserLookupService` | `/api/users/batch` | Batch fetch user names by ID |

---

## Key Design Decisions

### Why Angular Signals over `*ngIf`/`*ngFor`

Angular 17+ introduced built-in control flow (`@if`, `@for`, `@switch`) and signals. The old `*ngIf`/`*ngFor` directives needed to be imported as `CommonModule`. Signals and the new syntax are built-in — no import needed — and they give more precise change detection (only the signal's dependents re-render, not the whole component).

### Why Angular Material

The design uses Angular Material throughout for buttons, form fields, cards, dialogs, chips, date pickers, and spinners. Material provides:
- Consistent, accessible components out of the box
- Built-in theming (the red `#DD0031` primary color is set globally in `styles.scss`)
- Ripple effects, focus management, ARIA attributes — things that are tedious to build manually

### Why standalone components everywhere

Every component has `standalone: true` and its own `imports: []`. This means:
- No shared `NgModule` files to maintain
- Lazy loading works at the component level (each route's component is its own bundle)
- It is obvious from reading a component file exactly what it depends on

### Why the API Gateway pattern

All API calls go to one IP (`http://34.14.151.244/api`). The API Gateway receives the request, reads the JWT, injects `X-User-Id` and `X-User-Email` as headers, and forwards the request to the correct microservice. This means:
- The frontend only needs to know one host
- Microservices don't need to validate JWTs themselves — the gateway handles auth
- The frontend never explicitly sends the user ID in request bodies; the gateway extracts it from the token

### Why `loadComponent` (lazy loading) on all routes

The entire app is not downloaded upfront. Each route's component is fetched only when navigated to. This significantly reduces the initial bundle size and time-to-interactive.

---

## Backend Connection

The app connects to a backend running on Google Kubernetes Engine (GKE):

- **API Gateway**: `http://34.14.151.244/api` — all traffic goes through here
- **Namespace**: `skillsync` on GCP cluster
- **Backend services**: auth-service (8081), user-service (8082), session-service, mentor-service, payment-service, group-service, notification-service, review-service, skill-service

The API Gateway routes based on path prefix:
- `/api/auth/**` → auth-service
- `/api/users/**` → user-service
- `/api/mentors/**` → mentor-service
- `/api/sessions/**` → session-service
- `/api/payments/**` → payment-service
- etc.

### Config-driven environment

Backend services use a Spring Cloud Config Server pulling config from the `skillsync-config` git repo (branch `d-configs`). Secrets (DB passwords, JWT secret, SMTP credentials, Razorpay keys, Google Client ID) are stored as Kubernetes secrets and injected as environment variables at runtime.
