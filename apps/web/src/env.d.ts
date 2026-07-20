/// <reference types="vite/client" />

declare module "*.yaml?raw" {
  const content: string;
  export default content;
}

declare module "*.jsonl?raw" {
  const content: string;
  export default content;
}
