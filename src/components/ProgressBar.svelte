<script>
    import {onMount} from "svelte";

    export let currentProgress;
    export let totalGoal;
    export let goalLogo;

    let progressBarContainer;
    let progressWidth = 0;

    const animateProgressBar = () => {
        progressWidth = (currentProgress / totalGoal) * 100;
    };

    onMount(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                animateProgressBar();
                observer.disconnect(); // Disconnect after the first intersection
            }
        }, {threshold: 0.1}); // Adjust threshold to control when animation triggers
        observer.observe(progressBarContainer);
    });
</script>

<div bind:this={progressBarContainer} class="overflow-hidden bg-gray-300 rounded-full h-6 mt-4">
    <div class="h-full bg-[var(--shadow)] rounded-full transition-all duration-2000 ease-in-out px-2 box-border relative"
         style="width: {progressWidth}%">
        <span class="absolute right-6 top-1.5 translate-x-1/2 -translate-y-1/4 transform scale-x-[-1] text-base">
            {goalLogo}
        </span>
    </div>
</div>
