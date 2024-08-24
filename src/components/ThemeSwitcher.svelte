<script>
    import {onMount} from 'svelte';

    let theme = 'light';

    const toggleTheme = () => {
        theme = theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    onMount(() => {
        // Detect system theme
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        theme = localStorage.getItem('theme') || systemTheme;
        document.documentElement.setAttribute('data-theme', theme);
    });
</script>

<!-- Theme Toggle Button -->
<button
        aria-label="Toggle Theme"
        class={`custom-btn text-xl max-h-[40px] max-w-[60px] shadow-custom shadow-[var(--shadow)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] text-[var(--text)] px-5 py-1 border border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-100 ease-in-out bg-[var(--background)] cursor-pointer rounded-lg`}
        on:click={toggleTheme}>
    {theme === 'light' ? '☀' : '☽'}
    <slot/>
</button>
