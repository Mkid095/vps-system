# ADR-003: Feature-Based Folder Structure

**Status:** Accepted

**Date:** 2025-01-11

## Context

**Problem:**
- Traditional folder structures (components/, pages/, utils/) mix unrelated code
- Difficult to find all code related to a specific feature
- High coupling between unrelated features
- Difficult to delete or refactor features

**Observed Issues:**
- Components folder becomes a dumping ground with 100+ files
- Cross-imports between unrelated features create tight coupling
- No clear ownership or boundaries

## Decision

**Enforce feature-based folder structure with strict isolation rules:**

```
src/
├── app/                    # Entry points, routing
├── features/               # Isolated feature modules
│   ├── auth/              # Cannot import from other features
│   │   ├── api/           # Server actions, API clients
│   │   ├── components/    # Feature-specific UI
│   │   ├── hooks/         # Feature-specific hooks
│   │   ├── types/         # Feature-specific types
│   │   └── index.ts       # Public API
│   ├── dashboard/
│   └── [feature-name]/
├── shared/                # Shared code (no feature imports)
│   ├── ui/                # Reusable components
│   ├── api/               # Backend clients
│   └── utils/             # Utilities
```

**Key Principles:**
1. **Feature isolation**: Features cannot import from other features
2. **Shared code only**: Features can import from `@shared/*`
3. **Path aliases**: Use `@shared/*`, `@features/*`, `@app/*` (no relative imports)
4. **Clear boundaries**: Each feature is self-contained

## Consequences

**Benefits:**
- **Clear ownership**: Each feature has its own directory
- **Easy navigation**: Find all code for a feature in one place
- **Loose coupling**: Features don't depend on each other
- **Easy deletion**: Delete a feature by removing its directory
- **Parallel development**: Teams can work on different features without conflicts

**Trade-offs:**
- **More directories**: More nested structure vs flat structure
- **Import verbosity**: Longer import paths (mitigated by path aliases)
- ** upfront planning**: Must identify feature boundaries early

## Alternatives Considered

### Alternative 1: Traditional Component-Based Structure
**Description:** Organize by file type (components/, hooks/, utils/).

**Rejected because:**
- No clear feature boundaries
- High coupling between unrelated code
- Difficult to find all code for a feature

### Alternative 2: Layer-Based Architecture
**Description:** Organize by layer (ui/, domain/, infrastructure/).

**Rejected because:**
- More complex to navigate
- Less intuitive for feature development
- Still allows cross-feature coupling

### Alternative 3: Domain-Driven Design (DDD) Structure
**Description:** Organize by domains with bounded contexts.

**Rejected because:**
- Over-engineering for most applications
- Steeper learning curve
- Feature-based is simpler and achieves same goals

## Implementation

**tsconfig.json paths:**
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./src/shared/*"],
      "@features/*": ["./src/features/*"],
      "@app/*": ["./src/app/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

**ESLint rule for isolation:**
```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["@features/**/..", "@features/**/../.."],
        "message": "Features cannot import from other features"
      }]
    }]
  }
}
```

**Import examples:**
```typescript
// ✅ CORRECT - Feature imports from shared
import { Button } from '@shared/ui';
import { useAuth } from '@features/auth/hooks';

// ❌ WRONG - Cross-feature import
import { ProductCard } from '@features/products/components/ProductCard';

// ✅ CORRECT - Local imports within feature
import { ComponentHeader } from './ComponentHeader';
```

## Migration Process

**Step 3 in Maven workflow** handles migration:

1. Identify feature boundaries
2. Create feature directories (`src/features/[feature-name]/`)
3. Move code to appropriate locations
4. Update imports to use @ aliases
5. Remove cross-feature imports
6. Validate with ESLint rules

## References

- `.claude/agents/refactor.md` - Refactor agent documentation
- `.claude/shared/agent-patterns.md` - Common architecture patterns
