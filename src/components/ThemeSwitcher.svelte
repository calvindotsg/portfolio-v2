<script>
    import {onMount} from 'svelte';

    let theme = 'light';

    const toggleTheme = () => {
        theme = theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    onMount(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        theme = localStorage.getItem('theme') || systemTheme;
        document.documentElement.setAttribute('data-theme', theme);
    });
</script>

<button
        aria-label="Toggle Theme"
        aria-live="polite"
        class="flex justify-center items-center text-xl max-h-[40px] max-w-[60px] shadow-custom shadow-[var(--shadow)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] text-[var(--text)] px-5 py-1 border border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-300 ease-in-out bg-[var(--background)] cursor-pointer rounded-lg"
        on:click={toggleTheme}>
    {theme === 'light' ? '🔆' : '🌙'}
    <span class="sr-only">Toggle Theme</span>
    <slot/>
</button>
