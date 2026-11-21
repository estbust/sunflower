/**
 * Sunflower Preschool - Image Optimization Script (v17.86 Hotfix)
 *
 * Compresses and resizes brand logos strictly from Paola's approved source assets
 * located in public/assets/images/ ("Where Little Minds Bloom." with brown center).
 *
 * Targets:
 * - sunflower-logo.webp:      < 25 KB (width 400px, quality 85, effort 6)
 * - sunflower-vertical.webp:  < 25 KB (width 220px, quality 82, effort 6)
 * - sunflower-favicon.webp:   < 15 KB (width 270px, quality 80, effort 6, smartSubsample)
 * - sunflower-favicon.png:    < 10 KB (96x96 px, png palette, quality 85, compression 9)
 *
 * Keeps original high-res sunflower-logo.png and sunflower-vertical.png intact.
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
  console.log('🌻 Sunflower Preschool - Image Optimization Pipeline (v17.86 Hotfix)');
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

  // 1. Paola Approved Core Brand Assets in public/assets/images/
  console.log('\n[1/5] Optimizing Paola Approved Brand Assets (public/assets/images/)...');

  // Ensure high-resolution master backup of favicon exists for idempotency
  const favMasterPath = path.join(IMAGES_DIR, 'sunflower-favicon-original.png');
  const favPngPath = path.join(IMAGES_DIR, 'sunflower-favicon.png');
  if (!fs.existsSync(favMasterPath) && fs.existsSync(favPngPath)) {
    const stat = fs.statSync(favPngPath);
    if (stat.size > 50000) {
      fs.copyFileSync(favPngPath, favMasterPath);
    }
  }

  // 1a. sunflower-logo.webp (from high-res sunflower-logo.png: 2170x725)
  {
    const srcPng = path.join(IMAGES_DIR, 'sunflower-logo.png');
    const outWebp = path.join(IMAGES_DIR, 'sunflower-logo.webp');
    if (fs.existsSync(srcPng)) {
      const origStat = fs.statSync(srcPng);
      const buf = await sharp(srcPng)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 85, effort: 6 })
        .toBuffer();
      fs.writeFileSync(outWebp, buf);
      const meta = await sharp(buf).metadata();
      record('Approved Logo', 'sunflower-logo.webp', origStat.size, buf.length, 25 * 1024, meta);
    } else {
      console.error('  ❌ Missing source image: public/assets/images/sunflower-logo.png');
    }
  }

  // 1b. sunflower-vertical.webp (from high-res sunflower-vertical.png: 1086x1448)
  {
    const srcPng = path.join(IMAGES_DIR, 'sunflower-vertical.png');
    const outWebp = path.join(IMAGES_DIR, 'sunflower-vertical.webp');
    if (fs.existsSync(srcPng)) {
      const origStat = fs.statSync(srcPng);
      const buf = await sharp(srcPng)
        .resize({ width: 220, withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toBuffer();
      fs.writeFileSync(outWebp, buf);
      const meta = await sharp(buf).metadata();
      record('Approved Logo', 'sunflower-vertical.webp', origStat.size, buf.length, 25 * 1024, meta);
    } else {
      console.error('  ❌ Missing source image: public/assets/images/sunflower-vertical.png');
    }
  }

  // Source for favicon & prefooter isotipo (read from master if available)
  const favSource = fs.existsSync(favMasterPath) ? favMasterPath : favPngPath;

  // 1c. sunflower-favicon.webp for Pre-footer Isotipo ("COME SAY HELLO")
  // Display size is 135x135 -> 2x retina width 270px, budget < 15 KB
  {
    const outWebp = path.join(IMAGES_DIR, 'sunflower-favicon.webp');
    if (fs.existsSync(favSource)) {
      const origStat = fs.statSync(favSource);
      const buf = await sharp(favSource)
        .resize({ width: 270, height: 270, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80, effort: 6, smartSubsample: true, alphaQuality: 80 })
        .toBuffer();
      fs.writeFileSync(outWebp, buf);
      const meta = await sharp(buf).metadata();
      record('Approved Isotype', 'sunflower-favicon.webp (270x270)', origStat.size, buf.length, 15 * 1024, meta);
    } else {
      console.error('  ❌ Missing source image for sunflower-favicon.webp');
    }
  }

  // 1d. sunflower-favicon.png (96x96 PNG favicon < 10 KB)
  {
    if (fs.existsSync(favSource)) {
      const origStat = fs.statSync(favSource);
      const buf = await sharp(favSource)
        .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ palette: true, quality: 85, compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(favPngPath, buf);
      const meta = await sharp(buf).metadata();
      record('Approved Favicon', 'sunflower-favicon.png (96x96)', origStat.size, buf.length, 10 * 1024, meta);
    } else {
      console.error('  ❌ Missing source image for sunflower-favicon.png');
    }
  }

  // 2. Below-the-fold Campus Banner (building-banner.webp)
  console.log('\n[2/5] Optimizing Campus Banner & Leadership Photos...');
  {
    const bannerPath = path.join(IMG_DIR, 'building-banner.webp');
    if (fs.existsSync(bannerPath)) {
      const origStat = fs.statSync(bannerPath);
      const buf = await sharp(bannerPath)
        .resize({ width: 900, withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toBuffer();
      fs.writeFileSync(bannerPath, buf);
      const meta = await sharp(buf).metadata();
      record('Banner', 'building-banner.webp', origStat.size, buf.length, 65 * 1024, meta);
    }
  }

  // 2b. Paola CEO Profile
  {
    const paolaSrc = path.join(IMG_DIR, 'paola-ceo.jpeg');
    const paolaOut = path.join(IMG_DIR, 'paola-ceo.webp');
    if (fs.existsSync(paolaSrc)) {
      const origStat = fs.existsSync(paolaOut) ? fs.statSync(paolaOut) : fs.statSync(paolaSrc);
      const buf = await sharp(paolaSrc)
        .resize({ height: 700, withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toBuffer();
      fs.writeFileSync(paolaOut, buf);
      const meta = await sharp(buf).metadata();
      record('Leadership', 'paola-ceo.webp', origStat.size, buf.length, 65 * 1024, meta);
    }
  }

  // 3. Halloween Events Carousel Photos (converting JPGs to WebP < 65 KB each)
  console.log('\n[3/5] Optimizing Events Halloween Photos to WebP...');
  for (let i = 1; i <= 7; i++) {
    const jpgFile = path.join(EVENTS_DIR, `halloween-${i}.jpg`);
    const webpFile = path.join(EVENTS_DIR, `halloween-${i}.webp`);
    if (fs.existsSync(jpgFile)) {
      const origStat = fs.statSync(jpgFile);
      const meta = await sharp(jpgFile).metadata();
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

  // 4. Marquee & Gallery Photos (real-1.webp to real-22.webp)
  console.log('\n[4/5] Optimizing Real Classroom / Marquee Photos (real-*.webp)...');
  for (let i = 1; i <= 22; i++) {
    const realFile = path.join(IMG_DIR, `real-${i}.webp`);
    if (fs.existsSync(realFile)) {
      const origStat = fs.statSync(realFile);
      const meta = await sharp(realFile).metadata();

      const isLandscape = meta.width > meta.height;
      const buf = await sharp(realFile)
        .resize({
          width: isLandscape ? 560 : undefined,
          height: !isLandscape ? 500 : undefined,
          withoutEnlargement: true
        })
        .webp({ quality: 75, effort: 6 })
        .toBuffer();

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
