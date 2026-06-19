const STORAGE_KEY = "metier-blog-assignment-state-v2";
const SESSION_KEY = "metier-blog-assignment-admin-session";
const POSTS_PER_PAGE = 10;
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const THAI_NUMERIC_COMMENT = /^[ก-๙0-9\s]+$/;

const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modalRoot");
const toastRoot = document.querySelector("#toastRoot");

let state = loadState();
let listSearch = "";
let listPage = 1;

window.addEventListener("hashchange", render);
render();

function render() {
  const route = getRoute();
  app.innerHTML = shell(renderRoute(route), route);
  bindSharedEvents();
  bindRouteEvents(route);
}

function shell(content, route) {
  const isAdmin = isLoggedIn();
  const showTopbarSearch = route.name === "list";
  return `
    <div class="site-shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="#/blogs" aria-label="กลับหน้าบทความ">
            <span class="brand-mark">MB</span>
            <span>Metier Blog Assignment</span>
          </a>
          ${
            showTopbarSearch
              ? `<form id="searchForm" class="topbar-search ${listSearch ? "has-clear" : ""}" role="search">
                  <input id="searchInput" type="search" value="${escapeAttribute(listSearch)}" placeholder="ค้นหาจากชื่อ Blog" aria-label="ค้นหาจากชื่อ Blog" />
                  ${listSearch ? '<button id="clearSearch" class="secondary" type="button">ล้าง</button>' : ""}
                </form>`
              : ""
          }
          <nav class="nav-actions" aria-label="navigation">
            <a class="button secondary" href="#/blogs">บทความ</a>
            <a class="button secondary" href="${isAdmin ? "#/admin/posts" : "#/admin/login"}">${isAdmin ? "Admin" : "Login"}</a>
            ${isAdmin ? '<button id="logoutButton" class="danger" type="button">Logout</button>' : ""}
          </nav>
        </div>
      </header>
      ${content}
    </div>
  `;
}

function renderRoute(route) {
  if (route.name === "detail") return renderDetail(route.slug);
  if (route.name === "admin-login") return renderLogin();
  if (route.name.startsWith("admin")) {
    if (!isLoggedIn()) {
      location.hash = "#/admin/login";
      return "";
    }
    return renderAdmin(route);
  }
  return renderBlogList();
}

function renderBlogList() {
  const published = state.posts.filter((post) => post.published && !post.deleted);
  const query = listSearch.trim().toLowerCase();
  const filtered = query ? published.filter((post) => post.title.toLowerCase().includes(query)) : published;
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  listPage = Math.min(Math.max(1, listPage), totalPages);
  const start = (listPage - 1) * POSTS_PER_PAGE;
  const pageItems = filtered.slice(start, start + POSTS_PER_PAGE);

  return `
    <main class="container">
      <section class="hero">
        <h1>Technology Blog</h1>
      </section>
      <section class="content-grid" aria-label="blog list">
        ${pageItems.length ? `<div class="blog-grid">${pageItems.map(renderBlogCard).join("")}</div>` : renderEmpty("ไม่พบบทความ", query ? "ลองค้นหาด้วยชื่อบทความคำอื่น" : "ยังไม่มีบทความเผยแพร่")}
        ${renderPagination(totalPages)}
      </section>
    </main>
  `;
}

function renderBlogCard(post) {
  return `
    <a class="blog-card" href="#/blog/${encodeURIComponent(post.slug)}">
      <img class="cover" src="${escapeAttribute(post.cover)}" alt="รูปปก ${escapeAttribute(post.title)}" loading="lazy" />
      <div class="blog-card-body">
        <div class="meta-line">
          <span>${formatDate(post.postedAt)}</span>
          <span>•</span>
          <span>${post.views} views</span>
        </div>
        <h2>${escapeHtml(post.title)}</h2>
        <p class="excerpt">${escapeHtml(post.excerpt)}</p>
      </div>
    </a>
  `;
}

function renderPagination(totalPages) {
  if (totalPages <= 1) return "";
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return `
    <nav class="pagination" aria-label="pagination">
      <button class="secondary" data-page="${listPage - 1}"${listPage === 1 ? " disabled" : ""}>Previous</button>
      ${pages.map((page) => `<button class="page-button secondary ${page === listPage ? "active" : ""}" data-page="${page}">${page}</button>`).join("")}
      <button class="secondary" data-page="${listPage + 1}"${listPage === totalPages ? " disabled" : ""}>Next</button>
    </nav>
  `;
}

