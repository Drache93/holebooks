<script lang="ts">
    import { enhance } from "$app/forms";
    import { invalidateAll } from "$app/navigation";
    import { untrack } from "svelte";
    import type { PageProps } from "./$types";
    import BookCover from "$lib/BookCover.svelte";

    let { data }: PageProps = $props();

    let book = $state(untrack(() => ({ ...data.book })));
    $effect(() => {
        book = { ...data.book };
    });

    const SPINE = [
        { bg: "#1E3A5F", accent: "#2E5A8F", text: "#C8DAEA" },
        { bg: "#2D4A2A", accent: "#4A7A44", text: "#C4DCC0" },
        { bg: "#4A2040", accent: "#7A3A65", text: "#E4C4D8" },
        { bg: "#3A2A10", accent: "#6A5020", text: "#DCCCA0" },
        { bg: "#1A3A4A", accent: "#2A6A7A", text: "#B8D8E4" },
        { bg: "#3A1A1A", accent: "#7A3030", text: "#E4C4C4" },
        { bg: "#2A3040", accent: "#4A5570", text: "#C4CCE0" },
        { bg: "#1A3A30", accent: "#2A6A58", text: "#B8E0D8" },
    ];

    function bookColor(id: string) {
        let h = 0;
        for (let i = 0; i < id.length; i++)
            h = (h * 31 + id.charCodeAt(i)) & 0xffff;
        return SPINE[h % SPINE.length];
    }

    const color = $derived(bookColor(book.id));

    let pagesInput = $state(untrack(() => String(data.book.pagesRead ?? 0)));
    let pctInput = $state(untrack(() => String(data.book.progress ?? 0)));
    let notesInput = $state(untrack(() => data.book.notes ?? ""));
    let hoverRating = $state(0);
    let pendingRating = $state(untrack(() => data.book.rating ?? 0));
    let noteSaved = $state(false);
    let progressSaved = $state(false);
    let submitting = $state(false);
    let editOpen = $state(false);
    let editTitle = $state(untrack(() => data.book.title));
    let editAuthor = $state(untrack(() => data.book.author));
    let editGenre = $state(untrack(() => data.book.genre ?? ""));
    let editPages = $state(untrack(() => String(data.book.totalPages ?? "")));
    let confirmDelete = $state(false);
    let finishDate = $state(new Date().toISOString().slice(0, 10));
    let showDatePicker = $state(false);
    let actionError = $state<string | null>(null);

    $effect(() => {
        pagesInput = String(book.pagesRead ?? 0);
        pctInput = String(book.progress ?? 0);
        notesInput = book.notes ?? "";
        pendingRating = book.rating ?? 0;
        editTitle = book.title;
        editAuthor = book.author;
        editGenre = book.genre ?? "";
        editPages = String(book.totalPages ?? "");
    });

    const statusLabel = $derived(
        book.status === "reading"
            ? "Reading"
            : book.status === "read"
              ? "Finished"
              : "Want to read",
    );

    function showError(msg: string) {
        actionError = msg;
        setTimeout(() => (actionError = null), 4000);
    }

    function mkEnhance(onSuccess?: () => void) {
        return () =>
            async ({ result, update }: any) => {
                if (result.type === "failure" || result.type === "error") {
                    showError(
                        result.data?.message ??
                            "Something went wrong — check the console",
                    );
                    return;
                }
                await update({ reset: false });
                onSuccess?.();
            };
    }

    // Quick-add pages — auto-submits directly via fetch
    async function quickAdd(delta: number) {
        if (submitting) return;
        submitting = true;
        const current = book.pagesRead ?? 0;
        const max = book.totalPages ?? 9999;
        const newPages = Math.min(max, Math.max(0, current + delta));
        pagesInput = String(newPages);

        const fd = new FormData();
        fd.set("pagesRead", String(newPages));

        try {
            const res = await fetch(`?/updateProgress`, {
                method: "POST",
                body: fd,
            });
            if (res.ok) {
                await invalidateAll();
                progressSaved = true;
                setTimeout(() => (progressSaved = false), 2000);
            } else {
                showError("Failed to save — try again");
            }
        } catch {
            showError("Network error");
        } finally {
            submitting = false;
        }
    }
