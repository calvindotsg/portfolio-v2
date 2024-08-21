<script>
    import {onMount} from "svelte";

    export let currentProgress;
    export let totalGoal;

    let progressBarContainer;
    let progressWidth = 0;

    const animateProgressBar = () => {
        progressWidth = (currentProgress / totalGoal) * 100;
    };

    onMount(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                animateProgressBar();
            }
        });
        observer.observe(progressBarContainer);

        return () => {
            observer.disconnect();
        };
    });
</script>

<style>
    :global(.progress-bar-container) {
        overflow: hidden;
        background-color: #e5e7eb; /* gray-200 */
        border-radius: 9999px; /* full */
        height: 24px;
        margin-top: 16px;
    }

    :global(.progress-bar) {
        height: 100%;
        background-color: #f472b6;
        border-radius: 9999px; /* full */
        transition: width 2s ease-in-out;
        padding-left: 8px;
        padding-right: 8px;
        box-sizing: border-box;
        position: relative;
    }

    :global(.cycling-icon) {
        position: absolute;
        right: 25px;
        top: 6px;
        transform: translateX(50%) translateY(-25%) scaleX(-1);
        font-size: 1rem;
    }
</style>

<div bind:this={progressBarContainer} class="progress-bar-container">
    <div class="progress-bar" style="width: {progressWidth}%">
        <span
                class="cycling-icon"
        >🚴🏻</span>
    </div>
</div>
