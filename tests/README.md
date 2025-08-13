# E2E Testing Setup

This directory contains end-to-end tests using Playwright for the Better Chatbot application.

## Quick Start

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm playwright:install

# Run tests
pnpm test:e2e

# Run tests with UI
pnpm test:e2e:ui

# Run tests in debug mode
pnpm test:e2e:debug
```

## Test Structure

- `auth.setup.ts` - Creates test users and authentication state
- `agents.spec.ts` - Basic application functionality tests
- `agent-sharing.spec.ts` - Comprehensive agent workflow tests
- `agents-authenticated.spec.ts` - Legacy authenticated tests
- `teardown.global.ts` - Cleans up test data after test runs

## Requirements

1. **Database**: PostgreSQL instance with proper schema
2. **Environment Variables**: 
   - `POSTGRES_URL` - Database connection string
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - LLM provider keys
   - `BETTER_AUTH_SECRET` - Authentication secret

## Test Features

- ✅ User registration and authentication
- ✅ Agent creation workflow
- ✅ Agent editing and management
- ✅ Agent sharing and visibility
- ✅ Responsive design testing
- ✅ Error handling and validation
- ✅ Automatic test data cleanup

## Data Test IDs

The tests rely on `data-testid` attributes for reliable element selection:

- `agent-name-input` - Agent name input field
- `agent-description-input` - Agent description input field  
- `agent-prompt-textarea` - Agent instructions textarea
- `agent-save-button` - Save agent button
- `agent-card-name` - Agent name in card view
- `sidebar-agent-name` - Agent name in sidebar
- `agents-title` - Agents page title

## Database Cleanup

Tests automatically clean up after themselves by:
1. Identifying test users by email patterns (`%playwright%`, `%test%`, `%example.com%`)
2. Deleting associated data in proper order (foreign key constraints)
3. Removing test users completely

## Best Practices

1. **Use data-testids**: Always prefer `data-testid` over text-based selectors
2. **Wait for states**: Use `waitForLoadState("networkidle")` for async operations
3. **Unique test data**: Generate unique names using timestamps to avoid conflicts
4. **Error tolerance**: Filter out expected development errors in console tests
5. **Database safety**: Always use test email patterns for user creation

## Debugging

```bash
# Run specific test file
npx playwright test tests/agent-sharing.spec.ts

# Run with browser visible
npx playwright test --headed

# Debug mode with breakpoints
npx playwright test --debug

# Generate test report
npx playwright show-report
```