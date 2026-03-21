# J Massage SLC — Website

## ✅ Setup Checklist (Complete These 4 Steps)

---

### Step 1 — Get Your Square Booking Embed URL

1. Log into **squareup.com/dashboard**
2. Go to **Appointments → Online Booking → Share & Embed**
3. Click **"Embed on your website"**
4. Copy the iframe `src` URL (looks like `https://app.squareup.com/appointments/buyer/widget/XXXXX/LOCATION-ID`)
5. Open `index.html`, find this line:
   ```
   src="https://squareup.com/appointments/buyer/widget/jmassageslc/LOCATION_ID"
   ```
6. Replace it with your real embed URL
7. Save the file ✓

---

### Step 2 — Get Your Square Gift Card URL

1. In Square Dashboard → **Online Store → Gift Cards**
2. Enable eGift Cards if not already active
3. Copy your gift card purchase URL (looks like `https://squareup.com/gift-cards/YOUR-BUSINESS-ID`)
4. Open `index.html`, find:
   ```
   href="https://squareup.com/gift-cards/jmassageslc"
   ```
5. Replace with your real gift card URL (appears twice — in the section and in `js/main.js`)
6. Save ✓

---

### Step 3 (Optional) — Enable Live Google Reviews

1. Go to **console.cloud.google.com**
2. Create or select a project
3. Click **Enable APIs** → search **"Places API"** → Enable it
4. Go to **Credentials** → **Create API Key**
5. Restrict it to `jmassageslc.com` for security
6. Open `js/main.js` and paste your key:
   ```js
   const GOOGLE_PLACES_API_KEY = 'YOUR_KEY_HERE';
   ```
7. Find your **Place ID** from your Google Business Profile URL or at:
   https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
8. Paste it:
   ```js
   const GOOGLE_PLACE_ID = 'YOUR_PLACE_ID_HERE';
   ```
9. Save ✓

*If you skip this step, the site will show 4 pre-written 5-star reviews.*

---

### Step 4 — Push to GitHub & Deploy on Cloudflare Pages

#### A. Push to GitHub (first time only)

Open **Command Prompt** (Windows key → type `cmd` → Enter) and run:

```
cd "C:\Users\goho2\OneDrive\Desktop\jmassage-website"
git init
git add .
git commit -m "Launch J Massage SLC website"
git remote add origin https://github.com/misterho1/jmassage-website.git
git branch -M main
git push -u origin main
```

*If prompted, log in with your GitHub username `misterho1` and password/token.*

#### B. Connect to Cloudflare Pages

1. Go to **dash.cloudflare.com**
2. Click **Pages** → **Create a project**
3. Click **Connect to Git** → authorize GitHub → select `jmassage-website`
4. Build settings:
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/` (root)
5. Click **Save and Deploy**
6. Once deployed, go to **Custom Domains** → add `jmassageslc.com`
7. Cloudflare will auto-configure DNS (since your domain is already on Cloudflare) ✓

#### C. For future updates

After any edits, run:
```
git add .
git commit -m "Update website"
git push
```
Cloudflare Pages will auto-redeploy in ~30 seconds.

---

## 📸 Replacing Placeholder Photos

The site currently uses Unsplash stock photos. To use your own:

1. Go to `index.html`
2. Find `<img src="https://images.unsplash.com/...`
3. Replace the URL with your photo path (e.g., `images/studio.jpg`)
4. Put your photos in the `images/` folder

---

## 🔍 SEO Notes

The site already includes:
- ✅ Title and meta description targeting "massage Salt Lake City"
- ✅ LocalBusiness + MassageTherapist JSON-LD schema
- ✅ FAQ schema for Google featured snippets
- ✅ Open Graph tags for social sharing
- ✅ sitemap.xml and robots.txt
- ✅ Mobile-first responsive design
- ✅ Fast loading (no heavy frameworks)

**After launch, also:**
- Submit sitemap to Google Search Console: search.google.com/search-console
- Ensure your Google Business Profile links to the new site
- Ask happy clients to leave Google reviews (helps ranking)

---

## 📁 File Structure

```
jmassage-website/
├── index.html          ← Main website file
├── css/
│   └── styles.css      ← All styles
├── js/
│   └── main.js         ← All interactivity
├── sitemap.xml         ← For Google indexing
├── robots.txt          ← For search crawlers
└── README.md           ← This file
```

---

## 📞 Questions?

Call: (801) 288-1118
