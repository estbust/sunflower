/**
 * Sunflower Preschool - HTML Updater (v17.85)
 *
 * Applies:
 * 1. Asynchronous non-blocking Google Fonts with preload & noscript
 * 2. WebP logos (Horizontal Sunflower Preschool logo.webp, Sunflower Preschool vertical logo.webp, ISotipo.webp)
 * 3. WebP events photos (halloween-*.webp)
 * 4. Explicit width/height matching actual dimensions on ALL <img> tags
 * 5. loading="eager" & fetchpriority="high" strictly for above-the-fold header logo and hero image
 * 6. loading="lazy" decoding="async" on all below-the-fold images
 * 7. Global cache-busting to ?v=17.85 across all assets
 * 8. Ensures og:image and twitter:image retain https://sunflowerpreschoolak.com/assets/img/building.jpeg
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

// Exact image dimensions dictionary
const IMG_DIMS = {
  'Horizontal Sunflower Preschool logo.webp': { w: 360, h: 203 },
  'Sunflower Preschool vertical logo.webp': { w: 220, h: 275 },
  'ISotipo.webp': { w: 240, h: 240 },
  'building-banner-desktop.webp': { w: 1280, h: 615 },
  'building-banner-mobile.webp': { w: 768, h: 369 },
  'building-banner.webp': { w: 900, h: 433 },
  'paola-ceo.webp': { w: 394, h: 700 },
  'meagan-admin.webp': { w: 800, h: 646 },
  'events/halloween-1.webp': { w: 374, h: 500 },
  'events/halloween-2.webp': { w: 500, h: 374 },
  'events/halloween-3.webp': { w: 500, h: 374 },
  'events/halloween-4.webp': { w: 375, h: 500 },
  'events/halloween-5.webp': { w: 373, h: 500 },
  'events/halloween-6.webp': { w: 371, h: 500 },
  'events/halloween-7.webp': { w: 500, h: 374 },
  'real-1.webp': { w: 560, h: 420 },
  'real-2.webp': { w: 560, h: 315 },
  'real-3.webp': { w: 560, h: 420 },
  'real-4.webp': { w: 375, h: 500 },
  'real-5.webp': { w: 375, h: 500 },
  'real-6.webp': { w: 375, h: 500 },
  'real-7.webp': { w: 429, h: 500 },
  'real-8.webp': { w: 378, h: 500 },
  'real-9.webp': { w: 375, h: 500 },
  'real-10.webp': { w: 560, h: 420 },
  'real-11.webp': { w: 500, h: 500 },
  'real-12.webp': { w: 375, h: 500 },
  'real-13.webp': { w: 381, h: 500 },
  'real-14.webp': { w: 375, h: 500 },
  'real-15.webp': { w: 281, h: 500 },
  'real-16.webp': { w: 375, h: 500 },
  'real-17.webp': { w: 500, h: 500 },
  'real-18.webp': { w: 500, h: 500 },
  'real-19.webp': { w: 375, h: 500 },
  'real-20.webp': { w: 375, h: 500 },
  'real-21.webp': { w: 560, h: 420 },
  'real-22.webp': { w: 560, h: 420 }
};

function updateHtmlFile(relPath) {
  const fullPath = path.join(PUBLIC_DIR, relPath);
  let html = fs.readFileSync(fullPath, 'utf8');

  // 1. Update cache buster to ?v=17.85
  html = html.replace(/\?v=17\.\d+/g, '?v=17.85');

  // 2. Google Fonts: Async non-blocking with preload + noscript
  const fontRegex = /(<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.googleapis\.com["']>[\s\S]*?<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.gstatic\.com["']\s+crossorigin>[\s\S]*?)(<link\s+href=["'](https:\/\/fonts\.googleapis\.com\/css2\?[^"']+)["']\s+rel=["']stylesheet["']>)/i;
  
  html = html.replace(fontRegex, (match, preconnects, oldLink, fontUrl) => {
    return `${preconnects.trim()}
  <link rel="preload" href="${fontUrl}" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="${fontUrl}"></noscript>`;
  });

  // 3. Navbar Brand Header Logo -> WebP
  html = html.replace(
    /<img\s+src=["'](?:\/assets\/images\/sunflower-logo\.png|\/assets\/img\/Horizontal%20Sunflower%20Preschool%20logo\.png)[^"']*["'][^>]*class=["']brand-logo-header["'][^>]*>/gi,
    '<img src="/assets/img/Horizontal%20Sunflower%20Preschool%20logo.webp?v=17.85" alt="Sunflower Preschool" width="360" height="203" class="brand-logo-header" loading="eager" fetchpriority="high">'
  );
  // Also match reversed attribute order
  html = html.replace(
    /<img\s+src=["'][^"']*(?:sunflower-logo\.png|Horizontal[^"']*\.png)[^"']*["']\s+alt=["']Sunflower Preschool["']\s+width=["']\d+["']\s+height=["']\d+["']\s+class=["']brand-logo-header["'][^>]*>/gi,
    '<img src="/assets/img/Horizontal%20Sunflower%20Preschool%20logo.webp?v=17.85" alt="Sunflower Preschool" width="360" height="203" class="brand-logo-header" loading="eager" fetchpriority="high">'
  );

  // 4. Prefooter Isotipo -> ISotipo.webp
  html = html.replace(
    /<img\s+src=["'][^"']*(?:sunflower-favicon\.png|ISotipo\.png)[^"']*["']\s+alt=["']Sunflower Preschool["']\s+width=["']\d+["']\s+height=["']\d+["']\s+class=["']prefooter-isotipo-img["'][^>]*>/gi,
    '<img src="/assets/img/ISotipo.webp?v=17.85" alt="Sunflower Preschool" width="240" height="240" class="prefooter-isotipo-img" loading="lazy" decoding="async">'
  );

  // 5. Footer Logo -> Sunflower Preschool vertical logo.webp
  html = html.replace(
    /<img\s+src=["'][^"']*(?:sunflower-vertical\.png|Sunflower%20Preschool%20vertical%20logo\.png)[^"']*["']\s+alt=["']Sunflower Preschool["']\s+width=["']\d+["']\s+height=["']\d+["']\s+class=["']brand-logo-footer["'][^>]*>/gi,
    '<img src="/assets/img/Sunflower%20Preschool%20vertical%20logo.webp?v=17.85" alt="Sunflower Preschool" width="220" height="275" class="brand-logo-footer" loading="lazy" decoding="async">'
  );

  // 6. Specific updates for index.html
  if (relPath === 'index.html') {
    // 6. Hero image in index.html: exact dimensions and decoding="async"
    html = html.replace(
      /<img\s+src=["']assets\/img\/building-banner-desktop\.webp[^"']*["']\s+srcset=["']([^"']*)["']\s+sizes=["']([^"']*)["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']eager["']\s+fetchpriority=["']high["']\s+class=["']hero-classroom-img["']\s+style=["']([^"']*)["']\s*\/?>/gi,
      `<img\n              src="assets/img/building-banner-desktop.webp?v=17.85"\n              srcset="$1"\n              sizes="$2"\n              alt="$3"\n              width="1280"\n              height="615"\n              loading="eager"\n              fetchpriority="high"\n              decoding="async"\n              class="hero-classroom-img"\n              style="$4"\n            />`
    );

    // 6a. Halloween events carousel: replace jpg with webp & explicit dimensions
    for (let i = 1; i <= 7; i++) {
      const dim = IMG_DIMS[`events/halloween-${i}.webp`];
      const jpgRegex = new RegExp(`<img\\s+src=["']assets/img/events/halloween-${i}\\.jpg[^"']*["']\\s+alt=["']([^"']*)["'][^>]*class=["']event-photo-img["'][^>]*>`, 'gi');
      html = html.replace(jpgRegex, `<img src="assets/img/events/halloween-${i}.webp?v=17.85" alt="$1" width="${dim.w}" height="${dim.h}" loading="lazy" decoding="async" class="event-photo-img" />`);
    }

    // 6b. Marquee Photos (Set 1 & Set 2): update width/height and add decoding="async"
    for (let i = 1; i <= 22; i++) {
      const dim = IMG_DIMS[`real-${i}.webp`];
      // Set 1 (regular)
      const set1Regex = new RegExp(`<img\\s+src=["']assets/img/real-${i}\\.webp[^"']*["']\\s+alt=["']([^"']*)["']\\s+width=["']\\d+["']\\s+height=["']\\d+["']\\s+loading=["']lazy["']\\s+class=["']marquee-photo["']\\s*\\/?>`, 'g');
      html = html.replace(set1Regex, `<img src="assets/img/real-${i}.webp?v=17.85" alt="$1" width="${dim.w}" height="${dim.h}" loading="lazy" decoding="async" class="marquee-photo" />`);

      // Set 2 (aria-hidden="true")
      const set2Regex = new RegExp(`<img\\s+src=["']assets/img/real-${i}\\.webp[^"']*["']\\s+alt=["']([^"']*)["']\\s+width=["']\\d+["']\\s+height=["']\\d+["']\\s+loading=["']lazy["']\\s+class=["']marquee-photo["']\\s+aria-hidden=["']true["']\\s*\\/?>`, 'g');
      html = html.replace(set2Regex, `<img src="assets/img/real-${i}.webp?v=17.85" alt="$1" width="${dim.w}" height="${dim.h}" loading="lazy" decoding="async" class="marquee-photo" aria-hidden="true" />`);
    }

    // 6c. Campus banner in index.html (line 781)
    const campusBannerDim = IMG_DIMS['building-banner.webp'];
    html = html.replace(
      /<img\s+src=["']assets\/img\/building-banner\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']campus-banner-img["']\s*\/?>/gi,
      `<img src="assets/img/building-banner.webp?v=17.85" alt="$1" width="${campusBannerDim.w}" height="${campusBannerDim.h}" loading="lazy" decoding="async" class="campus-banner-img" />`
    );

    // 6d. Program highlight cards in index.html (real-1, real-2, real-3)
    html = html.replace(
      /<img\s+src=["']assets\/img\/real-1\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']program-card-img["']\s*\/?>/gi,
      `<img src="assets/img/real-1.webp?v=17.85" alt="$1" width="400" height="220" loading="lazy" decoding="async" class="program-card-img" />`
    );
    html = html.replace(
      /<img\s+src=["']assets\/img\/real-2\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']program-card-img["']\s*\/?>/gi,
      `<img src="assets/img/real-2.webp?v=17.85" alt="$1" width="400" height="220" loading="lazy" decoding="async" class="program-card-img" />`
    );
    html = html.replace(
      /<img\s+src=["']assets\/img\/real-3\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']program-card-img["']\s*\/?>/gi,
      `<img src="assets/img/real-3.webp?v=17.85" alt="$1" width="400" height="220" loading="lazy" decoding="async" class="program-card-img" />`
    );
  }

  // 7. Specific updates for about/index.html (paola-ceo.webp and meagan-admin.webp)
  if (relPath === 'about/index.html') {
    const paolaDim = IMG_DIMS['paola-ceo.webp'];
    html = html.replace(
      /<img\s+src=["']\.\.\/assets\/img\/paola-ceo\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']leadership-img leadership-img-paola["']\s*\/?>/gi,
      `<img src="../assets/img/paola-ceo.webp?v=17.85" alt="$1" width="${paolaDim.w}" height="${paolaDim.h}" loading="lazy" decoding="async" class="leadership-img leadership-img-paola" />`
    );
    const meaganDim = IMG_DIMS['meagan-admin.webp'];
    html = html.replace(
      /<img\s+src=["']\.\.\/assets\/img\/meagan-admin\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']leadership-img leadership-img-meagan["']\s*\/?>/gi,
      `<img src="../assets/img/meagan-admin.webp?v=17.85" alt="$1" width="${meaganDim.w}" height="${meaganDim.h}" loading="lazy" decoding="async" class="leadership-img leadership-img-meagan" />`
    );
  }

  // 8. Specific updates for programs/index.html (real-1, real-2, real-3)
  if (relPath === 'programs/index.html') {
    html = html.replace(
      /<img\s+src=["']\.\.\/assets\/img\/real-1\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']program-card-img["']\s*\/?>/gi,
      `<img src="../assets/img/real-1.webp?v=17.85" alt="$1" width="400" height="220" loading="lazy" decoding="async" class="program-card-img" />`
    );
    html = html.replace(
      /<img\s+src=["']\.\.\/assets\/img\/real-2\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']program-card-img["']\s*\/?>/gi,
      `<img src="../assets/img/real-2.webp?v=17.85" alt="$1" width="400" height="220" loading="lazy" decoding="async" class="program-card-img" />`
    );
    html = html.replace(
      /<img\s+src=["']\.\.\/assets\/img\/real-3\.webp[^"']*["']\s+alt=["']([^"']*)["']\s+width=["']\d+["']\s+height=["']\d+["']\s+loading=["']lazy["']\s+class=["']program-card-img["']\s*\/?>/gi,
      `<img src="../assets/img/real-3.webp?v=17.85" alt="$1" width="400" height="220" loading="lazy" decoding="async" class="program-card-img" />`
    );
  }

  fs.writeFileSync(fullPath, html, 'utf8');
  console.log(`✅ Updated: public/${relPath}`);
}

files.forEach(f => updateHtmlFile(f));
console.log('\nAll 9 HTML files updated successfully.');
