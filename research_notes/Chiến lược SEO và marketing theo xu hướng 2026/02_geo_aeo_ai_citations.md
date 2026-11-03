# GEO / AEO: how sites get cited by AI answers (Google AI features, ChatGPT, Perplexity, Copilot)

Research date: 2026-11-03. Same access limits as note 01: all facts are **[Snippet]** level (search-result excerpts and summaries), no page was opened directly. Many GEO "studies" are vendor content; the strongest items here are Google's own guide (via coverage), Ahrefs' large-sample studies, and the Search Console / Bing Webmaster Tools product changes.

## 1. Google's official position: for Google, GEO/AEO = SEO

### Takeaway
On 15 May 2026 Google published a Search Central guide on optimising for its generative AI features (AI Overviews, AI Mode). Coverage agrees on three points. AEO/GEO practices "are not separate from SEO" when applied to Google Search. AI features rely on the same systems and signals as Search. No special formatting, special files or AI-only markup is required, and llms.txt is not used by Search. Content made with AI help is fine if it meets Search Essentials and the spam policies. Practical meaning: for Google, the work is still crawlability, indexability, snippet eligibility, helpful people-first content and structured data that matches the visible page.

### Cited findings
- Google treats optimising for generative AI features as part of SEO; "AEO and GEO are not separate from SEO when applied to Google Search"; systems interpret context and multiple topics without special formatting — [SEJ](https://www.searchenginejournal.com/googles-official-advice-on-optimizing-for-ai-overviews-ai-mode/547341/), [SER mythbusting](https://www.seroundtable.com/google-optimise-generative-ai-mythbusting-41335.html), [Practical Ecommerce](https://www.practicalecommerce.com/googles-optimization-guidelines-for-ai-mode), [StartupFortune](https://startupfortune.com/google-says-ai-search-optimization-still-starts-with-technical-seo/)
- Likely primary URL: developers.google.com/search/docs/fundamentals/ai-optimization-guide (not opened; blocked)
- AI Mode uses "query fan-out": it splits a question into sub-topics and issues many searches at once (Google, May 2025). Retrieval is passage-level, so self-contained sections that each answer one sub-intent are easier to cite — [Aleyda Solis](https://www.aleydasolis.com/en/ai-search/google-query-fan-out/), [Digiday](https://digiday.com/media/wtf-is-query-fan-out-in-googles-ai-mode/), [Similarweb](https://aisearch.similarweb.com/blog/query-fan-out/)

## 2. What correlates with being cited / mentioned

### Takeaway
Across the large studies, **off-site brand presence** (mentions on the web and especially on YouTube) correlates with AI visibility far more than backlinks do. Ranking in Google's top 10 is no longer a reliable proxy for being cited: the share of AI Overview citations coming from top-10 pages fell from 76% to 38% between Jul 2025 and Mar 2026 (Ahrefs). Fresher pages are cited more often by most assistants (except AI Overviews). Reddit, YouTube, Wikipedia and LinkedIn dominate citation lists, but 84% of citations go to domains outside the top 100. So niche sites can be cited too.

### Cited findings
- Ahrefs, 75k brands (Aug 2025): branded web mentions correlate 0.664 with AI Overview brand visibility; backlinks 0.218. Follow-up (Dec 2025) adds ChatGPT + AI Mode: YouTube mentions ~0.737 (strongest factor on all three), branded web mentions 0.66–0.71. Ahrefs stresses correlation ≠ causation — [Ahrefs](https://ahrefs.com/blog/ai-brand-visibility-correlations), [Ahrefs AIO](https://ahrefs.com/blog/ai-overview-brand-correlation/), [TNW](https://thenextweb.com/news/ahrefs-youtube-mentions-ai-visibility-brand-search)
- Ahrefs (Mar 2026, 863k keyword SERPs, ~4M URLs): AIO citations from top-10 organic results 76% (Jul 2025) → 38% (Mar 2026). BrightEdge measures only 17%. Methods differ — [Ahrefs](https://ahrefs.com/blog/ai-overview-citations-top-10), [apiserpent roundup](https://apiserpent.com/blog/ai-overview-citations-vs-rankings-overlap)
- Ahrefs freshness study (17M citations): AI-cited URLs average 1,064 days old vs 1,432 for organic results (25.7% "fresher"). ChatGPT has the strongest preference for newer pages. AI Overviews is the exception (cites slightly older pages). Average cited page is still ~2.9 years old — [Ahrefs](https://ahrefs.com/blog/do-ai-assistants-prefer-to-cite-fresh-content)
- Most-cited domains: Peec AI (Mar 2026, 30M sources): Reddit #1 overall, then YouTube, LinkedIn, Wikipedia. Google AI surfaces favour social/UGC; ChatGPT leans editorial/Wikipedia (Profound 2025). 84% of AI citations come from outside the top-100 cited domains — [Peec AI](https://docs.peec.ai/research/most-cited-domains-in-ai-search), [SER on Profound](https://www.seroundtable.com/chatgpt-sources-39578.html), [Ahrefs ChatGPT domains](https://ahrefs.com/blog/most-cited-domains-in-chatgpt/)
- Only ~11% of domains are cited by both ChatGPT and Perplexity (vendor claim): each engine needs its own check — [5W PR](https://www.5wpr.com/research/state-of-ai-citations-2026/)

## 3. Technical access for AI systems

### Takeaway
Three technical points matter more than any GEO trick:
1. Most AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot…) **do not execute JavaScript**. Content that only appears after client-side rendering is invisible to them; Googlebot (and so Gemini/AI Overviews) does render.
2. Each vendor splits **training** bots from **search/retrieval** bots and **user-triggered** fetchers. You can opt out of training and still be cited in AI search.
3. Infrastructure defaults can block AI bots without the owner knowing. Cloudflare blocks training/agent/mixed-use AI crawlers on ad-supported pages by default from 15 Sep 2026.

llms.txt: no major provider has publicly committed to reading it. Google says it does not support it. Adoption is ~10% of domains. It is low-cost and optional, not a ranking lever.

### Cited findings
- Vercel × MERJ crawl-log analysis (>500M GPTBot fetches, Dec 2024): no JS execution; GPTBot downloads JS in ~11.5% of requests, ClaudeBot ~23.8%, but neither runs it; same for PerplexityBot, OAI-SearchBot, Claude-SearchBot — via [Passionfruit](https://getpassionfruit.com/blog/javascript-rendering-and-ai-crawlers-can-llms-read-your-spa), [TripleDart](https://www.tripledart.com/research/why-your-site-is-invisible-to-chatgpt-and-claude)
- OpenAI: GPTBot (training) vs OAI-SearchBot (ChatGPT search citations) vs ChatGPT-User (user-triggered); independent robots.txt controls. Anthropic: ClaudeBot / Claude-SearchBot / Claude-User — [searchlab.nl](https://searchlab.nl/gids/ai-crawlers-robots-txt), [Playwire list](https://www.playwire.com/blog/the-complete-list-of-ai-crawlers-and-how-to-block-each-one)
- Google-Extended is a robots.txt token for Gemini training/grounding. Secondary sources conflict on whether it affects AI Overviews; the more authoritative ones say AI Overviews follow Googlebot rules (preview controls such as nosnippet / max-snippet / data-nosnippet). To verify on Google's crawler docs.
- Cloudflare (1 Jul 2026 announcement): from 15 Sep 2026, on ad-supported pages, training, agent and mixed-use AI crawlers are blocked by default (incl. free plan); search crawlers stay allowed. Blocked bots can get HTTP 402; Pay-per-crawl is moving to "pay per use" — [TechCrunch](https://techcrunch.com/2026/07/01/cloudflares-new-policy-pushes-ai-companies-to-pay-for-publishers-content/), [llmrefs](https://llmrefs.com/blog/cloudflare-blocks-ai-crawlers)
- llms.txt: Google "doesn't support LLMs.txt and isn't planning to" (Illyes, Jul 2025); Google's own docs portal hosts one for other reasons; SE Ranking ~10% adoption across ~300k domains — [SER](https://www.seroundtable.com/google-does-not-endorse-llms-txt-40789.html), [SER](https://www.seroundtable.com/google-llms-txt-other-reasons-40703.html), [DEV](https://dev.to/mrtd/llmstxt-reality-check-10-of-sites-have-it-ai-search-engines-almost-never-read-it-2281)

## 4. Measurement and control of AI visibility (new in 2026)

### Takeaway
2026 brought the first first-party AI reporting. Bing Webmaster Tools has an AI Performance report (public preview Feb 2026: Copilot/Bing AI citations by grounding query and page, no clicks). Google added "Search generative AI" performance reports in Search Console (3 Jun 2026: AI Overviews, AI Mode and Discover AI impressions, data from 18 May 2026, impressions only, gradual rollout starting with a subset of UK sites). After a UK CMA order, Google also added a domain-level Search Console toggle to opt out of AI Overviews / AI Mode / Discover AI without losing normal Search ranking (testing with UK sites). Third-party trackers (Ahrefs Brand Radar, Semrush AI toolkit, Profound, Peec AI…) fill the gap for ChatGPT/Perplexity/Gemini share-of-voice.

### Cited findings
- Bing AI Performance report: public preview Feb 2026, all verified sites, citations by grounding query & page, no click data; later added sorting by intent/topic/citation share — [SEL](https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039), [Practical Ecommerce](https://www.practicalecommerce.com/bings-improved-ai-performance-section), [Search Influence](https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/)
- Search Console generative AI reports, 3 Jun 2026: impressions for AI Overviews + AI Mode (Search) and Discover AI features. Dimensions: pages, countries, devices, dates. No CTR/position. Data from 18 May 2026, no backfill. Gradual rollout (subset of sites, UK first per some coverage). Data stays inside overall Performance totals — [PPC Land](https://ppc.land/google-finally-gives-search-console-its-own-generative-ai-visibility-reports/), [CMSWire](https://www.cmswire.com/digital-experience/google-adds-ai-visibility-reports-to-search-console/), [Neil Patel](https://neilpatel.com/blog/gsc-ai-search-data-generative-ai-report/)
- AI opt-out toggle (domain-level; AI Overviews, AI Mode, AI Overviews in Discover), same day as CMA order 3 Jun 2026; not used as a ranking signal for standard Search; testing with limited UK sites; CMA gives Google 9 months (≈ Mar 2027) — [SiliconANGLE](https://siliconangle.com/2026/06/03/uk-orders-google-provide-ai-overviews-opt-option-publishers/), [SEJ](https://www.searchenginejournal.com/google-gives-sites-ai-search-opt-out-but-not-the-data-to-use-it/577978/), [PPC Land](https://ppc.land/google-reacts-to-uk-order-with-a-search-console-ai-opt-out-toggle/), [MediaPost](https://www.mediapost.com/publications/article/415549/google-gives-uk-publishers-a-way-to-opt-out-of-a.html)
- Tracker landscape (pricing varies by source): Profound (enterprise, $1B valuation Feb 2026), Peec AI (from ~$95/mo), Semrush AI toolkit, Ahrefs Brand Radar ($199 per AI index or $699 bundle) — [Rankability](https://rankability.com/blog/best-ai-search-visibility-tracking-tools/), [Frase](https://frase.io/blog/the-10-best-ai-visibility-tools-in-2026)

## Gaps
- No Vietnamese-language study of AI citation sources was found; the citation-source mix for Vietnamese queries (e.g. VnExpress, Tinhte, Voz, Facebook groups) is unknown and should be measured directly.
- Whether the Search Console AI report/opt-out has reached Vietnam was not found.
