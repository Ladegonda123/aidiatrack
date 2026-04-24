# AIDiaTrack Backend Test Suite

Complete Jest + Supertest + ts-jest testing setup for the AIDiaTrack backend.

## Setup Summary

### Files Created/Modified

1. **jest.config.ts** — Main Jest configuration
   - Uses `ts-jest` preset for TypeScript support
   - Test environment: Node
   - Test match pattern: `**/__tests__/**/*.test.ts` and `**/tests/**/*.test.ts`
   - Setup file: `src/__tests__/setup.ts`
   - Coverage: excludes `.d.ts`, `server.ts`, `app.ts`

2. **src/app.ts** — Express app export (NEW)
   - Exports Express app without starting server
   - Includes all middleware and routes
   - Allows Supertest to import and test without listening

3. **src/server.ts** — Server startup (UPDATED)
   - Imports app from `./app`
   - Handles HTTP server creation
   - Sets up Socket.IO
   - Registers reminder crons
   - Calls `app.listen(PORT)`

4. **src/**tests**/setup.ts** — Test setup and teardown
   - Connects to database before tests
   - Cleans up test data after all tests
   - Auto-removes users with 'test_jest' in email

5. **Test Files** (in src/**tests**/):
   - `auth.test.ts` — Authentication endpoints
   - `health.test.ts` — Health record logging
   - `doctor.test.ts` — Doctor portal endpoints
   - `admin.test.ts` — Patient assignment/unassignment
   - `notifications.test.ts` — Notification endpoints
   - `chat.test.ts` — Chat messaging
   - `food-and-predictions.test.ts` — Food database & predictions

6. **package.json** — Updated scripts
   - `npm test` — Run all tests once
   - `npm run test:watch` — Watch mode for development
   - `npm run test:coverage` — Generate coverage report

## Prerequisites

All dependencies are already installed in `backend/package.json`:

- jest: ^30.3.0
- supertest: ^7.2.2
- ts-jest: ^29.4.9
- @types/jest: ^30.0.0
- @types/supertest: ^7.2.0

## Running Tests

### From backend/ directory in PowerShell:

```powershell
# Run all tests once
npm test

# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should register"

# Watch mode (reruns on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Database Setup for Tests

Tests use the **same PostgreSQL database as development**. Test data is automatically cleaned up after each test run.

### Key Points:

1. **DATABASE_URL** must be set in `.env` (same as development)
2. Database is connected once at test start in `setup.ts`
3. Test users have emails containing `'test_jest'` for automatic cleanup
4. All test data is deleted in `afterAll()` hook
5. Tests run sequentially (`--runInBand`) to prevent conflicts

### If database connection fails:

1. Verify PostgreSQL is running:

   ```powershell
   # Check service status
   Get-Service postgresql-16 | Select-Object Status

   # If not running:
   Start-Service postgresql-16
   ```

2. Check DATABASE_URL in `.env`:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/aidiatrack_dev"
   ```

3. Verify database exists:
   ```powershell
   npx prisma db push  # Updates schema if needed
   npx prisma db seed  # Seeds test data (seeded doctor + patients)
   ```

## Test Structure

Each test file follows this pattern:

```typescript
import request from "supertest";
import app from "../app";

describe("Feature/Endpoint", () => {
  beforeAll(async () => {
    // Setup: register/login test users
  });

  it("should do something", async () => {
    const res = await request(app)
      .post("/api/endpoint")
      .set("Authorization", `Bearer ${token}`)
      .send({ data });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("property");
  });
});
```

### Request Format:

```typescript
const res = await request(app)
  .post('/api/auth/register')           // HTTP method and path
  .set('Authorization', `Bearer ${token}`)  // Headers
  .send({ email, password, ... });      // Request body

// Response structure
expect(res.status).toBe(201);            // HTTP status
expect(res.body.data.user).toBeDefined();  // Response body
expect(res.body.success).toBe(true);     // Success flag
```

## Test Files Overview

### auth.test.ts

- Register new patient
- Duplicate email rejection
- Invalid email format rejection
- Password length validation
- Login with correct credentials
- Login with wrong password
- Non-existent email
- GET /api/auth/me with token
- GET /api/auth/me without token
- PUT /api/auth/profile (update language, fullName)

### health.test.ts

- Log health record (required bloodGlucose only)
- Log record with all optional fields
- Reject record without blood glucose
- Reject record without token
- Reject invalid blood glucose value
- GET history (paginated)
- GET summary stats

### doctor.test.ts

- GET list of assigned patients
- GET patient detail by ID
- GET patient predictions history
- Handles seeded doctor account gracefully

### admin.test.ts

- POST assign-patient (handles not found, already assigned)
- POST unassign-patient
- GET unassigned-patients list
- GET search patients

### notifications.test.ts

- GET notifications (paginated)
- PUT mark as read
- DELETE notification

### chat.test.ts

- POST send message
- Validate receiverId and content required
- GET chat history with receiver
- GET history with pagination
- PUT mark message as read

### food-and-predictions.test.ts

- GET foods list and search
- GET dietary recommendations
- POST schedule medication
- GET active medications
- POST trigger glucose prediction
- GET prediction history

## Seeded Test Accounts

The backend seed file creates these test accounts. Tests use them when available:

| Role    | Email                  | Password  |
| ------- | ---------------------- | --------- |
| DOCTOR  | doctor@aidiatrack.rw   | Test@1234 |
| PATIENT | patient1@aidiatrack.rw | Test@1234 |
| PATIENT | patient2@aidiatrack.rw | Test@1234 |

### To seed the database:

```powershell
npm run seed
```

## Coverage Report

After running `npm run test:coverage`, open `backend/coverage/index.html` in browser to view detailed coverage.

## Important Notes

1. **No Mocking** — Tests hit the real database (same as dev)
2. **Auto Cleanup** — Test data (email with 'test_jest') removed after tests
3. **AI Service Optional** — Tests don't require AI service running
4. **Socket.IO Disabled** — Tests use plain Express app without Socket.IO
5. **Rate Limiting** — Tests run sequentially to avoid rate limit issues

## Troubleshooting

### Test timeout errors

If tests timeout, increase in `jest.config.ts`:

```typescript
testTimeout: 10000, // milliseconds
```

### Port already in use

Tests don't start a server (no listening), but if you get this error:

```powershell
npm run dev  # Stop any running dev server
npm test
```

### Database connection failed

```powershell
# Check connection string
$env:DATABASE_URL
echo $env:DATABASE_URL

# Reconnect to PostgreSQL
Get-Service postgresql-16 | Stop-Service
Get-Service postgresql-16 | Start-Service

# Try again
npm test
```

### Transaction/Lock errors

Tests may lock the database if interrupted. Reset:

```powershell
npm run prisma:reset  # Drops and recreates database
npm run seed           # Reseed with test data
npm test
```

## CI/CD Integration

Add to GitHub Actions or CI pipeline:

```yaml
- name: Run tests
  run: |
    cd backend
    npm install
    npm run prisma:generate
    npm test -- --coverage
```

## Next Steps

1. ✅ Run tests: `npm test`
2. ✅ Check coverage: `npm run test:coverage`
3. ✅ Watch mode: `npm run test:watch`
4. Add more tests as features are developed
5. Integrate into CI/CD pipeline
