<script lang="ts">
	import type { PageProps } from './$types'
	import type { Book } from '$lib/types'

	let { data }: PageProps = $props()

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

	const goalPct = $derived(Math.min(100, Math.round((data.stats.read / data.stats.goal) * 100)))
</script>

<main>
	<!-- Header -->
	<header>
		<div class="header-inner">
			<div class="brand">
				<h1>Holebooks</h1>
				<span class="year-label">{data.stats.year}</span>
			</div>
			<p class="tagline">Your reading journey</p>
		</div>
	</header>

	<!-- Year progress -->
	<section class="goal-section">
		<div class="goal-row">
			<span class="goal-text">
				<strong>{data.stats.read}</strong> of <strong>{data.stats.goal}</strong> books read this year
			</span>
			<span class="goal-pct">{goalPct}%</span>
		</div>
		<div class="goal-track">
			<div class="goal-fill" style="width: {goalPct}%"></div>
		</div>
		<div class="stats-row">
			<div class="stat">
				<span class="stat-num">{data.stats.reading}</span>
				<span class="stat-label">reading</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat">
				<span class="stat-num">{data.stats.planned}</span>
				<span class="stat-label">planned</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat">
				<span class="stat-num">{data.stats.pagesRead.toLocaleString()}</span>
				<span class="stat-label">pages read</span>
			</div>
		</div>
	</section>

	<!-- Currently Reading -->
	{#if data.reading.length > 0}
		<section class="shelf-section">
			<h2 class="section-heading">
				<span class="section-dot reading-dot"></span>
				Currently Reading
			</h2>
			<div class="reading-list">
				{#each data.reading as book (book.id)}
					{@const color = bookColor(book.id)}
					<a href="/book/{book.id}" class="reading-card">
						<div class="reading-cover" style="background: {color.bg}">
							<div class="cover-pattern" style="border-color: {color.accent}"></div>
							<span class="cover-initials" style="color: {color.text}">{initials(book.title)}</span>
						</div>
						<div class="reading-info">
							<p class="book-title">{book.title}</p>
							<p class="book-author">{book.author}</p>
							{#if book.genre}
								<p class="book-genre">{book.genre}</p>
							{/if}
							<div class="progress-wrap">
								<div class="progress-track">
									<div class="progress-fill reading-fill" style="width: {book.progress}%"></div>
								</div>
								<div class="progress-meta">
									<span>{book.progress}%</span>
									{#if book.pagesRead && book.totalPages}
										<span>{book.pagesRead} / {book.totalPages} pages</span>
									{/if}
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Read -->
	{#if data.read.length > 0}
		<section class="shelf-section">
			<h2 class="section-heading">
				<span class="section-dot read-dot"></span>
				Read in {data.stats.year}
				<span class="section-count">{data.read.length}</span>
			</h2>
			<div class="book-grid">
				{#each data.read as book (book.id)}
					{@const color = bookColor(book.id)}
					<a href="/book/{book.id}" class="book-card">
						<div class="book-cover" style="background: {color.bg}">
							<div class="cover-pattern" style="border-color: {color.accent}"></div>
							<span class="cover-initials small" style="color: {color.text}"
								>{initials(book.title)}</span
							>
							<div class="cover-badge read-badge">✓</div>
						</div>
						<div class="book-meta">
							<p class="book-title-sm">{book.title}</p>
							<p class="book-author-sm">{book.author}</p>
							{#if book.rating}
								<div class="stars" aria-label="{book.rating} out of 5">
									{#each [1, 2, 3, 4, 5] as s}
										<span class:filled={s <= book.rating}>★</span>
									{/each}
								</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Planned -->
	{#if data.planned.length > 0}
		<section class="shelf-section">
			<h2 class="section-heading">
				<span class="section-dot planned-dot"></span>
				Want to Read
				<span class="section-count">{data.planned.length}</span>
			</h2>
			<div class="book-grid">
				{#each data.planned as book (book.id)}
					{@const color = bookColor(book.id)}
					<a href="/book/{book.id}" class="book-card">
						<div class="book-cover planned-cover" style="background: {color.bg}">
							<div class="cover-pattern" style="border-color: {color.accent}"></div>
							<span class="cover-initials small" style="color: {color.text}"
								>{initials(book.title)}</span
							>
						</div>
						<div class="book-meta">
							<p class="book-title-sm">{book.title}</p>
							<p class="book-author-sm">{book.author}</p>
							{#if book.totalPages}
								<p class="book-pages">{book.totalPages} pp</p>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<div class="bottom-pad"></div>
</main>

<style>
	main {
		padding-bottom: env(safe-area-inset-bottom);
	}

	/* ── Header ── */
	header {
		background: var(--brown-dark);
		padding: 20px 20px 18px;
	}

	.header-inner {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.brand {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--cream-light);
	}

	.year-label {
		font-size: 0.85rem;
		color: var(--brown-pale);
		letter-spacing: 0.05em;
	}

	.tagline {
		margin: 0;
		font-size: 0.8rem;
		color: var(--brown-pale);
		font-style: italic;
	}

	/* ── Year Goal ── */
	.goal-section {
		background: var(--brown-mid);
		padding: 16px 20px;
		color: var(--cream-light);
	}

	.goal-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
		font-size: 0.875rem;
	}

	.goal-pct {
		font-size: 0.8rem;
		opacity: 0.75;
	}

	.goal-track {
		height: 5px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 99px;
		overflow: hidden;
		margin-bottom: 14px;
	}

	.goal-fill {
		height: 100%;
		background: var(--brown-pale);
		border-radius: 99px;
		transition: width 0.4s ease;
	}

	.stats-row {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
	}

	.stat-num {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.stat-label {
		font-size: 0.7rem;
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-divider {
		width: 1px;
		height: 28px;
		background: rgba(255, 255, 255, 0.2);
	}

	/* ── Sections ── */
	.shelf-section {
		padding: 22px 20px 0;
	}

	.section-heading {
		margin: 0 0 14px;
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--brown-mid);
		text-transform: uppercase;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.section-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.reading-dot {
		background: var(--reading-accent);
	}
	.read-dot {
		background: var(--read-accent);
	}
	.planned-dot {
		background: var(--planned-accent);
	}

	.section-count {
		margin-left: auto;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--text-faint);
	}

	/* ── Currently Reading cards ── */
	.reading-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.reading-card {
		display: flex;
		gap: 16px;
		background: var(--cream-lightest);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-lg);
		padding: 14px;
		box-shadow: 0 2px 8px var(--shadow);
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}

	.reading-card:active {
		transform: scale(0.98);
		box-shadow: 0 1px 3px var(--shadow);
	}

	.reading-cover {
		width: 80px;
		min-width: 80px;
		height: 120px;
		border-radius: var(--radius-sm);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			2px 3px 8px var(--shadow-deep),
			inset -2px 0 4px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		flex-shrink: 0;
	}

	.reading-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.book-title {
		margin: 0 0 2px;
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.3;
		color: var(--brown-dark);
	}

	.book-author {
		margin: 0 0 2px;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.book-genre {
		margin: 0 0 auto;
		font-size: 0.72rem;
		color: var(--text-faint);
		font-style: italic;
	}

	.progress-wrap {
		margin-top: 10px;
	}

	.progress-track {
		height: 6px;
		background: var(--cream-dark);
		border-radius: 99px;
		overflow: hidden;
		margin-bottom: 4px;
	}

	.progress-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 0.4s ease;
	}

	.reading-fill {
		background: var(--reading-accent);
	}

	.progress-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.72rem;
		color: var(--text-faint);
	}

	/* ── Book grid ── */
	.book-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14px;
	}

	@media (min-width: 500px) {
		.book-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.book-card {
		display: flex;
		flex-direction: column;
		gap: 7px;
		transition: transform 0.15s;
	}

	.book-card:active {
		transform: scale(0.97);
	}

	.book-cover {
		aspect-ratio: 2/3;
		border-radius: var(--radius-sm);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			2px 3px 10px var(--shadow-deep),
			inset -2px 0 4px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}

	.planned-cover {
		opacity: 0.8;
	}

	/* Decorative inset border on cover */
	.cover-pattern {
		position: absolute;
		inset: 6px;
		border: 1px solid;
		border-radius: 2px;
		opacity: 0.4;
		pointer-events: none;
	}

	.cover-initials {
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		z-index: 1;
		opacity: 0.85;
		user-select: none;
	}

	.cover-initials.small {
		font-size: 1.4rem;
	}

	.cover-badge {
		position: absolute;
		bottom: 6px;
		right: 6px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		font-weight: 700;
		z-index: 2;
	}

	.read-badge {
		background: var(--read-accent);
		color: #fff;
	}

	.book-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.book-title-sm {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--brown-dark);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.book-author-sm {
		margin: 0;
		font-size: 0.68rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.book-pages {
		margin: 0;
		font-size: 0.65rem;
		color: var(--text-faint);
	}

	.stars {
		display: flex;
		gap: 1px;
		font-size: 0.7rem;
		color: var(--cream-dark);
	}

	.stars span.filled {
		color: var(--brown-light);
	}

	.bottom-pad {
		height: 40px;
	}
</style>