function renderDetail(slug) {
  const post = state.posts.find((item) => item.slug === slug && !item.deleted);
  if (!post || !post.published) {
    return `<main class="article-layout">${renderEmpty("ไม่พบบทความนี้", "บทความอาจถูกลบหรือยังไม่เผยแพร่")}<p><a class="button primary" href="#/blogs">กลับไปหน้าบทความ</a></p></main>`;
  }
  incrementViews(post.id);
  const freshPost = state.posts.find((item) => item.id === post.id);
  const approvedComments = state.comments.filter((comment) => comment.postId === post.id && comment.status === "approved");
  const gallery = [freshPost.cover, ...freshPost.gallery].slice(0, 7);

  return `
    <main class="article-layout">
      <p><a class="button secondary" href="#/blogs">← กลับหน้าบทความ</a></p>
      <div class="article-cover">
        <img src="${escapeAttribute(freshPost.cover)}" alt="รูปปก ${escapeAttribute(freshPost.title)}" />
      </div>
      <header class="article-head">
        <div class="meta-line">
          <span>${formatDate(freshPost.postedAt)}</span>
          <span>•</span>
          <span>${freshPost.views} views</span>
        </div>
        <h1>${escapeHtml(freshPost.title)}</h1>
        <p class="lead">${escapeHtml(freshPost.excerpt)}</p>
      </header>
      <section class="gallery" aria-label="gallery">
        ${gallery.map((image, index) => `<img src="${escapeAttribute(image)}" alt="รูปประกอบ ${index + 1} ของ ${escapeAttribute(freshPost.title)}" loading="lazy" />`).join("")}
      </section>
      <article class="article-body">
        ${freshPost.content.split("\\n\\n").map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </article>
      <section class="comments">
        <div class="panel">
          <div class="section-title">
            <div>
              <h2>ความคิดเห็น</h2>
              <p class="muted">ความคิดเห็นจะแสดงหลังผู้ดูแลอนุมัติเท่านั้น</p>
            </div>
          </div>
          <div class="content-grid">
            ${approvedComments.length ? approvedComments.map(renderPublicComment).join("") : renderEmpty("ยังไม่มีความคิดเห็น", "เป็นคนแรกที่ส่งความคิดเห็นเพื่อรอผู้ดูแลตรวจสอบ")}
          </div>
        </div>
        <form id="commentForm" class="panel form-grid" data-post-id="${freshPost.id}">
          <div class="section-title">
            <div>
              <h2>ส่งความคิดเห็น</h2>
              <p class="muted">ข้อความ Comment ใช้ได้เฉพาะภาษาไทย ตัวเลข และช่องว่าง</p>
            </div>
          </div>
          <label class="field">
            <span>ชื่อผู้ส่ง</span>
            <input id="commentName" type="text" placeholder="เช่น สมชาย" required />
            <span id="nameError" class="error-text"></span>
          </label>
          <label class="field">
            <span>ความคิดเห็น</span>
            <textarea id="commentMessage" maxlength="240" placeholder="เช่น บทความนี้มีประโยชน์มาก 10" required></textarea>
            <span id="messageError" class="error-text"></span>
          </label>
          <button class="primary" type="submit">ส่งเพื่อรออนุมัติ</button>
          <p id="commentStatus" class="success-text"></p>
        </form>
      </section>
    </main>
  `;
}

function renderPublicComment(comment) {
  return `
    <article class="comment-card">
      <div class="meta-line">
        <strong>${escapeHtml(comment.name)}</strong>
        <span>•</span>
        <span>${formatDate(comment.createdAt)}</span>
      </div>
      <p>${escapeHtml(comment.message)}</p>
    </article>
  `;
}

function renderLogin() {
  return `
    <main class="container">
      <section class="panel login-card">
        <p class="eyebrow">Admin Panel</p>
        <h1>เข้าสู่ระบบผู้ดูแล</h1>
        <p class="muted">Demo credentials: <strong>admin</strong> / <strong>admin123</strong></p>
        <form id="loginForm" class="form-grid">
          <label class="field">
            <span>Username</span>
            <input id="username" type="text" autocomplete="username" required />
          </label>
          <label class="field">
            <span>Password</span>
            <input id="password" type="password" autocomplete="current-password" required />
          </label>
          <p id="loginError" class="error-text"></p>
          <button class="primary" type="submit">Login</button>
        </form>
      </section>
    </main>
  `;
}

