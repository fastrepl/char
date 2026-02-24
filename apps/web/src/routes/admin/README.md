# Admin Interface

The admin interface at `/admin` provides content management capabilities for the Hyprnote website.

## Authentication

Access is restricted to whitelisted email addresses. The whitelist is defined in `src/functions/admin.ts`:

- yujonglee@hyprnote.com
- john@hyprnote.com
- harshika@hyprnote.com

Users must be authenticated via Supabase to access admin routes.

## Features

### Media Library (`/admin/media`)

Upload, organize, and manage media assets stored in `apps/web/public/images/`.

- Drag-and-drop file upload
- Folder navigation with breadcrumbs
- Multi-select with batch delete, download, and move
- Context menu for individual file actions (rename, copy as PNG, download, delete)
- Sidebar with search, file type filters, and folder tree navigation

### Google Docs Import (`/admin/import`)

Import blog posts from published Google Docs with automatic HTML-to-Markdown conversion.

1. Publish a Google Doc (File > Share > Publish to web)
2. Paste the published URL
3. Review and edit the generated MDX
4. Fill in metadata (title, author, description, cover image)
5. Select destination folder and save

### Content Management (`/admin/collections`)

Full-featured blog editor with the following capabilities:

- Create, edit, and manage blog articles
- Rich text editor with Google Docs import
- Metadata panel (title, author, date, description, category, cover image)
- Preview mode with side-by-side editing
- Git history tracking
- Draft management with branch-based workflow

#### Editorial Workflow

Complete flow from editing to publication:

**1. User Edits a Published Article**
- Open `/admin/collections` and select a published article
- Make changes in the editor

**2. User Clicks "Save"**
- Creates a new branch `blog/{slug}-{timestamp}` (or uses existing one)
- Commits with `ready_for_review: false` in frontmatter
- Creates/updates PR to `main`

**3. GitHub Actions Trigger**
- `blog-grammar-check.yml` - Runs AI grammar check, posts suggestions as PR comment
- `blog-slack-notify.yml` - Sends Slack notification (green border):
  ```
  ✏️ @user made changes to *Article Title*
  ```

**4. User Continues Editing (Optional)**
- Each "Save" updates the same PR branch
- Each push triggers workflows again

**5. User Clicks "Submit for Review"**
- Updates frontmatter to `ready_for_review: true`
- Adds `ComputelessComputer` as PR reviewer

**6. GitHub Actions Trigger Again**
- Slack notification changes to (blue border):
  ```
  👀 *Article submitted for review*
  @john please review
  ```

**7. Reviewer Merges PR**
- Article goes live on the website

**Slack Notification Summary:**

| Action | `ready_for_review` | Slack Message | Border |
|--------|-------------------|---------------|--------|
| Save | `false` | "✏️ made changes" | Green |
| Submit for Review | `true` | "👀 submitted for review" @john | Blue |

## API Endpoints

All API endpoints require admin authentication.

### Media APIs

- `GET /api/admin/media/list` - List files in a directory
- `POST /api/admin/media/upload` - Upload files
- `POST /api/admin/media/delete` - Delete files
- `POST /api/admin/media/move` - Move/rename files
- `POST /api/admin/media/create-folder` - Create folders

### Import APIs

- `POST /api/admin/import/google-docs` - Parse published Google Doc
- `POST /api/admin/import/save` - Save MDX file to repository

### Content APIs

- `GET /api/admin/content/list` - List content files in a folder
- `GET /api/admin/content/list-drafts` - List draft articles from branches
- `GET /api/admin/content/pending-pr` - Check if article has a pending edit PR
- `GET /api/admin/content/get-branch-file` - Get file content from a branch
- `GET /api/admin/content/history` - Get git commit history for a file
- `POST /api/admin/content/save` - Save content (creates PR for published articles)
- `POST /api/admin/content/create` - Create new content file
- `POST /api/admin/content/publish` - Publish/unpublish an article
- `POST /api/admin/content/submit-for-review` - Submit article for editorial review
- `POST /api/admin/content/rename` - Rename a content file
- `POST /api/admin/content/duplicate` - Duplicate a content file
- `POST /api/admin/content/delete` - Delete a content file

## GitHub Workflows

The editorial workflow is powered by two GitHub Actions workflows in `.github/workflows/`:

- **`blog-grammar-check.yml`** - Runs AI-powered grammar check on article PRs and posts suggestions as comments
- **`blog-slack-notify.yml`** - Sends Slack notifications for article changes with editorial status detection

Both trigger on PRs to `main` that modify `apps/web/content/articles/**` on `blog/` branches.

## Environment Variables

The following environment variables are required:

- `GITHUB_TOKEN` - GitHub personal access token with repo write access
- Supabase environment variables for authentication

## Development

The admin interface uses TanStack Router with file-based routing. Routes are defined in:

- `src/routes/admin/` - Page components
- `src/routes/api/admin/` - API endpoints

Admin authentication is handled by the `fetchAdminUser()` function which checks if the current user's email is in the whitelist.
