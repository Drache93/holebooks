<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData } from './$types'

	let { form }: { form: ActionData } = $props()

	interface Candidate {
		title: string
		author: string
		isbn?: string
		totalPages?: number
		genre?: string
		coverUrl?: string
	}

	let query        = $state('')
	let candidates   = $state<Candidate[]>([])
	let searching    = $state(false)
	let selected     = $state<Candidate | null>(null)
	let titleInput   = $state('')
	let authorInput  = $state('')
	let genreInput   = $state('')
	let pagesInput   = $state('')
	let isbnInput    = $state('')
	let coverUrl     = $state('')
	let status       = $state('planned')

	let timer: ReturnType<typeof setTimeout>

	function onInput() {
		clearTimeout(timer)
		if (query.length < 2) { candidates = []; return }
		timer = setTimeout(search, 400)
	}

	async function search() {
		searching = true
		try {
			const r = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
			if (r.ok) candidates = await r.json()
		} finally { searching = false }
	}

	function pick(c: Candidate) {
		selected    = c
		titleInput  = c.title
		authorInput = c.author
		genreInput  = c.genre ?? ''
		pagesInput  = c.totalPages ? String(c.totalPages) : ''
		isbnInput   = c.isbn ?? ''
		coverUrl    = c.coverUrl ?? ''
		candidates  = []
		query       = ''
	}

	function clear() {
		selected = null
		titleInput = authorInput = genreInput = pagesInput = isbnInput = coverUrl = ''
	}

	const statuses = [
		{ value: 'planned',  label: 'Want to Read' },
		{ value: 'reading',  label: 'Currently Reading' },
		{ value: 'read',     label: 'Already Read' },
	]
</script>