function renderAdmin(route) {
  const tab = route.adminTab || "posts";
  return `
    <main class="container admin-shell">
      <aside class="admin-nav">
        <button class="secondary ${tab === "posts" ? "active" : ""}" data-admin-tab="posts">Posts</button>
        <button class="secondary ${tab === "comments" ? "active" : ""}" data-admin-tab="comments">Comments</button>
        <button class="secondary ${tab === "editor-new" ? "active" : ""}" data-admin-tab="editor-new">New Post</button>
      </aside>
      <section class="admin-content">
        ${tab === "comments" ? renderAdminComments() : tab.startsWith("editor") ? renderPostEditor(route.id) : renderAdminPosts()}
      </section>
    </main>
  `;
}

function renderAdminPosts() {
  const posts = state.posts.filter((post) => !post.deleted).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  return `
    <section class="panel">
      <div class="toolbar">
        <div>
          <p class="eyebrow">Admin</p>
          <h1>Posts</h1>
          <p class="muted">จัดการบทความ publish/unpublish แก้ slug และลบข้อมูล</p>
        </div>
        <a class="button primary" href="#/admin/editor/new">New Post</a>
      </div>
    </section>
    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cover</th>
            <th>Blog</th>
            <th>Slug</th>
            <th>Date</th>
            <th>Status</th>
            <th>Views</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${posts.map(renderAdminPostRow).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderAdminPostRow(post) {
  return `
    <tr>
      <td data-label="Cover"><img class="admin-thumb" src="${escapeAttribute(post.cover)}" alt="cover ${escapeAttribute(post.title)}" /></td>
      <td data-label="Blog"><strong>${escapeHtml(post.title)}</strong><br /><span class="muted">${escapeHtml(post.excerpt)}</span></td>
      <td data-label="Slug">${escapeHtml(post.slug)}</td>
      <td data-label="Date">${formatDate(post.postedAt)}</td>
      <td data-label="Status"><span class="badge ${post.published ? "published" : "unpublished"}">${post.published ? "Published" : "Unpublished"}</span></td>
      <td data-label="Views">${post.views}</td>
      <td data-label="Actions">
        <div class="action-row">
          <a class="button secondary" href="#/admin/editor/${post.id}">Edit</a>
          <button class="secondary" data-toggle-post="${post.id}">${post.published ? "Unpublish" : "Publish"}</button>
          <button class="danger" data-delete-post="${post.id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function renderPostEditor(postId) {
  const editing = postId && postId !== "new";
  const post = editing ? state.posts.find((item) => item.id === postId && !item.deleted) : null;
  const data = post || createBlankPost();
  if (editing && !post) return `<section class="panel">${renderEmpty("ไม่พบบทความ", "บทความอาจถูกลบไปแล้ว")}</section>`;

  return `
    <section class="panel">
      <p class="eyebrow">${editing ? "Edit Blog" : "Create Blog"}</p>
      <h1>${editing ? "แก้ไขบทความ" : "สร้างบทความใหม่"}</h1>
      <p class="muted">รูปทั้งหมดรวม cover ต้องไม่เกิน 7 รูป โดย gallery เพิ่มเติมได้สูงสุด 6 รูป</p>
      <form id="postForm" class="form-grid" data-post-id="${editing ? data.id : ""}">
        <div class="editor-grid">
          <label class="field">
            <span>Title</span>
            <input id="postTitle" type="text" value="${escapeAttribute(data.title)}" required />
          </label>
          <label class="field">
            <span>Slug</span>
            <input id="postSlug" type="text" value="${escapeAttribute(data.slug)}" required />
          </label>
          <label class="field">
            <span>Posted date</span>
            <input id="postDate" type="date" value="${toDateInput(data.postedAt)}" required />
          </label>
          <label class="field">
            <span>Status</span>
            <select id="postPublished">
              <option value="true"${data.published ? " selected" : ""}>Published</option>
              <option value="false"${!data.published ? " selected" : ""}>Unpublished</option>
            </select>
          </label>
          <label class="field wide">
            <span>Cover image URL</span>
            <input id="postCover" type="url" value="${escapeAttribute(data.cover)}" required />
          </label>
          <label class="field wide">
            <span>Gallery image URLs (สูงสุด 6 รูป, ใส่บรรทัดละ 1 URL)</span>
            <textarea id="postGallery" rows="4">${escapeHtml(data.gallery.join("\\n"))}</textarea>
          </label>
          <label class="field wide">
            <span>Excerpt</span>
            <textarea id="postExcerpt" rows="3" required>${escapeHtml(data.excerpt)}</textarea>
          </label>
          <label class="field wide">
            <span>Full content</span>
            <textarea id="postContent" rows="10" required>${escapeHtml(data.content)}</textarea>
          </label>
        </div>
        <p id="postError" class="error-text"></p>
        <div class="action-row">
          <button class="primary" type="submit">${editing ? "Save changes" : "Create post"}</button>
          <a class="button secondary" href="#/admin/posts">Cancel</a>
        </div>
      </form>
    </section>
  `;
}

