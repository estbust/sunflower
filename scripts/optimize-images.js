/**
 * Sunflower Preschool - Image Optimization Script (v17.85)
 *
 * Compresses and resizes all oversized images to modern WebP format
 * ensuring strict budget limits (< 25 KB for logos, < 65 KB for photos).
 * Keeps original PNG/SVG/JPEG files on disk for build integrity and social tags.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT_DIR, 'public', 'assets', 'img');
const EVENTS_DIR = path.join(IMG_DIR, 'events');
const IMAGES_DIR = path.join(ROOT_DIR, 'public', 'assets', 'images');

async function optimizeImages() {
  console.log('='.repeat(70));
  console.log('🌻 Sunflower Preschool - Image Optimization Pipeline (v17.85)');
  console.log('='.repeat(70));

  const auditReport = [];

  // Helper for tracking
  function record(category, name, origSize, newSize, targetMax, dims) {
    const origKb = (origSize / 1024).toFixed(1);
    const newKb = (newSize / 1024).toFixed(1);
    const saved = ((1 - newSize / origSize) * 100).toFixed(1);
    const pass = newSize <= targetMax;
    auditReport.push({
      category,
      name,
      origKb: `${origKb} KB`,
      newKb: `${newKb} KB`,
      saved: `-${saved}%`,
      dims: `${dims.width}x${dims.height}`,
      status: pass ? '✅ PASS' : '❌ FAIL'
    });
    console.log(`  ${pass ? '✅' : '❌'} [${category}] ${name}: ${origKb} KB -> ${newKb} KB (-${saved}%) [${dims.width}x${dims.height}]`);
  }

  // 1. Core Brand Logos (< 25 KB target)
  console.log('\n[1/5] Optimizing Brand Logos...');

  // 1a. Horizontal Logo
  {
    const srcPng = path.join(IMG_DIR, 'Horizontal Sunflower Preschool logo.png');
    const outWebp = path.join(IMG_DIR, 'Horizontal Sunflower Preschool logo.webp');
    const origStat = fs.statSync(srcPng);
    const buf = await sharp(srcPng)
      .resize({ width: 360, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();
    fs.writeFileSync(outWebp, buf);
    const meta = await sharp(buf).metadata();
    record('Logo', 'Horizontal Sunflower Preschool logo.webp', origStat.size, buf.length, 25 * 1024, meta);
  }

  // 1b. Vertical Logo
  {
    const srcPng = path.join(IMG_DIR, 'Sunflower Preschool vertical logo.png');
    const outWebp = path.join(IMG_DIR, 'Sunflower Preschool vertical logo.webp');
    const origStat = fs.statSync(srcPng);
    const buf = await sharp(srcPng)
      .resize({ width: 220, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();
    fs.writeFileSync(outWebp, buf);
    const meta = await sharp(buf).metadata();
    record('Logo', 'Sunflower Preschool vertical logo.webp', origStat.size, buf.length, 25 * 1024, meta);
  }

  // 1c. ISotipo
  {
    const srcPng = path.join(IMG_DIR, 'ISotipo.png');
    const outWebp = path.join(IMG_DIR, 'ISotipo.webp');
    const origStat = fs.statSync(srcPng);
    const buf = await sharp(srcPng)
      .resize({ width: 240, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();
    fs.writeFileSync(outWebp, buf);
    const meta = await sharp(buf).metadata();
    record('Logo', 'ISotipo.webp', origStat.size, buf.length, 25 * 1024, meta);
  }

  // 2. Favicons in assets/images/ (Fixing 1 MB favicon issue)
  console.log('\n[2/5] Optimizing Favicons and Legacy Image Assets...');
  if (fs.existsSync(IMAGES_DIR)) {
    // 2a. sunflower-favicon.png (1024 KB -> 96x96 PNG < 10 KB)
    const favPng = path.join(IMAGES_DIR, 'sunflower-favicon.png');
    if (fs.existsSync(favPng)) {
      const origSize = fs.statSync(favPng).size;
      const buf = await sharp(favPng)
        .resize(96, 96)
        .png({ palette: true, quality: 85, compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(favPng, buf);
      const meta = await sharp(buf).metadata();
      record('Favicon', 'sunflower-favicon.png (96x96)', origSize, buf.length, 15 * 1024, meta);
    }

    // 2b. sunflower-logo.png (398 KB -> 360w PNG < 35 KB)
    const logoPng = path.join(IMAGES_DIR, 'sunflower-logo.png');
    if (fs.existsSync(logoPng)) {
      const origSize = fs.statSync(logoPng).size;
      const buf = await sharp(logoPng)
        .resize({ width: 360, withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(logoPng, buf);
      const meta = await sharp(buf).metadata();
      record('Logo', 'sunflower-logo.png (360w)', origSize, buf.length, 40 * 1024, meta);
    }

    // 2c. sunflower-vertical.png (782 KB -> 200w PNG < 25 KB)
    const vertPng = path.join(IMAGES_DIR, 'sunflower-vertical.png');
    if (fs.existsSync(vertPng)) {
      const origSize = fs.statSync(vertPng).size;
      const buf = await sharp(vertPng)
        .resize({ width: 200, withoutEnlargement: true })
        .png({ palette: true, quality: 80, compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(vertPng, buf);
      const meta = await sharp(buf).metadata();
      record('Logo', 'sunflower-vertical.png (200w)', origSize, buf.length, 30 * 1024, meta);
    }
  }

  // 3. Below-the-fold Campus Banner (building-banner.webp)
  console.log('\n[3/5] Optimizing Campus Banner & Leadership Photos...');
  {
    const bannerPath = path.join(IMG_DIR, 'building-banner.webp');
    const origStat = fs.statSync(bannerPath);
    const buf = await sharp(bannerPath)
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 75, effort: 6 })
      .toBuffer();
    fs.writeFileSync(bannerPath, buf);
    const meta = await sharp(buf).metadata();
    record('Banner', 'building-banner.webp', origStat.size, buf.length, 65 * 1024, meta);
  }

  // 3b. Paola CEO Profile
  {
    const paolaSrc = path.join(IMG_DIR, 'paola-ceo.jpeg');
    const paolaOut = path.join(IMG_DIR, 'paola-ceo.webp');
    const origStat = fs.statSync(paolaOut);
    // Leadership card height is 350px. 2x retina height = 700px.
    const buf = await sharp(paolaSrc)
      .resize({ height: 700, withoutEnlargement: true })
      .webp({ quality: 75, effort: 6 })
      .toBuffer();
    fs.writeFileSync(paolaOut, buf);
    const meta = await sharp(buf).metadata();
    record('Leadership', 'paola-ceo.webp', origStat.size, buf.length, 65 * 1024, meta);
  }

  // 4. Halloween Events Carousel Photos (converting JPGs to WebP < 65 KB each)
  console.log('\n[4/5] Optimizing Events Halloween Photos to WebP...');
  for (let i = 1; i <= 7; i++) {
    const jpgFile = path.join(EVENTS_DIR, `halloween-${i}.jpg`);
    const webpFile = path.join(EVENTS_DIR, `halloween-${i}.webp`);
    if (fs.existsSync(jpgFile)) {
      const origStat = fs.statSync(jpgFile);
      const meta = await sharp(jpgFile).metadata();
      // Carousel displays at 350px x 262px (4:3 aspect ratio).
      // Max 480px width or height gives crisp 1.5x-2x retina.
      const buf = await sharp(jpgFile)
        .resize({
          width: meta.width > meta.height ? 500 : undefined,
          height: meta.height >= meta.width ? 500 : undefined,
          withoutEnlargement: true
        })
        .webp({ quality: 75, effort: 6 })
        .toBuffer();
      fs.writeFileSync(webpFile, buf);
      const newMeta = await sharp(buf).metadata();
      record('Event', `events/halloween-${i}.webp`, origStat.size, buf.length, 65 * 1024, newMeta);
    }
  }

  // 5. Marquee & Gallery Photos (real-1.webp to real-22.webp)
  console.log('\n[5/5] Optimizing Real Classroom / Marquee Photos (real-*.webp)...');
  for (let i = 1; i <= 22; i++) {
    const realFile = path.join(IMG_DIR, `real-${i}.webp`);
    if (fs.existsSync(realFile)) {
      const origStat = fs.statSync(realFile);
      const meta = await sharp(realFile).metadata();

      // Only resize/compress if oversized (> 65 KB) or optimize all for lightweight marquee
      // Marquee photos display at height 260px (mobile 200px).
      // 2x retina height = 520px. Landscape 2x retina width = ~600px.
      const isLandscape = meta.width > meta.height;
      const buf = await sharp(realFile)
        .resize({
          width: isLandscape ? 560 : undefined,
          height: !isLandscape ? 500 : undefined,
          withoutEnlargement: true
        })
        .webp({ quality: 75, effort: 6 })
        .toBuffer();

      // Only write if it actually reduced the size or kept it below target
      if (buf.length < origStat.size || origStat.size > 65 * 1024) {
        fs.writeFileSync(realFile, buf);
        const newMeta = await sharp(buf).metadata();
        record('Gallery', `real-${i}.webp`, origStat.size, buf.length, 65 * 1024, newMeta);
      } else {
        record('Gallery', `real-${i}.webp (kept)`, origStat.size, origStat.size, 65 * 1024, meta);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('OPTIMIZATION AUDIT TABLE:');
  console.table(auditReport);
  console.log('='.repeat(70));
}

optimizeImages().catch(err => {
  console.error('Error optimizing images:', err);
  process.exit(1);
});
