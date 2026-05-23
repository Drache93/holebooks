<script lang="ts">
	import type { PageProps } from './$types'
	import BookCover from '$lib/BookCover.svelte'
	import { goto } from '$app/navigation'

	let { data }: PageProps = $props()

	const SPINE = [
		{ bg: '#1E3A5F', accent: '#2E5A8F', text: '#C8DAEA' },
		{ bg: '#2D4A2A', accent: '#4A7A44', text: '#C4DCC0' },
		{ bg: '#4A2040', accent: '#7A3A65', text: '#E4C4D8' },
		{ bg: '#3A2A10', accent: '#6A5020', text: '#DCCCA0' },
		{ bg: '#1A3A4A', accent: '#2A6A7A', text: '#B8D8E4' },
		{ bg: '#3A1A1A', accent: '#7A3030', text: '#E4C4C4' },
		{ bg: '#2A3040', accent: '#4A5570', text: '#C4CCE0' },
		{ bg: '#1A3A30', accent: '#2A6A58', text: '#B8E0D8' },
	]

	function bookColor(id: string) {
		let h = 0
		for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff
		return SPINE[h % SPINE.length]
	}

	let q = $state('')

	const hits = (title: string, author: string) =>
		!q || title.toLowerCase().includes(q.toLowerCase()) || author.toLowerCase().includes(q.toLowerCase())

	const reading = $derived(data.reading.filter(b => hits(b.title, b.author)))
	const read    = $derived(data.read.filter(b => hits(b.title, b.author)))
	const planned = $derived(data.planned.filter(b => hits(b.title, b.author)))

	const goalPct = $derived(Math.min(100, Math.round(data.stats.read / data.stats.goal * 100)))

	const yearIndex = $derived(data.years.indexOf(data.year))
	const prevYear  = $derived(yearIndex > 0 ? data.years[yearIndex - 1] : null)
	const nextYear  = $derived(yearIndex < data.years.length - 1 ? data.years[yearIndex + 1] : null)

	function navYear(y: number) {
		goto(`?year=${y}`, { noScroll: true })
	}
</script>