function renderAdminComments() {
  const filters = ["pending", "approved", "rejected"];
  const activeFilter = new URLSearchParams(location.hash.split("?")[1] || "").get("status") || "pending";
  const comments = state.comments
    .filter((comment) => comment.status === activeFilter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return `
    <section class="panel">
      <p class="eyebrow">Moderation</p>
      <h1>Comments</h1>
      <p class="muted">Approve / reject คอมเมนต์ และสามารถ reject คอมเมนต์ที่เคย approved แล้วได้</p>
      <div class="action-row">
        ${filters.map((filter) => `<a class="button secondary ${filter === activeFilter ? "active" : ""}" href="#/admin/comments?status=${filter}">${labelStatus(filter)}</a>`).join("")}
      </div>
    </section>
    ${
      comments.length
        ? `<section class="table-wrap"><table><thead><tr><th>Blog</th><th>Name</th><th>Comment</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>${comments.map(renderAdminCommentRow).join("")}</tbody></table></section>`
        : `<section class="panel">${renderEmpty("ไม่มีความคิดเห็นในสถานะนี้", "เมื่อมี comment ใหม่ ระบบจะแสดงที่นี่")}</section>`
    }
  `;
}

function renderAdminCommentRow(comment) {
  const post = state.posts.find((item) => item.id === comment.postId);
  return `
    <tr>
      <td data-label="Blog">${escapeHtml(post?.title || "Deleted post")}</td>
      <td data-label="Name">${escapeHtml(comment.name)}</td>
      <td data-label="Comment">${escapeHtml(comment.message)}</td>
      <td data-label="Status"><span class="badge ${comment.status}">${labelStatus(comment.status)}</span></td>
      <td data-label="Submitted">${formatDate(comment.createdAt)}</td>
      <td data-label="Actions">
        <div class="action-row">
          ${comment.status !== "approved" ? `<button class="secondary" data-comment-status="${comment.id}:approved">Approve</button>` : ""}
          ${comment.status !== "rejected" ? `<button class="danger" data-comment-status="${comment.id}:rejected">Reject</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function bindSharedEvents() {
  document.querySelector("#logoutButton")?.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    toast("ออกจากระบบแล้ว");
    location.hash = "#/blogs";
  });
}

function bindRouteEvents(route) {
  if (route.name === "list") bindListEvents();
  if (route.name === "detail") bindCommentEvents();
  if (route.name === "admin-login") bindLoginEvents();
  if (route.name.startsWith("admin")) bindAdminEvents();
}

