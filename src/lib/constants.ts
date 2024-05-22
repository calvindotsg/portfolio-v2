export const LINKS: {
    link_name: string
    link: string
    logo: string
}[] = [
    {
        link_name: "Github",
        link: "https://github.com/calvindotsg/",
        logo: "fa6-brands:github"
    },
    {
        link_name: "LinkedIn",
        link: "https://www.linkedin.com/in/calvin-loh/",
        logo: "fa6-brands:linkedin"
    },
    {
        link_name: "Instagram",
        link: "https://www.instagram.com/calvindotsg/",
        logo: "fa6-brands:instagram"
    },
    {
        link_name: "Strava",
        link: "https://www.strava.com/athletes/37641259/",
        logo: "fa6-brands:strava"
    },
    {
        link_name: "Telegram",
        link: "https://t.me/calvindotsg/",
        logo: "fa6-brands:telegram"
    },
    {
        link_name: "Email",
        link: "mailto:hello@calvin.sg?subject=Let's%20get%20in%20touch!%20A%20quick%20question&body=Hey!%0A%0AJust%20popped%20by%20your%20website%20calvin.sg%20and%20had%20a%20quick%20question%3A%0A%0AName%3A%20%0AMessage%3A%0A%0ALooking%20forward%20to%20your%20response!%0A%0ACheers%2C",
        logo: "fa6-solid:envelope"
    },
];

export const CAREER_NOW: {
    job_name: string
    description: string
    company: string
    company_url: string
    start_date: string
}[] = [
    {
        job_name: "Software engineer",
        description: "Maximising value, minimising effort: Identifying bottlenecks with opportunities for automation",
        company: "heymax.ai",
        company_url: "https://www.heymax.ai",
        start_date: "Aug 2023"
    }
]

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
