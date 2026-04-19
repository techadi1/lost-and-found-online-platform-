import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Frontend Integrity Tests
 * These tests ensure the frontend structure is valid and production-ready.
 */

describe('Frontend Integrity Tests', () => {
  
  test('src/config.js should use relative API paths', async () => {
    const configPath = path.join(rootDir, 'src', 'config.js');
    const content = fs.readFileSync(configPath, 'utf8');
    
    expect(content).toContain("API_URL = '/api'");
    expect(content).not.toContain('localhost:5001');
  });

  test('All page components imported in App.jsx should exist', () => {
    const appJsxPath = path.join(rootDir, 'src', 'App.jsx');
    const content = fs.readFileSync(appJsxPath, 'utf8');
    
    // Extract imports like: import Home from './pages/Home';
    const importRegex = /import\s+(\w+)\s+from\s+'\.\/pages\/(\w+)'/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const pageName = match[2];
      const pagePath = path.join(rootDir, 'src', 'pages', `${pageName}.jsx`);
      const pageExists = fs.existsSync(pagePath);
      expect(pageExists).toBe(true);
    }
  });

  test('index.html should have a root div', () => {
    const indexPath = path.join(rootDir, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf8');
    expect(content).toContain('<div id="root"></div>');
  });

  test('Navbar should have Bennett Logo reference', () => {
    const navbarPath = path.join(rootDir, 'src', 'components', 'Navbar', 'Navbar.jsx');
    const content = fs.readFileSync(navbarPath, 'utf8');
    expect(content).toContain('alt="Bennett Logo"');
  });
});