function bindListEvents() {
  document.querySelector("#searchInput")?.addEventListener("input", (event) => {
    listSearch = event.currentTarget.value;
    listPage = 1;
    render();
    requestAnimationFrame(() => {
      const input = document.querySelector("#searchInput");
      if (!input) return;
      input.focus();
      input.setSelectionRange(listSearch.length, listSearch.length);
    });
  });
  document.querySelector("#searchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    listSearch = document.querySelector("#searchInput").value.trim();
    listPage = 1;
    render();
  });
  document.querySelector("#clearSearch")?.addEventListener("click", () => {
    listSearch = "";
    listPage = 1;
    render();
  });
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = Number(button.dataset.page);
      if (Number.isFinite(next)) {
        listPage = next;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

function bindCommentEvents() {
  document.querySelector("#commentForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const postId = form.dataset.postId;
    const name = document.querySelector("#commentName").value.trim();
    const message = document.querySelector("#commentMessage").value.trim();
    document.querySelector("#nameError").textContent = "";
    document.querySelector("#messageError").textContent = "";

    if (!name) {
      document.querySelector("#nameError").textContent = "กรุณากรอกชื่อผู้ส่ง";
      return;
    }
    if (!message) {
      document.querySelector("#messageError").textContent = "กรุณากรอกความคิดเห็น";
      return;
    }
    if (!THAI_NUMERIC_COMMENT.test(message)) {
      document.querySelector("#messageError").textContent = "กรอกได้เฉพาะภาษาไทย ตัวเลข และช่องว่างเท่านั้น";
      return;
    }
    state.comments.push({
      id: crypto.randomUUID(),
      postId,
      name,
      message,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    saveState();
    form.reset();
    document.querySelector("#commentStatus").textContent = "ส่งความคิดเห็นแล้ว รอผู้ดูแลอนุมัติก่อนแสดงผล";
  });
}

function bindLoginEvents() {
  document.querySelector("#loginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.querySelector("#username").value.trim();
    const password = document.querySelector("#password").value;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      localStorage.setItem(SESSION_KEY, "true");
      toast("เข้าสู่ระบบสำเร็จ");
      location.hash = "#/admin/posts";
      return;
    }
    document.querySelector("#loginError").textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  });
}

function bindAdminEvents() {
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.adminTab;
      location.hash = tab === "editor-new" ? "#/admin/editor/new" : `#/admin/${tab}`;
    });
  });
  document.querySelectorAll("[data-toggle-post]").forEach((button) => {
    button.addEventListener("click", () => {
      const post = state.posts.find((item) => item.id === button.dataset.togglePost);
      if (!post) return;
      post.published = !post.published;
      saveState();
      toast(post.published ? "Published blog แล้ว" : "Unpublished blog แล้ว");
      render();
    });
  });
  document.querySelectorAll("[data-delete-post]").forEach((button) => {
    button.addEventListener("click", async () => {
      const post = state.posts.find((item) => item.id === button.dataset.deletePost);
      if (!post) return;
      const ok = await confirmModal("Delete post?", `ต้องการลบบทความ "${post.title}" หรือไม่ การลบนี้จะทำให้หน้า public เข้าไม่ได้`);
      if (!ok) return;
      post.deleted = true;
      saveState();
      toast("ลบบทความแล้ว");
      render();
    });
  });
  document.querySelectorAll("[data-comment-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const [commentId, status] = button.dataset.commentStatus.split(":");
      const comment = state.comments.find((item) => item.id === commentId);
      if (!comment) return;
      comment.status = status;
      saveState();
      toast(`เปลี่ยนสถานะ comment เป็น ${labelStatus(status)} แล้ว`);
      render();
    });
  });
  document.querySelector("#postForm")?.addEventListener("submit", handlePostSave);
}

