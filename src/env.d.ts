/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
    readonly POSTHOG_API_KEY: string;
}

declare module "*.riv" {
    const content: any;
    export default content;
}
