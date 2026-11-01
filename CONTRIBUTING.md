# Contributing to Infera Notebook

First off, thank you for considering contributing to Infera Notebook! It's people like you that make Infera Notebook such a great project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Questions](#questions)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **pnpm** 9.x or higher (recommended)
- **Node.js** 22.x or higher
- **PostgreSQL** 16+ database running locally or remotely
- **Git** installed and configured
- A code editor (VS Code recommended)
- Familiarity with **React 19**, **Next.js 16**, and **Tailwind CSS 4**

### Setting Up Your Development Environment

1. **Fork the repository**

   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/infera-notebook.git
   cd infera-notebook
   ```

3. **Add the upstream repository**

   ```bash
   git remote add upstream https://github.com/shakibweg/infera-notebook.git
   ```

4. **Install dependencies**

   ```bash
   pnpm install
   ```

5. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your database, AI API keys, Pinecone, and S3 credentials
   ```

   > [!NOTE]
   > Operational scripts (`scripts/setup-bucket.ts`, `scripts/reset-pinecone.ts`) and Prisma load configuration directly from `.env`.

6. **Set up the database**

   ```bash
   pnpm run db:migrate
   ```

7. **(Optional) Configure Storage Bucket & CORS**

   ```bash
   pnpm run bucket:setup
   ```

8. **Start the development server**

   ```bash
   pnpm run dev
   ```

9. **Start Inngest dev server** (in a separate terminal)
   ```bash
   pnpm run inngest:dev
   # or run directly: inngest dev (dashboard on http://localhost:8288)
   ```

## Development Process

### Branch Naming Convention

Create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
# or
git checkout -b docs/your-documentation-update
```

Branch naming prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

### Keeping Your Fork Updated

Regularly sync your fork with the upstream repository:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid using `any` type - use proper types or `unknown`
- Use interfaces for object shapes, types for unions/intersections
- Export types and interfaces that might be used elsewhere

### React Components

- Use functional components with hooks (Server and Client Components)
- Use TypeScript for component props and return types
- Follow the existing shadcn/ui and Radix UI patterns
- Use meaningful component and prop names

**Example:**

```tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn('button', variant)}>
      {children}
    </button>
  );
}
```

### File Organization

- Place components in appropriate directories
- Use index files for clean imports
- Keep related files together
- Follow the existing project structure

### Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase starting with `use` (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase (e.g., `UserProfile`)

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings (unless escaping)
- Use trailing commas in multi-line objects/arrays
- Keep lines under 100 characters when possible
- Use meaningful variable and function names

### Comments

- Write self-documenting code when possible
- Add comments for complex logic or business rules
- Use JSDoc comments for exported functions
- Keep comments up-to-date with code changes

**Example:**

```typescript
/**
 * Processes a source file and extracts text content.
 * Supports PDF, DOCX, and TXT formats.
 *
 * @param file - The file to process
 * @returns Promise resolving to extracted text content
 * @throws Error if file format is not supported
 */
async function processSourceFile(file: File): Promise<string> {
  // Implementation
}
```

### Testing

- Write tests for new features and bug fixes
- Aim for meaningful test coverage
- Test edge cases and error scenarios
- Keep tests simple and readable

## Commit Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
feat(notes): add audio overview generation
fix(chat): resolve citation display issue
docs(readme): update installation instructions
refactor(sources): improve file processing logic
test(api): add tests for note creation endpoint
```

### Commit Best Practices

- Make small, focused commits
- Write clear, descriptive commit messages
- One logical change per commit
- Test your changes before committing

## Pull Request Process

### Before Submitting

1. **Update your branch**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run local CI validation suite**
   Ensure your code passes all checks that run in GitHub Actions:

   ```bash
   # Type checking
   pnpm run typecheck

   # ESLint code quality
   pnpm run lint

   # Prettier format check
   pnpm run format:check
   ```

   To automatically format any mismatched files:

   ```bash
   pnpm run format
   ```

3. **Test your changes**
   - Test all affected UI components and API routes
   - Verify that background jobs complete without errors in the Inngest dev console
   - Verify the production build succeeds locally:
     ```bash
     pnpm run build
     ```

4. **Update documentation**
   - Update README.md or ARCHITECTURE.md if changing workflows, models, or schemas
   - Add JSDoc comments for complex utilities or handlers
   - Update type definitions and Zod validation schemas

### Submitting a Pull Request

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**
   - Use a clear, descriptive title
   - Reference related issues
   - Provide a detailed description

3. **PR Description Template**

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing

   Describe how you tested your changes

   ## Checklist

   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings
   - [ ] Tests added/updated
   - [ ] All tests passing
   ```

### Review Process

- Maintainers will review your PR
- Address any feedback promptly
- Be open to suggestions and improvements
- Keep discussions constructive and respectful

### After Approval

- Maintainers will merge your PR
- Your contribution will be included in the next release
- Thank you for contributing! 🎉

## Reporting Bugs

### Before Reporting

1. Check existing issues to avoid duplicates
2. Ensure you're using the latest version
3. Try to reproduce the issue consistently

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**

- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 20.10.0]
- Version: [e.g., 0.1.0]

**Additional context**
Any other relevant information.
```

## Suggesting Enhancements

### Enhancement Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Any other context, mockups, or examples.
```

## Questions

If you have questions:

1. Check the [README](README.md) for documentation
2. Search existing [Issues](https://github.com/shakibweg/infera-notebook/issues)
3. Create a new issue with the `question` label
4. Be patient - maintainers are volunteers

## Contact

If you have questions, feedback, or need to reach out to the project maintainers directly:

- **Maintainer**: Shakib Khan
- **Email**: [shakibweg@gmail.com](mailto:shakibweg@gmail.com)
- **GitHub**: [@shakibweg](https://github.com/shakibweg)
- **Issues**: [GitHub Issues](https://github.com/shakibweg/infera-notebook/issues)

## Recognition

Contributors will be:

- Listed in the project README (if significant contribution)
- Credited in release notes
- Appreciated by the community! 🙏

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)

---

Thank you for contributing to Infera Notebook! Your efforts help make this project better for everyone. 🚀