<div class="page">
	<nav class="topnav">
		<a href="/" class="back">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M10 13L5 8l5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			Shelf
		</a>
		<span class="page-title">Add a book</span>
	</nav>

	<div class="body">
		<div class="body-inner">

			<!-- OL Search -->
			<div class="card">
				<p class="card-label">Search Open Library</p>

				{#if selected}
					<div class="selected-banner">
						<span class="selected-info">
							<strong>{selected.title}</strong> — {selected.author}
						</span>
						<button type="button" class="clear-btn" onclick={clear}>Clear</button>
					</div>
				{:else}
					<div class="search-wrap">
						<svg class="search-ico" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
							<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
						<input type="search" placeholder="Search by title, author, or ISBN…"
							class="search-input" bind:value={query} oninput={onInput} />
					</div>
					{#if searching}
						<div class="search-loader" aria-label="Searching…">
							<div class="search-loader-bar"></div>
						</div>
					{/if}

					{#if candidates.length > 0}
						<ul class="results">
							{#each candidates as c (c.isbn ?? c.title + c.author)}
								<li>
									<button type="button" class="result-btn" onclick={() => pick(c)}>
										{#if c.coverUrl}
											<img src={c.coverUrl} alt="" class="r-thumb" />
										{:else}
											<div class="r-thumb r-placeholder"></div>
										{/if}
										<div class="r-info">
											<span class="r-title">{c.title}</span>
											<span class="r-author">{c.author}</span>
											{#if c.totalPages}<span class="r-meta">{c.totalPages} pages</span>{/if}
										</div>
										<svg class="r-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none">
											<path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										</svg>
									</button>
								</li>
							{/each}
						</ul>
					{/if}

					<p class="or">— or enter details manually below —</p>
				{/if}
			</div>

			<!-- Book form -->
			<form method="POST" enctype="multipart/form-data" use:enhance>
				{#if form?.error}
					<div class="error-msg">{form.error}</div>
				{/if}

				<input type="hidden" name="coverUrl" value={coverUrl} />
				<input type="hidden" name="isbn"     value={isbnInput} />

				<div class="card">
					<p class="card-label">Details</p>

					<div class="field">
						<label for="f-title">Title *</label>
						<input id="f-title" name="title" type="text" required placeholder="Book title"
							class="text-input" bind:value={titleInput} />
					</div>
					<div class="field">
						<label for="f-author">Author *</label>
						<input id="f-author" name="author" type="text" required placeholder="Author name"
							class="text-input" bind:value={authorInput} />
					</div>
					<div class="two-col">
						<div class="field">
							<label for="f-genre">Genre</label>
							<input id="f-genre" name="genre" type="text" placeholder="e.g. Fiction"
								class="text-input" bind:value={genreInput} />
						</div>
						<div class="field">
							<label for="f-pages">Pages</label>
							<input id="f-pages" name="totalPages" type="number" min="1" placeholder="320"
								class="text-input" bind:value={pagesInput} />
						</div>
					</div>
				</div>

				<div class="card">
					<p class="card-label">Status</p>
					<div class="status-group">
						{#each statuses as s}
							<label class="status-opt" class:active={status === s.value}>
								<input type="radio" name="status" value={s.value} bind:group={status} class="sr-only" />
								{s.label}
							</label>
						{/each}
					</div>
				</div>

				<button type="submit" class="submit-btn">Add to shelf</button>
			</form>

		</div>
	</div>
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
		padding: max(12px, env(safe-area-inset-top)) 20px 12px;
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

	.back:hover { color: var(--accent); }

	.page-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
	}

	/* ── Body ── */
	.body {
		padding: 24px var(--page-pad);
	}

	.body-inner {
		max-width: 600px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	/* ── Cards ── */
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r);
		padding: 20px;
		box-shadow: var(--shadow-xs);
	}

	.card-label {
		margin: 0 0 14px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--text-3);
	}

	/* ── OL Search ── */
	.search-wrap {
		position: relative;
	}

	.search-ico {
		position: absolute;
		left: 11px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-4);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 10px 12px 10px 34px;
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		background: var(--surface-2);
		color: var(--text);
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.search-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-dim);
	}

	.search-loader {
		height: 3px;
		border-radius: 0 0 var(--r-sm) var(--r-sm);
		background: var(--border);
		overflow: hidden;
		margin-top: -1px;
	}

	.search-loader-bar {
		height: 100%;
		width: 40%;
		background: var(--accent);
		border-radius: 99px;
		animation: search-sweep 1.1s ease-in-out infinite;
	}

	@keyframes search-sweep {
		0%   { transform: translateX(-100%); }
		100% { transform: translateX(350%); }
	}

	.results {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		overflow: hidden;
	}

	.result-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		background: var(--surface);
		border: none;
		border-bottom: 1px solid var(--border-2);
		text-align: left;
		cursor: pointer;
		transition: background 0.1s;
	}

	.results li:last-child .result-btn { border-bottom: none; }
	.result-btn:hover { background: var(--surface-2); }
	.result-btn:active { background: var(--border-2); }

	.r-thumb {
		width: 34px;
		height: 51px;
		object-fit: cover;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.r-placeholder {
		background: var(--border);
	}

	.r-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.r-title {
		font-family: var(--font-serif);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.r-author {
		font-size: 0.75rem;
		color: var(--text-3);
	}

	.r-meta {
		font-size: 0.68rem;
		color: var(--text-4);
		font-variant-numeric: tabular-nums;
	}

	.r-chevron {
		color: var(--text-4);
		flex-shrink: 0;
	}

	.or {
		margin: 14px 0 0;
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-4);
	}

	.selected-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 14px;
		background: var(--accent-dim);
		border: 1px solid var(--accent-border);
		border-radius: var(--r-sm);
		font-size: 0.85rem;
		color: var(--text-2);
	}

	.clear-btn {
		background: none;
		border: none;
		font-size: 0.78rem;
		color: var(--accent);
		text-decoration: underline;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ── Form fields ── */
	.field {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin-bottom: 14px;
	}

	.field:last-child { margin-bottom: 0; }

	.field label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-3);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.text-input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		background: var(--surface-2);
		color: var(--text);
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.text-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-dim);
	}

	.two-col {
		display: grid;
		grid-template-columns: 1fr 100px;
		gap: 12px;
	}

	.two-col > * { min-width: 0; }

	/* ── Status picker ── */
	.status-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.status-opt {
		display: flex;
		align-items: center;
		padding: 12px 14px;
		border: 1.5px solid var(--border);
		border-radius: var(--r-sm);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		color: var(--text-3);
		transition: all 0.12s;
	}

	.status-opt.active {
		border-color: var(--accent);
		background: var(--accent-dim);
		color: var(--accent);
		font-weight: 700;
	}

	/* ── Submit ── */
	.submit-btn {
		width: 100%;
		padding: 14px;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--r-sm);
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.01em;
		transition: opacity 0.15s, transform 0.1s;
	}

	.submit-btn:hover { opacity: 0.9; }
	.submit-btn:active { transform: scale(0.99); }

	/* ── Error ── */
	.error-msg {
		padding: 12px 16px;
		background: #FEF2F2;
		border: 1px solid #FECACA;
		border-radius: var(--r-sm);
		color: #DC2626;
		font-size: 0.875rem;
	}

	.sr-only {
		position: absolute; width: 1px; height: 1px;
		overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap;
	}
</style>