function handlePostSave(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const postId = form.dataset.postId;
  const title = document.querySelector("#postTitle").value.trim();
  const slug = normalizeSlug(document.querySelector("#postSlug").value.trim() || title);
  const postedAt = document.querySelector("#postDate").value;
  const cover = document.querySelector("#postCover").value.trim();
  const gallery = document.querySelector("#postGallery").value.split("\\n").map((item) => item.trim()).filter(Boolean);
  const excerpt = document.querySelector("#postExcerpt").value.trim();
  const content = document.querySelector("#postContent").value.trim();
  const published = document.querySelector("#postPublished").value === "true";
  const errorEl = document.querySelector("#postError");
  errorEl.textContent = "";

  if (!title || !slug || !postedAt || !cover || !excerpt || !content) {
    errorEl.textContent = "กรุณากรอกข้อมูลที่จำเป็นให้ครบ";
    return;
  }
  if (gallery.length > 6) {
    errorEl.textContent = "รูปเพิ่มเติมใส่ได้สูงสุด 6 รูป รวมกับ cover แล้วไม่เกิน 7 รูป";
    return;
  }
  const duplicate = state.posts.find((post) => post.slug === slug && post.id !== postId && !post.deleted);
  if (duplicate) {
    errorEl.textContent = "Slug นี้ถูกใช้แล้ว กรุณาเปลี่ยน slug";
    return;
  }

  if (postId) {
    const post = state.posts.find((item) => item.id === postId);
    if (!post) return;
    Object.assign(post, { title, slug, postedAt, cover, gallery, excerpt, content, published, updatedAt: new Date().toISOString() });
  } else {
    state.posts.push({
      id: crypto.randomUUID(),
      title,
      slug,
      postedAt,
      cover,
      gallery,
      excerpt,
      content,
      published,
      views: 0,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  saveState();
  toast("บันทึกบทความแล้ว");
  location.hash = "#/admin/posts";
}

function incrementViews(postId) {
  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;
  post.views += 1;
  saveState();
}

function getRoute() {
  const raw = location.hash.replace(/^#/, "") || "/blogs";
  const [path] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "blog" && parts[1]) return { name: "detail", slug: decodeURIComponent(parts[1]) };
  if (parts[0] === "admin" && parts[1] === "login") return { name: "admin-login" };
  if (parts[0] === "admin" && parts[1] === "comments") return { name: "admin-comments", adminTab: "comments" };
  if (parts[0] === "admin" && parts[1] === "editor") return { name: "admin-editor", adminTab: "editor", id: parts[2] };
  if (parts[0] === "admin") return { name: "admin-posts", adminTab: "posts" };
  return { name: "list" };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
    if (parsed?.posts?.length) return parsed;
  } catch {
    // Fall through to seed data.
  }
  const seeded = seedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === "true";
}

function seedState() {
  const covers = [
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80"
  ];
  const titles = [
    "ออกแบบระบบ Blog ให้รองรับหลายทีม",
    "แนวคิด Design System สำหรับงานเว็บ",
    "วิธีทำ Admin Panel ให้ใช้งานง่าย",
    "การจัดการ Comment Moderation อย่างเป็นระบบ",
    "Pagination และ Search ที่ไม่ทำให้ผู้ใช้หลงทาง",
    "Slug URL ที่อ่านง่ายและปลอดภัย",
    "เขียน Validation ให้ทีมเข้าใจตรงกัน",
    "การแยก Public และ Admin Experience",
    "ทำให้ Static Demo ดูเหมือนงานจริง",
    "แนวทางเก็บ Local State สำหรับ Prototype",
    "Checklist ก่อนส่งงาน Technical Assignment",
    "วางโครง UI ให้รองรับ Mobile ตั้งแต่แรก",
    "วางแผน Content Workflow สำหรับทีมเล็ก",
    "ออกแบบ Search Experience ให้ตอบสนองทันที",
    "สร้าง Blog Card ที่อ่านง่ายบนทุกหน้าจอ",
    "แนวทางเขียน Excerpt ให้ผู้ใช้ตัดสินใจเร็ว",
    "จัดการรูปภาพ Gallery ไม่ให้หน้าเว็บหนัก",
    "ออกแบบ Empty State ให้ช่วยนำทางผู้ใช้",
    "วิธีทำ Loading State ให้เว็บดูเสถียร",
    "จัดการ Error State ให้เข้าใจง่าย",
    "สร้างระบบ Publish Draft แบบไม่สับสน",
    "ทำให้ Admin Table อ่านง่ายเมื่อข้อมูลเยอะ",
    "แนวคิด Responsive Layout สำหรับบทความ",
    "ออกแบบ Comment Form ให้ลดข้อมูลผิดพลาด",
    "การตั้งชื่อ Slug สำหรับ SEO และแชร์ลิงก์",
    "วิธีจัดลำดับ Typography ในหน้า Blog",
    "ออกแบบระบบ Badge สถานะให้มองเห็นเร็ว",
    "แนวทางใช้ Modal แทน Browser Alert",
    "ทำระบบ Confirm Delete ให้ปลอดภัยขึ้น",
    "จัดการ Session Login ใน Static Prototype",
    "ออกแบบ Dashboard ผู้ดูแลให้ใช้งานซ้ำได้",
    "แนวทางทดสอบ Public และ Admin Route",
    "สร้าง Mock Data ให้เหมือนระบบจริง",
    "วิธีวาง Date และ View Count ให้ไม่รก",
    "ออกแบบหน้ารายละเอียดบทความให้อ่านต่อเนื่อง",
    "จัดการ Long Title ไม่ให้ Layout แตก",
    "วิธีทำ Gallery Thumbnail ให้ใช้ง่าย",
    "แนวคิด Accessibility สำหรับ Blog Website",
    "ทำ Focus State ให้ Keyboard ใช้งานได้",
    "จัดการ Form Validation แบบใกล้ช่องกรอก",
    "ออกแบบ Pagination ให้ไม่หลงหน้า",
    "แนวทางแยกข้อมูล Public กับ Admin",
    "ทำระบบ Approve Comment ให้ตรวจสอบง่าย",
    "วิธี Reject Comment ที่อนุมัติไปแล้ว",
    "ออกแบบ Mobile Admin โดยไม่ต้องซูม",
    "สร้าง Visual Hierarchy ในหน้า Landing Blog",
    "แนวทางใช้ Whitespace ให้เว็บดูคลีน",
    "ทดสอบ Layout ด้วยข้อมูลจำนวนมาก",
    "ทำ Assignment Demo ให้ตรวจง่าย",
    "สรุปบทเรียนการทำ Blog Website ให้ครบโจทย์"
  ];
  const posts = titles.map((title, index) => {
    const cover = covers[index % covers.length];
    const gallery = covers.filter((_, imageIndex) => imageIndex !== index % covers.length).slice(0, (index % 6) + 1);
    return {
      id: `post-${index + 1}`,
      title,
      slug: normalizeSlug(title),
      excerpt: "บทความตัวอย่างสำหรับอธิบายแนวคิดการสร้างเว็บที่อ่านง่าย คุมคุณภาพได้ และต่อยอดเป็นระบบจริงได้ในอนาคต",
      content:
        "บทความนี้เป็นข้อมูลตัวอย่างเพื่อทดสอบหน้าแสดงรายละเอียด การจัดวางเนื้อหา และการอ่านบนหน้าจอหลายขนาด\\n\\nแนวทางหลักคือทำให้ผู้ใช้เห็นข้อมูลสำคัญก่อนเสมอ เช่น ชื่อบทความ วันที่ รูปปก และเนื้อหาเต็มที่อ่านได้ต่อเนื่อง\\n\\nในฝั่งผู้ดูแล ระบบต้องช่วยลดความผิดพลาดด้วย validation ที่ชัดเจน สถานะที่เข้าใจง่าย และ action ที่ต้องยืนยันเมื่อมีผลกระทบกับข้อมูล",
      postedAt: new Date(Date.UTC(2026, 5, 18 - index)).toISOString(),
      cover,
      gallery,
      views: 48 + index * 9,
      published: true,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
  return {
    posts,
    comments: [
      {
        id: "comment-1",
        postId: "post-1",
        name: "สมชาย",
        message: "บทความดีมาก 10",
        status: "approved",
        createdAt: new Date(Date.UTC(2026, 5, 18, 4)).toISOString()
      },
      {
        id: "comment-2",
        postId: "post-1",
        name: "ผู้สมัคร",
        message: "ขอบคุณสำหรับข้อมูล",
        status: "pending",
        createdAt: new Date(Date.UTC(2026, 5, 18, 6)).toISOString()
      }
    ]
  };
}

function createBlankPost() {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    postedAt: new Date().toISOString(),
    cover: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    gallery: [],
    published: false
  };
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function toDateInput(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function labelStatus(status) {
  return {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected"
  }[status] || status;
}

function renderEmpty(title, text) {
  return `<div class="empty-state"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div></div>`;
}

function confirmModal(title, message) {
  return new Promise((resolve) => {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-card">
          <h2>${escapeHtml(title)}</h2>
          <p class="muted">${escapeHtml(message)}</p>
          <div class="modal-actions">
            <button class="secondary" data-modal-cancel type="button">Cancel</button>
            <button class="danger" data-modal-confirm type="button">Delete</button>
          </div>
        </div>
      </div>
    `;
    modalRoot.querySelector("[data-modal-cancel]").addEventListener("click", () => {
      modalRoot.innerHTML = "";
      resolve(false);
    });
    modalRoot.querySelector("[data-modal-confirm]").addEventListener("click", () => {
      modalRoot.innerHTML = "";
      resolve(true);
    });
  });
}

function toast(message) {
  toastRoot.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  setTimeout(() => {
    toastRoot.innerHTML = "";
  }, 2400);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}
