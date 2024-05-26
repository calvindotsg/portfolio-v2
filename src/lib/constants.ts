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
];

export const CAREER: {
    company: string
    company_url: string
    description: string[]
    end_date: string
    job_name: string
    start_date: string
    emoji: string
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
        start_date: "Aug 2023",
        emoji: "🔧"
    },
    {
        company: "NCS PTE LTD",
        company_url: "https://www.ncs.co",
        description: [
            "Resolved production issues in a full-stack web application by 90%.",
            "First point of contact with end users to communicate and resolve pain points with offshore developers."
        ],
        end_date: "Aug 2023",
        job_name: "Business systems analyst",
        start_date: "Jun 2022",
        emoji: "🔎"
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

export const FOOTER: {
    footer: string
} = {
    footer: "Built with ❤️, more love to Astro template by Gianmarco"
}

export const METADATA: {
    title: string
    description: string
    site_url: string
    name: string
    image_url: string
    address_locality: string
    address_country: string
    email_obfuscated: string
} = {
    title: "Calvin - Software engineer | Enthusiastic learner | Road Cyclist",
    description: "Hustle hustling at startup, probably cycling when you find me",
    site_url: "https://calvin.sg/",
    name: "Calvin",
    image_url: "https://calvin.sg/preview.jpg",
    address_locality: "Singapore",
    address_country: "SG",
    email_obfuscated: "hello[at]calvin.sg"
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
