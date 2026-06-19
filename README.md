# Metier Blog Assignment

Deployed site: https://metier-blog-assignment.pages.dev/

Part 1 video script: `PART1_SCRIPT.md`

Admin demo account:

- Username: `admin`
- Password: `admin123`

## Requirement Checklist

### 1. Blog List

- Shows all published blogs with cover image, blog title, excerpt, and posted date.
- Search filters by blog title.
- Pagination shows 10 blogs per page.
- Demo seed data contains 50 published blogs.

### 2. Blog Detail

- Shows 1 cover image and up to 6 additional images.
- Total images per blog are capped at 7.
- Shows blog title, posted date, full content, and view count.
- View count increments when opening a blog detail page.

### 3. Comment System

- Sender name is required.
- Comment message is required.
- New comments are saved as `pending` and are not shown publicly until approved by admin.
- Public blog detail shows approved comments only.

### Comment Validation Approach

The comment message is validated before saving.

- Trim whitespace before validation.
- Reject empty values after trim.
- Allow Thai characters, Arabic numerals `0-9`, and whitespace only.
- Reject English letters, emoji, punctuation, HTML tags, and symbols.
- Current client-side pattern:

```js
/^[ก-๙0-9\s]+$/
```

Examples:

- Valid: `บทความดีมาก 10`
- Valid: `ข้อมูลมีประโยชน์`
- Invalid: `Good article`
- Invalid: `ดีมาก!`
- Invalid: `<script>alert(1)</script>`

For a production backend, the same validation must also run server-side before storing the comment.

### 4. Admin Panel

- Admin panel requires login.
- Admin can create, read, update, and delete blogs.
- Admin can publish and unpublish blogs.
- Admin can edit blog URL slug.
- Admin can view comments and approve or reject each comment.
- Admin can reject comments that were already approved.

## Implementation Notes

- This assignment demo is a static SPA.
- Data is stored in `localStorage` for reviewer-friendly testing.
- The UI includes client-side validation and escaping for rendered user content.
- A production version should add server-side auth, database persistence, and server-side validation.
