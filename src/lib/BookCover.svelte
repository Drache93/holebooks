<script lang="ts">
	interface Props {
		title: string
		color: { bg: string; accent: string; text: string }
		small?: boolean
		coverUrl?: string
		bookId?: string
	}

	let { title, color, small = false, coverUrl, bookId }: Props = $props()

	let failed = $state(false)
	let apiMissed = $state(false)

	function initials(t: string) {
		return t
			.split(' ')
			.filter((w) => w.length > 2)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('')
	}

	const fallbackSrc = $derived(
		coverUrl ?? `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-M.jpg`
	)

	const src = $derived(
		bookId && !apiMissed
			? `/api/books/${bookId}/cover`
			: fallbackSrc
	)

	function handleError() {
		if (bookId && !apiMissed) {
			apiMissed = true  // first failure: API not cached yet, try direct URL
		} else {
			failed = true     // second failure: nothing works, show initials
		}
	}
</script>

{#if !failed}
	<img
		{src}
		alt="{title} cover"
		class="cover-photo"
		onerror={handleError}
	/>
{/if}
{#if failed}
	<div class="cover-pattern" style="border-color: {color.accent}"></div>
	<span class="cover-initials" class:small style="color: {color.text}">{initials(title)}</span>
{/if}

<style>
	.cover-photo {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
		border-radius: inherit;
	}

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
</style>
