
# ShadowFight PWA Constitution

## Core Principles


### I. TypeScript & SOLID Foundation
All code MUST be written in TypeScript. SOLID principles and clean code practices are mandatory. Code must be modular, maintainable, and easy to test. Rationale: Ensures long-term maintainability and reliability.


### II. Progressive Web App (PWA) & Responsiveness
The application MUST function as a PWA: installable, offline-capable, and responsive on all devices. Rationale: Guarantees accessibility and usability for all users, including mobile-first.


### III. Test-First & Quality Gates (NON-NEGOTIABLE)
All features MUST be developed using test-first or TDD. Unit and integration tests are required for all business logic. No code is merged without passing tests and code review. Rationale: Prevents regressions and enforces reliability.


### IV. Integration & Accessibility
Integration tests are required for all user flows and PWA features. All UI must comply with WCAG 2.1 accessibility standards. Rationale: Ensures the app works as a whole and is usable by everyone.


### V. Versioning & Simplicity
Semantic versioning (MAJOR.MINOR.PATCH) is required. Simplicity and YAGNI (You Aren't Gonna Need It) principles must guide all design and implementation. Rationale: Reduces complexity and risk.


## Additional Constraints

- Technology stack: TypeScript, Vite, Bootstrap 5, Web Audio API, Service Workers.
- Code must be linted (ESLint) and formatted (Prettier) before merge.
- All features must support offline use and mobile-first design.
- All code must be documented and reviewed before merging.



## Development Workflow & Quality Gates

- All work is done in feature branches, merged via pull request.
- Every PR must pass all tests, linting, and review.
- No feature is considered complete without user story acceptance and independent testability.
- Documentation and code comments are required for all public APIs and complex logic.
- After implementing any task, it MUST be marked as COMPLETED in the task tracking system.
- After implementing any task, a build MUST be run to verify project integrity before proceeding.


## Governance

- This constitution supersedes all other practices for the ShadowFight PWA.
- Amendments require documentation, team approval, and a migration plan if breaking.
- All PRs and reviews must verify compliance with these principles.
- Any complexity must be justified and documented.
- Compliance is reviewed at every major release and before feature freeze.


**Version**: 1.0.1 | **Ratified**: 2025-12-23 | **Last Amended**: 2025-12-23
