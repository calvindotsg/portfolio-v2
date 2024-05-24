/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly UMAMI_ID: string;
}

declare module "*.riv" {
  const content: any;
  export default content;
}
