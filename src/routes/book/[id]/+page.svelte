<script lang="ts">
	import { enhance } from '$app/forms'
	import type { PageProps } from './$types'

	let { data, form }: PageProps = $props()

	let book = $state({ ...data.book })
	$effect(() => {
		book = { ...data.book }
	})

	const SPINE_COLORS = [
		{ bg: '#5c3317', accent: '#8b5e3c', text: '#f5e6d3' },
		{ bg: '#3d2f1f', accent: '#6b4c30', text: '#eddfc8' },
		{ bg: '#7b4f2e', accent: '#a07050', text: '#f5e6d3' },
		{ bg: '#4a3020', accent: '#7a5535', text: '#f0dfc5' },
		{ bg: '#6e3a20', accent: '#9c5e3a', text: '#f5e0cc' },
		{ bg: '#2e2418', accent: '#5a4230', text: '#e8d8c0' },
		{ bg: '#8b5e30', accent: '#b07840', text: '#f5e8d0' },
		{ bg: '#4c2e10', accent: '#7a5028', text: '#ecd8bc' }
	]

	function bookColor(id: string) {
		let h = 0
		for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff
		return SPINE_COLORS[h % SPINE_COLORS.length]
	}

	function initials(title: string) {
		return title
			.split(' ')
			.filter((w) => w.length > 2)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('')
	}

	const color = $derived(bookColor(book.id))

	let pagesInput = $state(String(book.pagesRead ?? 0))
	let notesInput = $state(book.notes ?? '')
	let hoverRating = $state(0)
	let pendingRating = $state(book.rating ?? 0)
	let noteSaved = $state(false)
	let progressSaved = $state(false)

	$effect(() => {
		pagesInput = String(book.pagesRead ?? 0)
		notesInput = book.notes ?? ''
		pendingRating = book.rating ?? 0
	})
</script>

