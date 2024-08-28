<script lang="ts">
    import {onMount} from 'svelte';
    import {spring, stagger, timeline, type TimelineDefinition} from 'motion';

    let mainElement: HTMLElement;

    onMount(() => {
        const cards = mainElement.querySelectorAll('.card');

        const sequence: TimelineDefinition = [
            [".loader", {
                opacity: [1, 0], pointerEvents: "none"
            }, {
                easing: "ease-out"
            }],
            [
                cards,
                {y: ['40%', '0%'], opacity: [0, 1]},
                {
                    at: '-0.1',
                    duration: 0.4,
                    delay: stagger(0.3),
                    easing: spring({velocity: 100, stiffness: 50, damping: 10}),
                },
            ],
        ];

        timeline(sequence);
    });
</script>

<main
        bind:this={mainElement}
        class="text-[var(--text)] m-auto p-2 grid gap-2 max-w-6xl overflow-hidden relative w-full sm:p-4 sm:gap-2 md:grid-cols-2 md:gap-3 md:p-6 lg:h-screen lg:grid-rows-8 lg:grid-cols-4 lg:gap-4 lg:max-h-[800px]"
>
    <slot/>
</main>
