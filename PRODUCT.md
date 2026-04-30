# Product

## Register

brand

## Users

**Primary — Wellness-conscious Salt Lake City professionals (30–55).** Mid-career, mid-to-high disposable income. Reach for massage as recovery from real stress (long hours, poor sleep, training, parenting, post-injury). Not "spa day" tourists; people who know they need it and want it done well. Will book tonight or this weekend; expect same-day or next-day availability. Compare 3–5 SLC studios on Google before booking; decide based on review depth + ease of booking + gut feel about whether the studio is "for them" within a 60-second evaluation window.

**Secondary — Athletes and serious-recovery clients.** Marathoners, climbers, ski racers, gym-goers. Need deep tissue + sports massage. Repeat customers (weekly / bi-weekly). Care about therapist credentials and modality specialization more than ambiance.

**Tertiary — Couples and occasion bookings.** Anniversaries, gift cards, date nights. Lower frequency, higher per-visit spend. Care about presentation + ease of gifting + ambiance.

## Product Purpose

**Convert site visitors into Square bookings.** The homepage's job is to move someone from "researching SLC massage studios" into a confirmed booking inside the 60-second evaluation window most visitors give it. Secondary: gift card purchases (Square-native). Tertiary: phone bookings for clients who prefer voice.

**Strategic moat:**
- 7-day operation, 10am–10pm, same-day availability. Most SLC competitors close by 6pm and require 48-hour notice. This is the strongest competitive lever and should be visible above the fold on every page.
- 400+ verified Google 5-star reviews. Public-checkable social proof competitors cannot fake.
- Six modalities + add-ons (hot stones, cupping, infrared sauna) under one roof.

## Brand Personality

**Three words: quiet luxury, considered, restrained.**

**Reference family:** Aesop, Loro Piana retail, Aman Resorts. Sophistication-from-restraint. NOT candle-and-amber spa-template; NOT corporate-chain-pastel; NOT new-age-woo. The vibe is "someone who has been doing this craft a long time and doesn't need to oversell it."

**Tone:** confident without bragging. Specific over generic. Treats massage as a serious therapeutic craft, not a "tranquility journey." Says less to mean more.

| Voice example | |
|---|---|
| Good | "Restore. Reclaim. Rise again." (current hero. Keep.) |
| Good | "Highest-rated massage studio in Salt Lake County. Open every day, 10am–10pm." |
| Good | "Ashiatsu uses controlled foot pressure for deeper, broader strokes than hands can deliver. Ask for it specifically." |
| Bad | "Embark on your wellness journey..." |
| Bad | "Tranquil, transformative, trusted." (alliteration as substitute for substance) |
| Bad | "Our team of dedicated wellness professionals..." (chain-spa) |

## Anti-references

The site must explicitly NOT look like:

1. **Warm-amber candle "wellness journey" cliche.** Cormorant Garamond + amber/gold palette + candlelit imagery + "tranquility journey" copy. The current state of jmassageslc.com falls fully into this category; the visual reset must escape it.
2. **Massage Envy / chain-spa corporate.** Soft pastels + bland sans-serif + "membership" framing + corporate-stock photography. The volume-spa default.
3. **Goop / new-age wellness woo.** Crystals, chakras, "energy alignment" language, script fonts, ethereal photography. The aspirational-mystical lane.
4. **Aspirational-stock spa photography.** Oil drops on backs, hands kneading shoulders from behind, candle close-ups, lavender stems, towel-clad-from-behind women. Real photos of YOUR therapists in YOUR rooms doing actual work always beat the Getty Images spa archive.

## Design Principles

1. **Quiet over loud.** A premium massage studio doesn't need to shout. Restraint reads as confidence; volume reads as compensation. When in doubt, cut decoration, increase whitespace, simplify language.

2. **Real over aspirational.** Real photos of your specific therapists, your specific rooms, your specific clients (with permission). Never stock spa imagery. The category is saturated with stock; the differentiation is having actual identity.

3. **Craft, not journey.** Massage is a therapeutic craft practiced by trained professionals. Treat it that way in copy. Lead with what each modality *does* (Ashiatsu = broader/deeper strokes via foot pressure) not what it *feels like* ("transcendent journey"). Wellness-conscious adults respond to specificity, not adjectives.

4. **Same-day is the moat.** Most SLC competitors close at 6pm and require advance booking. J Massage opens 7 days, 10am–10pm, with same-day availability. That single fact converts. It belongs above the fold on every page, not buried in the footer.

5. **Booking friction is enemy #1.** Square is the booking system. Embed inline; don't link out. Every domain handoff costs 10–30% of conversion intent. The user who wants a massage tonight should be able to book in 3 clicks or fewer.

## Accessibility & Inclusion

**Target:** WCAG 2.2 AA.

**Already established (in current code):**
- `prefers-reduced-motion` is respected for the count-up animation (after the counter-placeholder fix).
- IntersectionObserver-driven reveals don't block content.

**Action items for upcoming impeccable steps:**
- Verify color contrast across the new palette during `/impeccable colorize`.
- Floor uppercase eyebrow text at 11px (current site has tracked-uppercase below threshold in places).
- Confirm Square widget is keyboard-accessible, or pre-warn users about the external context handoff if the widget stays linked rather than embedded.
- Verify alt text on all photography (current hero has none visible).
- Add structured data (`LocalBusiness`, `OpeningHoursSpecification`, `AggregateRating` JSON-LD schema). High-impact for local SEO and assistive tech.

**Known user accommodations declared:** none at this stage.