</script>

<div class="page">
    <!-- ── Nav bar ── -->
    <nav class="topnav">
        <a href="/" class="back">
            <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M10 13L5 8l5-5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
            Shelf
        </a>
        <span
            class="status-pill"
            class:reading={book.status === "reading"}
            class:read={book.status === "read"}
            class:planned={book.status === "planned"}
        >
            {statusLabel}
        </span>
    </nav>

    {#if actionError}
        <div class="action-error">{actionError}</div>
    {/if}

    <!-- ── Hero ── -->
    <div class="hero">
        <div class="hero-inner">
            <div class="cover-box" style="background:{color.bg}">
                <BookCover
                    title={book.title}
                    {color}
                    coverUrl={book.coverUrl}
                />
                {#if book.status === "read"}
                    <span class="cover-check">✓</span>
                {/if}
            </div>
            <div class="hero-meta">
                <h1 class="hero-title">{book.title}</h1>
                <p class="hero-author">{book.author}</p>
                <div class="hero-tags">
                    {#if book.genre}<span class="tag">{book.genre}</span>{/if}
                    {#if book.totalPages}<span class="tag"
                            >{book.totalPages} pages</span
                        >{/if}
                </div>
                {#if book.dateStarted}<p class="hero-date">
                        Started {book.dateStarted}
                    </p>{/if}
                {#if book.dateRead}<p class="hero-date">
                        Finished {book.dateRead}
                    </p>{/if}
            </div>
        </div>
    </div>

    <!-- ── Cards ── -->
    <div class="cards-area">
        <div class="cards-col main-col">
            <!-- ── Reading Progress (redesigned stepper) ── -->
            {#if book.status === "reading"}
                <div class="card anim">
                    <p class="card-label">Reading Progress</p>

                    <!-- Big progress bar -->
                    <div class="prog-bar-big">
                        <div
                            class="prog-fill-big"
                            style="width:{book.progress}%"
                        ></div>
                    </div>

                    <!-- Page count + percentage -->
                    <div class="prog-count-row">
                        <div class="prog-count">
                            <span class="prog-n">{book.pagesRead ?? 0}</span>
                            {#if book.totalPages}
                                <span class="prog-total">
                                    / {book.totalPages} pages</span
                                >
                            {:else}
                                <span class="prog-total"> pages read</span>
                            {/if}
                        </div>
                        <span class="prog-pct-big">{book.progress}%</span>
                    </div>

                    <!-- Quick-add buttons -->
                    {#if book.totalPages}
                        <div class="quick-add-row">
                            {#each [1, 5, 10, 25, 50] as delta}
                                {@const atMax =
                                    (book.pagesRead ?? 0) >=
                                    (book.totalPages ?? 0)}
                                <button
                                    type="button"
                                    class="qa-btn"
                                    disabled={submitting || atMax}
                                    onclick={() => quickAdd(delta)}
                                    >+{delta}</button
                                >
                            {/each}
                        </div>
                    {/if}

                    <!-- Manual input -->
                    <form
                        method="POST"
                        action="?/updateProgress"
                        use:enhance={mkEnhance(() => {
                            progressSaved = true;
                            setTimeout(() => (progressSaved = false), 2000);
                        })}
                    ></form>
                </div>

                <!-- Mark as finished -->
                <div class="card anim">
                    <p class="card-label">Mark as finished</p>
                    <form
                        method="POST"
                        action="?/markRead"
                        use:enhance={mkEnhance()}
                    >
                        <div class="stars-row">
                            {#each [1, 2, 3, 4, 5] as s}
                                <button
                                    type="button"
                                    class="star"
                                    class:on={s <=
                                        (hoverRating || pendingRating)}
                                    onmouseenter={() => (hoverRating = s)}
                                    onmouseleave={() => (hoverRating = 0)}
                                    onclick={() => (pendingRating = s)}
                                    aria-label="{s} star">★</button
                                >
                            {/each}
                        </div>
                        <input
                            type="hidden"
                            name="rating"
                            value={pendingRating || ""}
                        />

                        <div class="date-toggle-row">
                            <button
                                type="button"
                                class="text-link"
                                onclick={() =>
                                    (showDatePicker = !showDatePicker)}
                            >
                                {showDatePicker
                                    ? "Use today"
                                    : "Set a different date"}
                            </button>
                            {#if showDatePicker}
                                <input
                                    type="date"
                                    name="dateRead"
                                    class="date-input"
                                    bind:value={finishDate}
                                />
                            {/if}
                        </div>

                        <button class="btn-green">Mark as finished</button>
                    </form>
                </div>

                <!-- Pause reading -->
                <div class="card card-flat anim">
                    <p class="card-label">Pause reading</p>
                    <p class="card-hint">Move back to your Want to Read list</p>
                    <form
                        method="POST"
                        action="?/stopReading"
                        use:enhance={mkEnhance()}
                    >
                        <button class="btn-ghost">Stop reading</button>
                    </form>
                </div>
            {/if}

            <!-- Start reading -->
            {#if book.status === "planned"}
                <div class="card anim">
                    <p class="card-label">Ready to start?</p>
                    <p class="card-hint">Move this to your current reads</p>
                    <form
                        method="POST"
                        action="?/startReading"
                        use:enhance={mkEnhance()}
                    >
                        <button class="btn-primary">Start reading</button>
                    </form>
                </div>
            {/if}

            <!-- Rating (for read books) -->
            {#if book.status === "read"}
                <div class="card anim">
                    <p class="card-label">Your rating</p>
                    <form
                        method="POST"
                        action="?/setRating"
                        use:enhance={mkEnhance()}
                    >
                        <div class="stars-row">
                            {#each [1, 2, 3, 4, 5] as s}
                                <button
                                    type="button"
                                    class="star"
                                    class:on={s <=
                                        (hoverRating || pendingRating)}
                                    onmouseenter={() => (hoverRating = s)}
                                    onmouseleave={() => (hoverRating = 0)}
                                    onclick={() => (pendingRating = s)}
                                    aria-label="{s} star">★</button
                                >
                            {/each}
                        </div>
                        <input
                            type="hidden"
                            name="rating"
                            value={pendingRating}
                        />
                        <button class="btn-primary btn-sm">Save rating</button>
                    </form>
                </div>
            {/if}

            <!-- Notes -->
            <div class="card anim">
                <p class="card-label">Notes</p>
                <form
                    method="POST"
                    action="?/saveNotes"
                    use:enhance={mkEnhance(() => {
                        noteSaved = true;
                        setTimeout(() => (noteSaved = false), 2000);
                    })}
                >
                    <textarea
                        name="notes"
                        rows="5"
                        placeholder="Thoughts, quotes, reflections…"
                        class="notes-ta"
                        bind:value={notesInput}
                    ></textarea>
                    <button class="btn-primary"
                        >{noteSaved ? "Saved ✓" : "Save notes"}</button
                    >
                </form>
            </div>
        </div>

        <!-- ── Side column ── -->
        <div class="cards-col side-col">
            <!-- Edit details -->
            <div class="card anim">
                <button
                    class="expand-toggle"
                    onclick={() => (editOpen = !editOpen)}
                    aria-expanded={editOpen}
                >
                    <span class="card-label" style="margin:0">Book details</span
                    >
                    <svg
                        class="chevron"
                        class:open={editOpen}
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                    >
                        <path
                            d="M6 4l4 4-4 4"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>

                {#if editOpen}
                    <form
                        method="POST"
                        action="?/editDetails"
                        style="margin-top:16px"
                        use:enhance={mkEnhance(() => {
                            editOpen = false;
                        })}
                    >
                        <div class="edit-field">
                            <label for="ed-title">Title</label>
                            <input
                                id="ed-title"
                                name="title"
                                type="text"
                                required
                                class="text-input"
                                bind:value={editTitle}
                            />
                        </div>
                        <div class="edit-field">
                            <label for="ed-author">Author</label>
                            <input
                                id="ed-author"
                                name="author"
                                type="text"
                                required
                                class="text-input"
                                bind:value={editAuthor}
                            />
                        </div>
                        <div class="edit-field">
                            <label for="ed-genre">Genre</label>
                            <input
                                id="ed-genre"
                                name="genre"
                                type="text"
                                class="text-input"
                                bind:value={editGenre}
                            />
                        </div>
                        <div class="edit-field">
                            <label for="ed-pages">Total pages</label>
                            <input
                                id="ed-pages"
                                name="totalPages"
                                type="number"
                                min="1"
                                class="text-input num-sm"
                                bind:value={editPages}
                            />
                        </div>
                        <button class="btn-primary">Save changes</button>
                    </form>
                {/if}
            </div>

            <!-- Delete -->
            <div class="delete-area">
                {#if !confirmDelete}
                    <button
                        class="del-trigger"
                        onclick={() => (confirmDelete = true)}
                        >Remove from shelf</button
                    >
                {:else}
                    <div class="del-confirm-box">
                        <p class="del-text">Remove <em>{book.title}</em>?</p>
                        <div class="del-actions">
                            <button
                                class="btn-ghost btn-sm"
                                onclick={() => (confirmDelete = false)}
                                >Cancel</button
                            >
                            <form method="POST" action="?/delete">
                                <button class="btn-danger btn-sm">Remove</button
                                >
                            </form>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <div style="height:48px"></div>
</div>

<style>
    .page {
        min-height: 100dvh;
        background: var(--bg);
    }

    /* ── Nav ── */
    .topnav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px var(--page-pad);
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 100;
    }

    .back {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--text-3);
        font-size: 0.875rem;
        font-weight: 500;
        transition: color 0.15s;
    }

    .back:hover {
        color: var(--accent);
    }

    .status-pill {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        padding: 4px 12px;
        border-radius: 99px;
        background: var(--border);
        color: var(--text-3);
    }

    .status-pill.reading {
        background: var(--accent-dim);
        color: var(--accent);
    }
    .status-pill.read {
        background: var(--green-dim);
        color: var(--green);
    }
    .status-pill.planned {
        background: var(--border);
        color: var(--text-3);
    }

    /* ── Error banner ── */
    .action-error {
        padding: 10px var(--page-pad);
        background: #fef2f2;
        border-bottom: 1px solid #fecaca;
        color: #dc2626;
        font-size: 0.875rem;
    }

    /* ── Hero ── */
    .hero {
        background: #1a2332;
    }

    .hero-inner {
        max-width: var(--page-max);
        margin-inline: auto;
        padding: 28px var(--page-pad);
        display: flex;
        gap: 24px;
        align-items: flex-start;
    }

    @media (min-width: 700px) {
        .hero-inner {
            padding-top: 40px;
            padding-bottom: 40px;
            gap: 36px;
        }
    }

    .cover-box {
        width: 100px;
        height: 150px;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-book);
    }

    @media (min-width: 700px) {
        .cover-box {
            width: 130px;
            height: 195px;
        }
    }

    .cover-check {
        position: absolute;
        bottom: 7px;
        right: 7px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--green);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        font-weight: 800;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        z-index: 2;
    }

    .hero-meta {
        padding-top: 4px;
        flex: 1;
        min-width: 0;
    }

    .hero-title {
        margin: 0 0 5px;
        font-family: var(--font-serif);
        font-size: 1.4rem;
        font-weight: 600;
        line-height: 1.25;
        color: #fff;
    }

    @media (min-width: 700px) {
        .hero-title {
            font-size: 1.8rem;
        }
    }

    .hero-author {
        margin: 0 0 10px;
        font-size: 0.95rem;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
    }

    .hero-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 8px;
    }

    .tag {
        display: inline-block;
        padding: 3px 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 99px;
        font-size: 0.72rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.65);
    }

    .hero-date {
        margin: 2px 0 0;
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.45);
    }

    /* ── Cards layout ── */
    .cards-area {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 20px var(--page-pad);
        max-width: var(--page-max);
        margin-inline: auto;
    }

    @media (min-width: 700px) {
        .cards-area {
            flex-direction: row;
            align-items: flex-start;
            gap: 24px;
            padding-top: 28px;
            padding-bottom: 28px;
        }

        .main-col {
            flex: 1;
            min-width: 0;
        }
        .side-col {
            width: 300px;
            flex-shrink: 0;
        }
    }

    .cards-col {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    /* ── Card ── */
    .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--r);
        padding: 20px;
        box-shadow: var(--shadow-xs);
    }

    .card-flat {
        background: var(--surface-2);
        box-shadow: none;
    }

    .card-label {
        margin: 0 0 14px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: var(--text-3);
    }

    .card-hint {
        margin: -8px 0 12px;
        font-size: 0.85rem;
        color: var(--text-3);
    }

    /* ── Progress stepper ── */
    .prog-bar-big {
        height: 10px;
        background: var(--border);
        border-radius: 99px;
        overflow: hidden;
        margin-bottom: 10px;
    }

    .prog-fill-big {
        height: 100%;
        background: var(--accent);
        border-radius: 99px;
        transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .prog-count-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 20px;
    }

    .prog-count {
        display: flex;
        align-items: baseline;
        gap: 4px;
    }

    .prog-n {
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--text);
        line-height: 1;
        font-variant-numeric: tabular-nums;
    }

    .prog-total {
        font-size: 0.9rem;
        color: var(--text-3);
        font-weight: 500;
    }

    .prog-pct-big {
        font-size: 1rem;
        font-weight: 700;
        color: var(--accent);
        font-variant-numeric: tabular-nums;
    }

    .quick-add-row {
        display: flex;
        gap: 6px;
        margin-bottom: 16px;
    }

    .qa-btn {
        flex: 1;
        padding: 11px 4px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: var(--r-sm);
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-2);
        cursor: pointer;
        transition:
            background 0.12s,
            border-color 0.12s,
            color 0.12s,
            transform 0.1s;
    }

    .qa-btn:not([disabled]):hover {
        background: var(--accent-light);
        border-color: var(--accent);
        color: var(--accent);
    }

    .qa-btn:not([disabled]):active {
        transform: scale(0.95);
    }

    .qa-btn[disabled] {
        opacity: 0.35;
        cursor: default;
    }

    .manual-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 14px;
        border-top: 1px solid var(--border);
    }

    .manual-label {
        font-size: 0.76rem;
        color: var(--text-4);
        flex-shrink: 0;
    }

    .num-input {
        width: 80px;
        padding: 7px 10px;
        border: 1px solid var(--border);
        border-radius: var(--r-xs);
        background: var(--surface-2);
        color: var(--text);
        font-size: 0.9rem;
        text-align: right;
        outline: none;
        transition: border-color 0.15s;
    }

    .num-input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-dim);
    }

    .num-suffix {
        font-size: 0.8rem;
        color: var(--text-4);
        flex-shrink: 0;
    }

    /* ── Stars ── */
    .stars-row {
        display: flex;
        gap: 4px;
        margin-bottom: 14px;
    }

    .star {
        font-size: 2rem;
        background: none;
        border: none;
        padding: 0 2px;
        color: var(--border);
        transition:
            color 0.1s,
            transform 0.1s;
        line-height: 1;
        cursor: pointer;
    }

    .star.on {
        color: var(--accent);
    }
    .star:active {
        transform: scale(1.2);
    }

    /* ── Date toggle ── */
    .date-toggle-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
    }

    .text-link {
        background: none;
        border: none;
        padding: 0;
        font-size: 0.8rem;
        color: var(--accent);
        text-decoration: underline;
        cursor: pointer;
    }

    .date-input {
        padding: 5px 9px;
        border: 1px solid var(--border);
        border-radius: var(--r-xs);
        background: var(--surface-2);
        color: var(--text);
        font-size: 0.82rem;
        outline: none;
    }

    .date-input:focus {
        border-color: var(--accent);
    }

    /* ── Buttons ── */
    .btn-primary {
        width: 100%;
        padding: 11px 16px;
        background: var(--accent);
        color: #fff;
        border: none;
        border-radius: var(--r-sm);
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        transition:
            opacity 0.15s,
            transform 0.1s;
        cursor: pointer;
    }

    .btn-primary:hover {
        opacity: 0.9;
    }
    .btn-primary:active {
        transform: scale(0.99);
    }

    .btn-primary.btn-sm {
        width: auto;
        padding: 8px 14px;
        font-size: 0.82rem;
    }

    .btn-green {
        width: 100%;
        padding: 11px 16px;
        background: var(--green);
        color: #fff;
        border: none;
        border-radius: var(--r-sm);
        font-size: 0.9rem;
        font-weight: 700;
        transition: opacity 0.15s;
        cursor: pointer;
    }

    .btn-green:hover {
        opacity: 0.9;
    }

    .btn-ghost {
        width: 100%;
        padding: 10px 16px;
        background: transparent;
        border: 1px solid var(--border);
        border-radius: var(--r-sm);
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-3);
        transition:
            background 0.15s,
            border-color 0.15s;
        cursor: pointer;
    }

    .btn-ghost:hover {
        background: var(--border-2);
        border-color: var(--text-4);
    }

    .btn-ghost.btn-sm {
        width: auto;
        padding: 7px 14px;
        font-size: 0.8rem;
    }

    .btn-danger {
        padding: 7px 14px;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: var(--r-sm);
        font-size: 0.8rem;
        font-weight: 700;
        transition: opacity 0.15s;
        cursor: pointer;
    }

    .btn-danger:hover {
        opacity: 0.9;
    }

    /* ── Notes ── */
    .notes-ta {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--r-sm);
        background: var(--surface-2);
        color: var(--text);
        font-size: 0.9rem;
        line-height: 1.6;
        resize: vertical;
        margin-bottom: 12px;
        outline: none;
        transition: border-color 0.15s;
        box-sizing: border-box;
    }

    .notes-ta:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-dim);
    }

    /* ── Edit details ── */
    .expand-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
    }

    .chevron {
        color: var(--text-4);
        transition: transform 0.2s;
        flex-shrink: 0;
    }

    .chevron.open {
        transform: rotate(90deg);
    }

    .edit-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-bottom: 12px;
    }

    .edit-field label {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--text-3);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .text-input {
        padding: 9px 11px;
        border: 1px solid var(--border);
        border-radius: var(--r-xs);
        background: var(--surface-2);
        color: var(--text);
        font-size: 0.875rem;
        outline: none;
        transition: border-color 0.15s;
        width: 100%;
        box-sizing: border-box;
    }

    .text-input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-dim);
    }

    .num-sm {
        width: 100px;
    }

    /* ── Delete area ── */
    .delete-area {
        text-align: center;
        padding: 8px 0 4px;
    }

    .del-trigger {
        background: none;
        border: none;
        font-size: 0.8rem;
        color: var(--text-4);
        text-decoration: underline;
        cursor: pointer;
        padding: 4px;
        transition: color 0.15s;
    }

    .del-trigger:hover {
        color: #dc2626;
    }

    .del-confirm-box {
        background: var(--surface);
        border: 1px solid #fecaca;
        border-radius: var(--r-sm);
        padding: 14px;
    }

    .del-text {
        margin: 0 0 12px;
        font-size: 0.875rem;
        color: var(--text-2);
    }

    .del-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
    }
</style>
