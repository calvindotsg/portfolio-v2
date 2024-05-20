export const LINKS: {
    github: string
    linkedin: string
    instagram: string
    strava: string
    telegram: string
    email: string
} = {
    github: "https://github.com/calvindotsg",
    linkedin: "https://www.linkedin.com/in/calvin-loh/",
    instagram: "https://www.instagram.com/calvindotsg/",
    strava: "https://www.strava.com/athletes/37641259/",
    telegram: "https://t.me/calvindotsg/",
    email: "mailto:hello@calvin.sg?subject=Let's%20get%20in%20touch!%20A%20quick%20question&body=Hey!%0A%0AJust%20popped%20by%20your%20website%20calvin.sg%20and%20had%20a%20quick%20question%3A%0A%0AName%3A%20%0AMessage%3A%0A%0ALooking%20forward%20to%20your%20response!%0A%0ACheers%2C"
};

export const CAREER: {
    job_name: string
    description: string
} = {
    job_name: "Software engineer",
    description: "Maximising value, minimising effort: Identifying bottlenecks with opportunities for automation"
}

export const ABOUT_ME: {
    description: string[]
} = {
    description: ["I seek practical experiences where opportunities for learning are actively up for grabs.", "If you tell me to wake up at 5.30am, I would say you're crazy. But if it's for cycling, count me in!"]
}

export const WELCOME: {
    description: string[]
} = {
    description: ["👋 Hi, I'm Calvin", "Software Engineer. Enthusiastic learner. Road cyclist."]
}

export const NOW: {
    description: string[]
} = {
    description: ["Hustle hustling at startup, probably cycling when you find me"]
}

export const COUNTRIES_VISITED: {
    countries_array: string[]
} = {
    countries_array: ["Australia", "China", "Hong Kong", "Indonesia", "Malaysia"]
}

export const FOOTER: {
    footer: string
} = {
    footer: "Built with ❤️, more love to Astro template by Gianmarco"
}

export const METADATA = {}

export const loaderAnimation = [".loader", {
    opacity: [1, 0], pointerEvents: "none"
}, {
    easing: "ease-out"
},];
