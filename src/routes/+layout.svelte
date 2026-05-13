<script lang="ts">
	import '../app.css'

	let { children } = $props()
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/holebooks.png" />
	<link rel="apple-touch-icon" href="/holebooks.png" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#2c1a0c" />
	<title>Holebooks</title>
</svelte:head>

<div class="app">
	{@render children()}
</div>

<style>
	.app {
		max-width: 700px;
		margin: 0 auto;
		min-height: 100dvh;
	}
</style>