<div class="shell">

	<!-- ══ STATS / GOAL BAR (sticky) ══ -->
	<div class="stats-bar anim d1">
		<div class="wrap stats-content">
			<div class="stats-row">
				<div class="stats-counts">
					<div class="stat">
						<span class="stat-n">{data.stats.read}</span>
						<span class="stat-l">read</span>
					</div>
					<div class="stat-dot"></div>
					<div class="stat">
						<span class="stat-n">{data.stats.reading}</span>
						<span class="stat-l">reading</span>
					</div>
					<div class="stat-dot"></div>
					<div class="stat">
						<span class="stat-n">{data.stats.planned}</span>
						<span class="stat-l">planned</span>
					</div>
					<div class="stat-dot"></div>
					<div class="stat">
						<span class="stat-n">{data.stats.pagesRead.toLocaleString()}</span>
						<span class="stat-l">pages</span>
					</div>
				</div>
				<span class="goal-year">{data.year}</span>
			</div>
			<div class="goal-row">
				<div class="goal-track">
					<div class="goal-fill" style="width:{goalPct}%"></div>
				</div>
				<span class="goal-label">{data.stats.read} of {data.stats.goal} books</span>
				<span class="goal-pct">{goalPct}%</span>
			</div>
		</div>
	</div>

	<!-- ══ MAIN ══ -->
	<main class="wrap main-content">

		<!-- Toolbar: search + add book -->
		<div class="shelf-toolbar anim d2">
			<div class="search-wrap">
				<svg class="search-ico" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
					<path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				<input type="search" placeholder="Search your shelf…" class="search-input" bind:value={q} />
			</div>
			<a href="/add" class="add-btn">
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
					<path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
				</svg>
				Add book
			</a>
		</div>

		<!-- Currently Reading -->
		{#if reading.length > 0}
			<section class="section anim d3">
				<h2 class="section-label">
					<span class="label-dot" style="background:var(--accent)"></span>
					Currently Reading
				</h2>
				<div class="reading-grid">
					{#each reading as book (book.id)}
						{@const c = bookColor(book.id)}
						<a href="/book/{book.id}" class="rc">
							<div class="rc-cover" style="background:{c.bg}">
								<BookCover title={book.title} color={c} coverUrl={book.coverUrl} />
							</div>
							<div class="rc-info">
								<p class="rc-title">{book.title}</p>
								<p class="rc-author">{book.author}</p>
								{#if book.genre}<span class="rc-genre">{book.genre}</span>{/if}
								<div class="rc-progress-wrap">
									<div class="rc-bar">
										<div class="rc-fill" style="width:{book.progress}%"></div>
									</div>
									<div class="rc-foot">
										<span class="rc-pct">{book.progress}%</span>
										{#if book.pagesRead && book.totalPages}
											<span class="rc-pp">{book.pagesRead} / {book.totalPages} pp</span>
										{/if}
									</div>
								</div>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Read this year — always shown, with flanking year nav arrows -->
		<section class="section anim d4">
			<h2 class="section-label">
				<span class="label-dot" style="background:var(--green)"></span>
				Read in {data.year}
				{#if read.length > 0}<span class="label-badge">{read.length}</span>{/if}
			</h2>
			<div class="year-grid-outer">
				<button
					class="yr-arrow"
					disabled={prevYear === null}
					onclick={() => prevYear !== null && navYear(prevYear)}
					aria-label="Previous year"
				>‹</button>

				<div class="year-grid-inner">
					{#if read.length > 0}
						<div class="grid">
							{#each read as book (book.id)}
								{@const c = bookColor(book.id)}
								<a href="/book/{book.id}" class="tile">
									<div class="tile-cover" style="background:{c.bg}">
										<BookCover title={book.title} color={c} coverUrl={book.coverUrl} small />
										<span class="tile-check">✓</span>
									</div>
									<p class="tile-title">{book.title}</p>
									<p class="tile-author">{book.author}</p>
									{#if book.rating}
										<p class="tile-stars">{'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}</p>
									{/if}
								</a>
							{/each}
						</div>
					{:else}
						<p class="year-empty">{q ? `No matches in ${data.year}` : `No books finished in ${data.year}`}</p>
					{/if}
				</div>

				<button
					class="yr-arrow"
					disabled={nextYear === null}
					onclick={() => nextYear !== null && navYear(nextYear)}
					aria-label="Next year"
				>›</button>
			</div>
		</section>

		<!-- Want to read -->
		{#if planned.length > 0}
			<section class="section anim d4">
				<h2 class="section-label">
					<span class="label-dot" style="background:var(--text-3)"></span>
					Want to Read
					<span class="label-badge">{planned.length}</span>
				</h2>
				<div class="grid">
					{#each planned as book (book.id)}
						{@const c = bookColor(book.id)}
						<a href="/book/{book.id}" class="tile planned">
							<div class="tile-cover" style="background:{c.bg}">
								<BookCover title={book.title} color={c} coverUrl={book.coverUrl} small />
							</div>
							<p class="tile-title">{book.title}</p>
							<p class="tile-author">{book.author}</p>
							{#if book.totalPages}<p class="tile-pp">{book.totalPages} pp</p>{/if}
						</a>
					{/each}
				</div>
			</section>
		{/if}

		{#if q && !reading.length && !read.length && !planned.length}
			<p class="empty">No books matching "<em>{q}</em>"</p>
		{/if}

	</main>

	<div style="height:60px"></div>
</div>

<style>
	.shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	/* ══ Stats / goal bar ══ */
	.stats-bar {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.stats-content {
		padding-top: 14px;
		padding-bottom: 14px;
	}

	.stats-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}

	.stats-counts {
		display: flex;
		align-items: center;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding-right: 18px;
	}

	.stat-n {
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	.stat-l {
		font-size: 0.68rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-3);
		margin-top: 2px;
	}

	.stat-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--border);
		margin-right: 18px;
		flex-shrink: 0;
		margin-bottom: 10px;
	}

	.goal-year {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-4);
		letter-spacing: 0.04em;
		font-variant-numeric: tabular-nums;
	}

	/* Goal progress row */
	.goal-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.goal-track {
		flex: 1;
		height: 8px;
		background: var(--border);
		border-radius: 99px;
		overflow: hidden;
	}

	.goal-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 99px;
		transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.goal-label {
		font-size: 0.76rem;
		font-weight: 500;
		color: var(--text-3);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}

	.goal-pct {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--accent);
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ══ Main content ══ */
	.main-content {
		flex: 1;
	}

	/* ══ Shelf toolbar ══ */
	.shelf-toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 32px;
		margin-bottom: 4px;
	}

	.search-wrap {
		flex: 1;
		max-width: 480px;
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
		padding: 9px 12px 9px 34px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		color: var(--text);
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.search-input::placeholder { color: var(--text-4); }

	.search-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-dim);
	}

	.add-btn {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 9px 18px;
		background: var(--accent);
		color: #fff;
		border-radius: var(--r-sm);
		font-weight: 600;
		font-size: 0.875rem;
		white-space: nowrap;
		flex-shrink: 0;
		transition: opacity 0.15s, transform 0.1s;
	}

	.add-btn:hover { opacity: 0.88; }
	.add-btn:active { transform: scale(0.97); }

	/* ══ Sections ══ */
	.section {
		margin-top: 44px;
	}

	.section-label {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: var(--text-3);
	}

	.label-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.label-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 18px;
		min-width: 18px;
		padding: 0 5px;
		background: var(--border);
		border-radius: 99px;
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--text-3);
		letter-spacing: 0;
		margin-left: 2px;
	}

	/* ══ Year nav ══ */
	.year-grid-outer {
		display: flex;
		align-items: flex-start;
		gap: 2px;
	}

	.yr-arrow {
		flex-shrink: 0;
		width: 36px;
		align-self: stretch;
		min-height: 80px;
		background: none;
		border: none;
		color: var(--text-4);
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--r-sm);
		transition: background 0.15s, color 0.15s;
		padding: 0;
	}

	.yr-arrow:not([disabled]):hover {
		background: var(--accent-light);
		color: var(--accent);
	}

	.yr-arrow[disabled] {
		opacity: 0.18;
		cursor: default;
	}

	.year-grid-inner {
		flex: 1;
		min-width: 0;
	}

	.year-empty {
		padding: 40px 0;
		color: var(--text-4);
		font-size: 0.9rem;
	}

	/* ══ Reading cards ══ */
	.reading-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
	}

	@media (min-width: 600px) {
		.reading-grid { grid-template-columns: repeat(2, 1fr); }
	}

	@media (min-width: 900px) {
		.reading-grid { grid-template-columns: repeat(3, 1fr); }
	}

	.rc {
		display: flex;
		gap: 16px;
		align-items: flex-start;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r);
		padding: 16px;
		box-shadow: var(--shadow-xs);
		transition: box-shadow 0.2s, transform 0.2s;
	}

	.rc:hover {
		box-shadow: var(--shadow);
		transform: translateY(-2px);
	}

	.rc-cover {
		width: 70px;
		min-width: 70px;
		height: 105px;
		border-radius: var(--r-xs);
		position: relative;
		overflow: hidden;
		flex-shrink: 0;
		box-shadow: var(--shadow-book);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.rc-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.rc-title {
		margin: 0 0 3px;
		font-family: var(--font-serif);
		font-size: 0.975rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--text);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.rc-author {
		margin: 0 0 4px;
		font-size: 0.8rem;
		color: var(--text-3);
		font-weight: 500;
	}

	.rc-genre {
		display: inline-block;
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-4);
		margin-bottom: auto;
	}

	.rc-progress-wrap { margin-top: 12px; }

	.rc-bar {
		height: 4px;
		background: var(--border);
		border-radius: 99px;
		overflow: hidden;
		margin-bottom: 5px;
	}

	.rc-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 99px;
		transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.rc-foot {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.rc-pct {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--accent);
	}

	.rc-pp {
		font-size: 0.7rem;
		color: var(--text-4);
		font-variant-numeric: tabular-nums;
	}

	/* ══ Book grid ══ */
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px 14px;
	}

	@media (min-width: 460px)  { .grid { grid-template-columns: repeat(4, 1fr); } }
	@media (min-width: 600px)  { .grid { grid-template-columns: repeat(5, 1fr); } }
	@media (min-width: 780px)  { .grid { grid-template-columns: repeat(6, 1fr); } }
	@media (min-width: 960px)  { .grid { grid-template-columns: repeat(7, 1fr); } }
	@media (min-width: 1200px) { .grid { grid-template-columns: repeat(8, 1fr); } }

	.tile {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tile-cover {
		aspect-ratio: 2/3;
		border-radius: var(--r-xs);
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-book);
		transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s;
	}

	.tile:hover .tile-cover {
		transform: translateY(-4px) rotate(-0.5deg);
		box-shadow: 5px 12px 30px rgba(17,24,39,0.28);
	}

	.tile.planned .tile-cover { opacity: 0.72; }
	.tile.planned:hover .tile-cover { opacity: 1; }

	.tile-check {
		position: absolute;
		bottom: 5px;
		right: 5px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--green);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.55rem;
		font-weight: 800;
		box-shadow: 0 1px 4px rgba(0,0,0,0.25);
		z-index: 2;
	}

	.tile-title {
		margin: 0;
		font-family: var(--font-serif);
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--text);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.tile-author {
		margin: 0;
		font-size: 0.65rem;
		color: var(--text-3);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tile-pp {
		margin: 0;
		font-size: 0.6rem;
		color: var(--text-4);
		font-variant-numeric: tabular-nums;
	}

	.tile-stars {
		margin: 0;
		font-size: 0.62rem;
		color: var(--accent);
		letter-spacing: 0.02em;
	}

	/* ══ Empty ══ */
	.empty {
		padding: 60px 0;
		text-align: center;
		color: var(--text-4);
		font-size: 0.95rem;
	}
</style>
