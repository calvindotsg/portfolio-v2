export const LINKS: {
    link: string
    logo: string
    name: string
}[] = [
    {
        link: "https://github.com/calvindotsg/",
        logo: "fa6-brands:github",
        name: "Github"
    },
    {
        link: "https://www.linkedin.com/in/calvin-loh/",
        logo: "fa6-brands:linkedin",
        name: "LinkedIn"
    },
    {
        link: "https://www.instagram.com/calvindotsg/",
        logo: "fa6-brands:instagram",
        name: "Instagram"
    },
    {
        link: "https://www.strava.com/athletes/37641259/",
        logo: "fa6-brands:strava",
        name: "Strava"
    },
    {
        link: "https://t.me/calvindotsg/",
        logo: "fa6-brands:telegram",
        name: "Telegram"
    },
    {
        link: "mailto:hello@calvin.sg?subject=Let's%20get%20in%20touch!%20A%20quick%20question&body=Hey!%0A%0AJust%20popped%20by%20your%20website%20calvin.sg%20and%20had%20a%20quick%20question%3A%0A%0AName%3A%20%0AMessage%3A%0A%0ALooking%20forward%20to%20your%20response!%0A%0ACheers%2C",
        logo: "fa6-solid:envelope",
        name: "Email"
    },
];

export const CAREER: {
    company: string
    company_url: string
    description: string[]
    end_date: string
    job_name: string
    start_date: string
}[] = [
    {
        company: "heymax.ai",
        company_url: "https://www.heymax.ai",
        description: [
            "Maximising value, minimising effort: Identifying bottlenecks with opportunities for automation.",
            "We grow by listening to why you love heymax along with your pain points."
        ],
        end_date: "Present",
        job_name: "Software engineer",
        start_date: "Aug 2023"
    },
    {
        company: "NCS PTE LTD",
        company_url: "https://www.ncs.co",
        description: [
            "Reduce production issues in a full-stack web application by 90%.",
            "First point of contact with end users to communicate and resolve pain points with offshore developers."
        ],
        end_date: "Aug 2023",
        job_name: "Software engineer",
        start_date: "Jun 2022"
    }
]

export const ABOUT_ME: {
    description: string[]
} = {
    description: [
        "I seek practical experiences where opportunities for learning are actively up for grabs.",
        "If you tell me to wake up at 5.30am, I would say you're crazy. But if it's for cycling, count me in!"
    ]
}

export const WELCOME: {
    description: string[]
} = {
    description: [
        "👋 Hi, I'm Calvin", "Software Engineer. Enthusiastic learner. Road cyclist."
    ]
}

export const NOW: {
    description: string[]
} = {
    description: [
        "Hustle hustling at startup, probably cycling when you find me"
    ]
}

export const COUNTRIES_VISITED: {
    countries_array: string[]
} = {
    countries_array: [
        "Australia",
        "China",
        "Hong Kong",
        "Indonesia",
        "Malaysia"
    ]
}

export const FOOTER: {
    footer: string
} = {
    footer: "© 2024 · Built with ❤️, more love to Astro template by Gianmarco"
}

export const SEO: {
    title: string
    description: string
} = {
    title: "Calvin - Software engineer | Cyclist",
    description: "Hustle hustling at startup, probably cycling when you find me"
}

export const COLOURS: {
    theme: "light" | "dark",
    background: string,
    accent: string,
    shadow: string,
    text: string
}[] = [
    {
        theme: "light",
        background: "#ffffff",
        accent: "#ffa6fc",
        shadow: "#904c77",
        text: "#0c1713"
    },
    {
        theme: "dark",
        background: "#0c1713",
        accent: "#ffa6fc",
        shadow: "#ff79da",
        text: "#ffffff"
    }
];

export const loaderAnimation = [".loader", {
    opacity: [1, 0], pointerEvents: "none"
}, {
    easing: "ease-out"
},];
