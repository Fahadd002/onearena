/// <reference types="vite/client" />

declare module "*.css?url" {
  const href: string;
  export default href;
}

declare module "*.css" {
  const content: string;
  export default content;
}
