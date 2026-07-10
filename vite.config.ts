import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];

const isGithubPagesUserSite =
  repoName?.toLowerCase().endsWith('.github.io');

const base = process.env.GITHUB_ACTIONS
  ? isGithubPagesUserSite
    ? '/'
    : `/${repoName}/`
  : './';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
});