<div class="page">
	<!-- Back nav -->
	<nav>
		<a href="/" class="back-btn">
			<span class="back-arrow">←</span>
			<span>Shelf</span>
		</a>
		<span class="status-chip" class:reading={book.status === 'reading'} class:read={book.status === 'read'} class:planned={book.status === 'planned'}>
			{book.status === 'reading' ? 'Reading' : book.status === 'read' ? 'Finished' : 'Planned'}
		</span>
	</nav>

	<!-- Hero -->
	<div class="hero">
		<div class="cover-wrap">
			<div class="cover-lg" style="background: {color.bg}">
				<div class="cover-pattern" style="border-color: {color.accent}"></div>
				<span class="cover-initials" style="color: {color.text}">{initials(book.title)}</span>
				{#if book.status === 'read'}
					<div class="cover-badge-lg">✓</div>
				{/if}
			</div>
		</div>
		<div class="hero-info">
			<h1 class="book-title">{book.title}</h1>
			<p class="book-author">{book.author}</p>
			{#if book.genre}
				<p class="book-genre">{book.genre}</p>
			{/if}
			{#if book.totalPages}
				<p class="book-pages">{book.totalPages} pages</p>
			{/if}
			{#if book.dateRead}
				<p class="book-date">Finished {book.dateRead}</p>
			{/if}
		</div>
	</div>

	<!-- Progress (if reading) -->
	{#if book.status === 'reading'}
		<section class="card">
			<h2 class="card-heading">Reading Progress</h2>

			<div class="progress-bar-lg">
				<div class="progress-fill-lg" style="width: {book.progress}%"></div>
			</div>
			<p class="progress-label">{book.progress}% complete</p>

			<form
				method="POST"
				action="?/updateProgress"
				use:enhance={() =>
					async ({ update }) => {
						await update({ reset: false })
						progressSaved = true
						setTimeout(() => (progressSaved = false), 2000)
					}}
			>
				<div class="input-row">
					<label for="pagesRead" class="input-label">Pages read</label>
					<div class="input-group">
						<input
							id="pagesRead"
							name="pagesRead"
							type="number"
							min="0"
							max={book.totalPages}
							bind:value={pagesInput}
							class="num-input"
						/>
						{#if book.totalPages}
							<span class="input-suffix">/ {book.totalPages}</span>
						{/if}
					</div>
				</div>
				<button type="submit" class="btn-primary">
					{progressSaved ? 'Saved!' : 'Update progress'}
				</button>
			</form>
		</section>

		<!-- Mark as read -->
		<section class="card">
			<h2 class="card-heading">Finished?</h2>
			<form
				method="POST"
				action="?/markRead"
				use:enhance={() =>
					async ({ update }) => {
						await update()
					}}
			>
				<p class="card-hint">Mark this book as read and record your rating.</p>
				<div class="rating-row">
					{#each [1, 2, 3, 4, 5] as s}
						<button
							type="button"
							class="star-btn"
							class:active={s <= (hoverRating || pendingRating)}
							onmouseenter={() => (hoverRating = s)}
							onmouseleave={() => (hoverRating = 0)}
							onclick={() => (pendingRating = s)}
							aria-label="{s} star"
						>
							★
						</button>
					{/each}
				</div>
				<input type="hidden" name="rating" value={pendingRating || ''} />
				<button type="submit" class="btn-finish">Mark as finished</button>
			</form>
		</section>
	{/if}

	<!-- Start reading (if planned) -->
	{#if book.status === 'planned'}
		<section class="card">
			<h2 class="card-heading">Ready to start?</h2>
			<p class="card-hint">Move this to your current reads.</p>
			<form
				method="POST"
				action="?/startReading"
				use:enhance={() =>
					async ({ update }) => {
						await update()
					}}
			>
				<button type="submit" class="btn-primary">Start reading</button>
			</form>
		</section>
	{/if}

	<!-- Rating (if read) -->
	{#if book.status === 'read'}
		<section class="card">
			<h2 class="card-heading">Your rating</h2>
			<form
				method="POST"
				action="?/setRating"
				use:enhance={() =>
					async ({ update }) => {
						await update({ reset: false })
					}}
			>
				<div class="rating-row">
					{#each [1, 2, 3, 4, 5] as s}
						<button
							type="button"
							class="star-btn"
							class:active={s <= (hoverRating || pendingRating)}
							onmouseenter={() => (hoverRating = s)}
							onmouseleave={() => (hoverRating = 0)}
							onclick={() => (pendingRating = s)}
							aria-label="{s} star"
						>
							★
						</button>
					{/each}
				</div>
				<input type="hidden" name="rating" value={pendingRating} />
				<button type="submit" class="btn-primary btn-sm">Save rating</button>
			</form>
		</section>
	{/if}

	<!-- Notes -->
	<section class="card">
		<h2 class="card-heading">Notes</h2>
		<form
			method="POST"
			action="?/saveNotes"
			use:enhance={() =>
				async ({ update }) => {
					await update({ reset: false })
					noteSaved = true
					setTimeout(() => (noteSaved = false), 2000)
				}}
		>
			<textarea
				name="notes"
				placeholder="Your thoughts, quotes, reflections…"
				rows="5"
				class="notes-input"
				bind:value={notesInput}
			></textarea>
			<button type="submit" class="btn-primary">
				{noteSaved ? 'Saved!' : 'Save notes'}
			</button>
		</form>
	</section>

	<div class="bottom-pad"></div>
</div>

<style>
	.page {
		min-height: 100dvh;
		background: var(--cream-light);
		padding-bottom: env(safe-area-inset-bottom);
	}

	/* ── Nav ── */
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: var(--brown-dark);
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--cream-light);
		font-size: 0.9rem;
		padding: 6px 10px;
		border-radius: var(--radius-sm);
		transition: background 0.15s;
	}

	.back-btn:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.back-arrow {
		font-size: 1.1rem;
	}

	.status-chip {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 4px 10px;
		border-radius: 99px;
	}

	.status-chip.reading {
		background: var(--reading-accent);
		color: #fff;
	}

	.status-chip.read {
		background: var(--read-accent);
		color: #fff;
	}

	.status-chip.planned {
		background: var(--brown-light);
		color: #fff;
	}

	/* ── Hero ── */
	.hero {
		display: flex;
		gap: 20px;
		padding: 24px 20px;
		background: linear-gradient(180deg, var(--brown-dark) 0%, var(--cream-light) 100%);
	}

	.cover-wrap {
		flex-shrink: 0;
	}

	.cover-lg {
		width: 110px;
		height: 165px;
		border-radius: var(--radius-sm);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			4px 6px 20px rgba(0, 0, 0, 0.4),
			inset -3px 0 6px rgba(0, 0, 0, 0.2);
		overflow: hidden;
	}

	.cover-pattern {
		position: absolute;
		inset: 8px;
		border: 1px solid;
		border-radius: 2px;
		opacity: 0.35;
		pointer-events: none;
	}

	.cover-initials {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		z-index: 1;
		opacity: 0.85;
		user-select: none;
	}

	.cover-badge-lg {
		position: absolute;
		bottom: 8px;
		right: 8px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--read-accent);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		z-index: 2;
	}

	.hero-info {
		flex: 1;
		padding-top: 8px;
		min-width: 0;
	}

	h1.book-title {
		margin: 0 0 4px;
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1.3;
		color: var(--cream-lightest);
	}

	.book-author {
		margin: 0 0 4px;
		font-size: 0.85rem;
		color: var(--brown-pale);
	}

	.book-genre {
		margin: 0 0 6px;
		font-size: 0.75rem;
		color: var(--brown-pale);
		font-style: italic;
	}

	.book-pages {
		margin: 0 0 2px;
		font-size: 0.75rem;
		color: var(--cream-dark);
		opacity: 0.75;
	}

	.book-date {
		margin: 0;
		font-size: 0.75rem;
		color: var(--brown-pale);
		opacity: 0.8;
	}

	/* ── Cards ── */
	.card {
		margin: 12px 16px 0;
		background: var(--cream-lightest);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-lg);
		padding: 18px;
		box-shadow: 0 1px 4px var(--shadow);
	}

	.card-heading {
		margin: 0 0 14px;
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--brown-mid);
	}

	.card-hint {
		margin: 0 0 12px;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	/* ── Progress bar ── */
	.progress-bar-lg {
		height: 8px;
		background: var(--cream-dark);
		border-radius: 99px;
		overflow: hidden;
		margin-bottom: 6px;
	}

	.progress-fill-lg {
		height: 100%;
		background: var(--reading-accent);
		border-radius: 99px;
		transition: width 0.4s ease;
	}

	.progress-label {
		margin: 0 0 14px;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	/* ── Inputs ── */
	.input-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		gap: 12px;
	}

	.input-label {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.input-group {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.num-input {
		width: 80px;
		padding: 6px 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--cream-light);
		color: var(--text);
		font-size: 0.9rem;
		text-align: right;
	}

	.num-input:focus {
		outline: 2px solid var(--brown-light);
		outline-offset: 1px;
	}

	.input-suffix {
		font-size: 0.8rem;
		color: var(--text-faint);
	}

	/* ── Buttons ── */
	.btn-primary {
		width: 100%;
		padding: 12px;
		background: var(--brown-mid);
		color: var(--cream-lightest);
		border: none;
		border-radius: var(--radius);
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		transition:
			background 0.15s,
			transform 0.1s;
	}

	.btn-primary:active {
		background: var(--brown-dark);
		transform: scale(0.99);
	}

	.btn-primary.btn-sm {
		padding: 8px 16px;
		width: auto;
		font-size: 0.8rem;
	}

	.btn-finish {
		width: 100%;
		padding: 12px;
		background: var(--read-accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		transition: background 0.15s;
	}

	.btn-finish:active {
		background: #47612d;
	}

	/* ── Stars ── */
	.rating-row {
		display: flex;
		gap: 8px;
		margin-bottom: 14px;
	}

	.star-btn {
		font-size: 2rem;
		background: none;
		border: none;
		padding: 0;
		color: var(--cream-dark);
		transition: color 0.1s, transform 0.1s;
		line-height: 1;
	}

	.star-btn.active {
		color: var(--brown-light);
	}

	.star-btn:active {
		transform: scale(1.2);
	}

	/* ── Notes ── */
	.notes-input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--cream-light);
		color: var(--text);
		font-size: 0.875rem;
		line-height: 1.6;
		resize: vertical;
		margin-bottom: 12px;
	}

	.notes-input:focus {
		outline: 2px solid var(--brown-light);
		outline-offset: 1px;
	}

	.bottom-pad {
		height: 40px;
	}
</style>
