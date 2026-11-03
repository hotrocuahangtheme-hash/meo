# Technical SEO, structured data, content quality, off-page and social/video search (2025–2026)

Research date: 2026-11-03. **[Snippet]** level throughout (search summaries; direct fetch blocked).

## 1. Structured data: fewer rich results, but markup still matters

### Takeaway
Google keeps pruning rich-result types. On 12 Jun 2025 it phased out seven types (Book Actions, Course Info, ClaimReview, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing), and Search Console reporting for six of them ended in Sep 2025. On 7 May 2026 it added a deprecation notice to the FAQ structured-data docs: FAQ rich results no longer show in Search (HowTo has been gone since Sep 2023). Unused markup causes no harm, and Google's AI-features guide still mentions structured data. So the right move is to stop building markup for vanished SERP features and to keep markup that feeds live features and entity understanding: Product/Offer/merchant listing, Organization, LocalBusiness, Article, BreadcrumbList, Review, Video, Event. The markup must match the visible content.

### Cited findings
- 12 Jun 2025 "Simplifying the search results page": seven types phased out; use outside Search unaffected; SC reporting removal for six types announced 8 Sep 2025 — [Google Search Central](https://developers.google.com/search/blog/2025/06/simplifying-search-results), [SER](https://seroundtable.com/google-drops-support-more-structured-data-39583.html), [PPC Land](https://ppc.land/google-deprecates-seven-structured-data-types-to-simplify-search-results/), [SEL](https://searchengineland.com/google-drops-reporting-on-several-structured-data-types-461744)
- FAQ rich results: deprecation notice added 7 May 2026, FAQ rich results no longer render; reporting/test-tool removal dates vary by source; FAQPage remains a valid schema.org type and leaving it in place is harmless — [SEJ](https://www.searchenginejournal.com/google-drops-faq-rich-results/574429/), [PPC Land](https://ppc.land/google-kills-faq-rich-results-what-seos-saw-coming-since-2019/), [jsonld.com](https://jsonld.com/google-faq-rich-results-deprecated/)

## 2. Core Web Vitals / page experience

### Takeaway
No verified change in 2026. The metrics are still LCP (good ≤ 2.5 s), INP (good ≤ 200 ms, replaced FID in Mar 2024) and CLS (good ≤ 0.1), measured at the 75th percentile of field data (CrUX). Some blogs claim a Mar 2026 INP threshold cut to 150 ms, but no primary source was found, so treat it as unverified. CWV is a minor ranking factor, but it directly affects conversion. That matters more now that each search sends fewer clicks.

### Cited findings
- Unchanged thresholds per most 2026 sources; 150 ms INP claim unverified — [Meta Digital](https://www.metadigital.co.nz/core-web-vitals-in-2026-what-they-measure-and-whats-actually-worth-fixing/), [eSEOspace](https://eseospace.com/blog/core-web-vitals-in-2026-what-changed-what-still-matters-and-how-to-pass/)

## 3. Content quality, AI content and spam enforcement

### Takeaway
Google's line has not moved: AI-assisted content is allowed, and content mass-produced mainly to rank is spam ("scaled content abuse"), whoever or whatever wrote it. Two things changed. First, enforcement: waves of manual actions for scaled content abuse since ~Jun 2025, with full deindexing in some cases. Second, documentation (1 Oct 2026): the generative-AI content guidance now pulls in rater-guideline language. Pages whose main content is almost entirely AI-generated with little added value can be rated lowest. AI content must be fact-checked by a human. Fake authors, AI headshots or invented credentials count as deception. Losing Google visibility also tends to drag down ChatGPT visibility (Glenn Gabe's "Mt. AI" case), because AI assistants ground on search indexes.

### Cited findings
- Oct 2026 update of Google's generative-AI content guidance with rater-guideline material; lowest rating for AI main content with little originality; manual fact-check required; fake author identities = deception — [SEJ Oct 2026](https://www.searchenginejournal.com/google-updates-search-quality-rater-guidelines/2026/10/), [Pravin Kumar](https://www.pravinkumar.co/blog/what-googles-october-ai-content-guidance-update-means-for-b2b-2026), [SEO Kreativ (Sep 2025 QRG)](https://www.seo-kreativ.de/en/blog/google-quality-raters-update_9-25/)
- Scaled content abuse manual actions in waves since ~3 Jun 2025, some full deindexing; AI use itself not the trigger — [Something Inc case study](https://somethinginc.com/blog/scaled-ai-content-manual-action-case-study/), [Originality.ai](https://originality.ai/can-google-detect-penalize-ai-content)
- "Mt. AI": a site hit by a Google manual action also tanked in ChatGPT at the same time; the counter-case "Surging in ChatGPT, dead in Google" exists too — [GSQI](https://www.gsqi.com/marketing-blog/surging-in-chatgpt-dead-in-google/), [SEO Kreativ](https://www.seo-kreativ.de/en/blog/ai-content-trap/)
- Back-button hijacking became a spam violation (enforced 15 Jun 2026); responsibility includes third-party ad scripts — see note 01

## 4. Publisher / news surfaces

### Takeaway
Preferred Sources lets users star outlets so they appear more in Top Stories (and affect Discover). It is now available in every language Google Search supports (30 Apr 2026), so Vietnamese publishers and brand blogs can ask readers to add them. The Feb 2026 Discover core update favours locally relevant sites in the user's country and penalises clickbait/sensationalism (US English first).

### Cited findings
- Preferred Sources: US + India 12 Aug 2025 → English worldwide Dec 2025 → all languages 30 Apr 2026 — [Google blog](https://blog.google/products-and-platforms/products/search/preferred-sources-language-expansion), [SER](https://www.seroundtable.com/google-preferred-sources-all-languages-globally-41253.html), [9to5Google](https://9to5google.com/2026/04/30/google-preferred-sources-global-language-expansion/)
- Google's guide says marked-preferred sites see roughly double CTR (vendor/secondary claim) — [PPC Land](https://ppc.land/google-updates-preferred-sources-guide-doubling-publisher-click-through-rates/)

## 5. Off-page: UGC/forums, YouTube, social search

### Takeaway
- **Reddit:** after a big 2024–25 surge, Reddit's own Google referrals are falling in 2026. The CEO said in Q3 2026 that AI Mode/AI Overviews do not send traffic, with >1M fewer search referrals per week in Oct 2026. Reddit was also volatile in the Mar 2026 core update. Reddit is still one of the most-cited domains inside AI answers (note 02), so the value is now mostly as a **citation/mention surface**, not a traffic source.
- **YouTube:** the most consistently cited source in Google AI Overviews (BrightEdge: 29.5% citation share, #1 domain; AI Mode 16.6%), and YouTube mentions are the strongest AI-visibility correlate (Ahrefs ~0.737). Cited videos skew to structured long-form explainers with chapters/timestamps and good descriptions. View counts do not predict citation.
- **Instagram:** since 10 Jul 2025, public posts/Reels (from 2020) of professional accounts (18+) can be indexed by search engines.
- **Social search:** the "Gen Z uses TikTok instead of Google" story is fading in 2026 data (Adobe/SurveyMonkey: preference for TikTok over Google fell 8% → 4%). The main challenger to Google is AI chatbots. Social platforms remain the discovery layer for shopping.

### Cited findings
- Reddit Q3 2026: >1M fewer weekly search referrals in Oct 2026; DAU could fall low-double-digit % in Q4; revenue $895M (+53% YoY); Amsive/SISTRIX −64.2 visibility points in Mar 2026 core update then rebound — [eMarketer](https://www.emarketer.com/content/reddit-traffic-falls-google-ai-search-keeps-more-users-clicking-through), [iTechPost](https://www.itechpost.com/articles/237687/20261030/reddit-ceo-slams-google-ai-mode-over-traffic-decline-lost-search-referrals.htm), [ThePrint](https://theprint.in/tech/reddit-misses-daily-active-unique-visitors-on-google-algorithm-change-shares-tumble/2491842/)
- YouTube in AI answers: BrightEdge 29.5% AIO / 16.6% AI Mode; Meltwater Aug 2026 most-cited across 8 AI platforms; structure > popularity — [eClincher](https://www.eclincher.com/articles/youtube-and-ai-search-which-videos-get-cited), [Outlier Kit](https://outlierkit.com/resources/youtube-overtakes-reddit-ai-citations-2026/), [eWeek](https://www.eweek.com/news/youtube-google-ai-health-searches/), [DEV](https://dev.to/watsonfoglift/41-of-youtube-videos-cited-by-ai-search-have-under-1000-views-14bd)
- Instagram indexing from 10 Jul 2025 — [PPC Land](https://ppc.land/instagram-content-becomes-searchable-on-google-starting-july-10/), [Search Engine World](https://www.searchengineworld.com/its-live-instagram-posts-are-ranking-and-showing-in-google-and-bing-seo-meets-social)
- Social search 2026: Adobe Express/SurveyMonkey — 49% of US consumers have used TikTok for search; Gen Z TikTok-over-Google reliance 8% (2024) → 4% (2026); GRIN product discovery (18–27): Instagram 30.4%, TikTok 23.2%, Google 18.8%, YouTube 14.5% — [SEJ](https://www.searchenginejournal.com/gen-z-preference-for-tiktok-over-google-drops-50-data-shows/568267/), [SEL](https://searchengineland.com/google-tiktok-instagram-gen-z-shoppers-451625)
