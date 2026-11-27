import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pagesPath = process.env.PAGES_BASE_PATH ?? '/Puritech-Botswana-/';
const base = pagesPath.endsWith('/') ? pagesPath : pagesPath + '/';

export default defineConfig({ plugins: [react()], base });
