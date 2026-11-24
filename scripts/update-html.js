/**
 * Sunflower Preschool - HTML Updater (v17.87 Cache-Busting)
 *
 * Sincroniza la versión de cache-busting a ?v=17.87 en los 9 archivos HTML:
 * - Navbar Header Logo:   /assets/images/sunflower-logo.webp?v=17.87 (260x87)
 * - Pre-Footer Isotype:   /assets/images/sunflower-favicon.webp?v=17.87 (135x135)
 * - Footer Brand Logo:    /assets/images/sunflower-vertical.webp?v=17.87 (105x140)
 * - Favicon & Apple Icon: /assets/images/sunflower-favicon.png?v=17.87
 * - Global cache-buster:  ?v=17.87 across all 9 HTML files
 * - Zero deprecated references to Horizontal / Vertical / ISotipo from assets/img
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const files = [
  'index.html',
  'about/index.html',
  'contact/index.html',
  'enrollment/index.html',
  'privacy/index.html',
  'programs/index.html',
  'programs/preschool/index.html',
  'programs/school-age-care/index.html',
  'programs/toddler-care/index.html'
];

function updateHtmlFile(relPath) {
  const fullPath = path.join(PUBLIC_DIR, relPath);
  let html = fs.readFileSync(fullPath, 'utf8');

  // 1. Update cache buster to ?v=17.87 across all assets
  html = html.replace(/\?v=17\.\d+/g, '?v=17.87');

  // 2. Navbar Brand Header Logo -> Approved WebP Logo
  html = html.replace(
    /<img\s+[^>]*class=["'][^"']*brand-logo-header[^"']*["'][^>]*>/gi,
    '<img src="/assets/images/sunflower-logo.webp?v=17.87" alt="Sunflower Preschool" width="260" height="87" class="brand-logo-header" loading="eager" fetchpriority="high">'
  );

  // 3. Prefooter Isotipo -> Approved Sunflower WebP ("COME SAY HELLO")
  // Only present in 8 pages (not in privacy/index.html)
  html = html.replace(
    /<img\s+[^>]*class=["'][^"']*prefooter-isotipo-img[^"']*["'][^>]*>/gi,
    '<img src="/assets/images/sunflower-favicon.webp?v=17.87" alt="Sunflower Preschool" width="135" height="135" class="prefooter-isotipo-img" loading="lazy" decoding="async">'
  );

  // 4. Footer Logo -> Approved Vertical WebP Logo
  html = html.replace(
    /<img\s+[^>]*class=["'][^"']*brand-logo-footer[^"']*["'][^>]*>/gi,
    '<img src="/assets/images/sunflower-vertical.webp?v=17.87" alt="Sunflower Preschool" width="105" height="140" class="brand-logo-footer" loading="lazy" decoding="async">'
  );

  // 5. Favicons in <head>
  html = html.replace(
    /<link\s+rel=["']icon["'][^>]*>/gi,
    '<link rel="icon" type="image/png" href="/assets/images/sunflower-favicon.png?v=17.87">'
  );
  html = html.replace(
    /<link\s+rel=["']apple-touch-icon["'][^>]*>/gi,
    '<link rel="apple-touch-icon" href="/assets/images/sunflower-favicon.png?v=17.87">'
  );

  // 6. Double-check clean up of any lingering deprecated logo references
  html = html.replace(/\/assets\/img\/Horizontal%20Sunflower%20Preschool%20logo\.(?:webp|png)\?v=17\.\d+/g, '/assets/images/sunflower-logo.webp?v=17.87');
  html = html.replace(/\/assets\/img\/Sunflower%20Preschool%20vertical%20logo\.(?:webp|png)\?v=17\.\d+/g, '/assets/images/sunflower-vertical.webp?v=17.87');
  html = html.replace(/\/assets\/img\/ISotipo\.(?:webp|png)\?v=17\.\d+/g, '/assets/images/sunflower-favicon.webp?v=17.87');

  fs.writeFileSync(fullPath, html, 'utf8');
  console.log(`✅ Updated: public/${relPath}`);
}

files.forEach(f => updateHtmlFile(f));
console.log('\nAll 9 HTML files updated successfully to v17.87.');
