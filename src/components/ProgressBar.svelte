<script>
    import {onDestroy, onMount} from "svelte";

    export let currentProgress;
    export let totalGoal;

    let progressWidth = 0;
    let observer;

    const animateProgressBar = () => {
        progressWidth = (currentProgress / totalGoal) * 100;
    };

    const handleIntersection = (entries) => {
        if (entries[0].isIntersecting) {
            animateProgressBar();
        }
    };

    onMount(() => {
        observer = new IntersectionObserver(handleIntersection);
        observer.observe(document.querySelector('.progress-bar-container'));
    });

    onDestroy(() => {
        if (observer) observer.disconnect();
    });
</script>

<style>
    .progress-bar-container {
        overflow: hidden;
        background-color: #e5e7eb; /* gray-200 */
        border-radius: 9999px; /* full */
        height: 24px;
        margin-top: 16px;
    }

    .progress-bar {
        height: 100%;
        background-color: #f472b6; /* pink-400 */
        border-radius: 9999px; /* full */
        transition: width 1.5s ease-in-out;
        padding-left: 8px;
        padding-right: 8px;
        box-sizing: border-box;
        position: relative;
    }

    .cycling-icon {
        position: absolute;
        right: 25px;
        top: 6px;
        transform: translateX(50%) translateY(-25%) scaleX(-1);
        font-size: 1rem;
    }
</style>

<div class="progress-bar-container">
    <div class="progress-bar" style="width: {progressWidth}%">
    <span
            class="cycling-icon"
    >🚴🏻</span>
    </div>
</div>
