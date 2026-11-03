# Measurement in the AI-search era, and "agent-ready" websites

Research date: 2026-11-03. **[Snippet]** level throughout.

## 1. New first-party measurement (2025–2026)

### Takeaway
Measuring SEO by "clicks from Google" alone now undercounts value. The 2025–2026 toolset adds the following:
- **Search Console**
  - branded vs non-branded queries filter (announced 20 Nov 2025; all eligible sites 11 Mar 2026)
  - query groups and custom chart annotations (late 2025)
  - "Search generative AI" impression reports (Jun 2026, gradual rollout; see note 02)
- **GA4**: a native "AI Assistant" default channel (≈13 May 2026) for referrals from recognised chatbots (ChatGPT, Gemini, Claude…). AI Overviews/AI Mode clicks stay in Organic Search, and many AI-app visits arrive with no referrer and land in Direct. Keep a custom channel group with a referrer regex (chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com…) and read the numbers as a **lower bound**. One study found GA4 captured only ~9% of Gemini-on-iOS visits seen in server logs.
- **Bing Webmaster Tools**: AI Performance report (citations in Copilot/Bing AI, see note 02).
- **Merchant Center**: AI performance insights for shopping surfaces (note 04).
- **Marketing mix / incrementality**: Google's open-source Bayesian MMM **Meridian** (cookie-free, aggregate data) gained GeoX geo-experiments globally and is being integrated into GA360 (GML 2026). Google cut the minimum budget for its incrementality tests to $5,000 (Nov 2025). Industry framing: use incrementality tests to calibrate MMM, and don't trust in-platform attribution alone, especially with AI-automated campaigns.

### Cited findings
- GSC branded queries filter — [Google Search Central](https://developers.google.com/search/blog/2025/11/search-console-branded-filter), [SEL expansion](https://searchengineland.com/google-search-console-branded-queries-filter-expands-471387), [SER](https://www.seroundtable.com/branded-queries-filter-rolling-out-in-search-console-41064.html)
- GA4 AI Assistant channel (May 2026); AIO/AI Mode counted as Organic; custom regex advice; Gemini-iOS undercount — [SEJ](https://www.searchenginejournal.com/google-analytics-adds-ai-assistant-as-default-channel-group/574974/), [SEO Sherpa](https://seosherpa.com/ga4-just-gave-ai-traffic-its-own-channel/), [Clickport](https://clickport.io/blog/ga4-ai-assistant-channel), [Terminus](https://www.terminusapp.com/blog/ai-traffic-channel-in-ga4/)
- Meridian GeoX global, GA360 integration, $5k incrementality minimum — [SEJ](https://searchenginejournal.com/google-launches-meridian-geox-globally/589030/), [PPC Land](https://ppc.land/meridian-lands-inside-analytics-360-as-google-links-ad-spend-to-future-sales/), [PPC Land](https://ppc.land/google-lowers-incrementality-testing-threshold-to-5-000-for-advertisers/), [SEL](https://searchengineland.com/google-meridian-all-users-451286)

## 2. Suggested KPI set (synthesis, not from a single source)

| Layer | KPI | Source of data |
|---|---|---|
| Visibility (classic) | Non-branded impressions, top-3 share for money keywords | GSC (branded filter) |
| Visibility (AI) | AI Overviews/AI Mode impressions; Copilot citations; share of voice for a fixed prompt set in ChatGPT/Gemini/Perplexity | GSC gen-AI report, Bing AI Performance, third-party tracker or manual monthly prompt panel |
| Demand | Branded search impressions/clicks (brand demand created by PR, video, creators) | GSC branded filter, Google Trends |
| Traffic | Organic clicks; AI Assistant channel sessions (lower bound) | GSC, GA4 |
| Value | Conversion rate and revenue per session by channel; assisted conversions | GA4 / CRM |
| Owned audience | Zalo OA followers, email/SMS consented contacts, repeat purchase rate | Zalo OA, ESP, CRM |
| Efficiency | Incremental ROAS / CPA from tests; MMM contribution | Experiments, Meridian |

## 3. Agent-ready websites (watch list, low-cost prep)

### Takeaway
AI agents that browse and act for users went mainstream in 2026. Chrome "Auto Browse" with Gemini 3 launched 28 Jan 2026 (opt-in, US paid tiers first). Gemini/AI Mode agents book and buy. OpenAI moved agentic browsing from the Atlas browser into ChatGPT (Atlas standalone reportedly ended 9 Aug 2026, unconfirmed). Two standards are emerging:
- **Lighthouse 13.3** (7 May 2026) ships an "Agentic Browsing" category that checks llms.txt presence/errors, WebMCP, the accessibility tree and layout shift ("still under development").
- **WebMCP** (Google + Microsoft, W3C Web ML Community Group): websites declare callable tools via `navigator.modelContext`. Early preview since 10 Feb 2026 (Chrome 146 behind a flag). General availability is not confirmed.

Practical reading: semantic HTML, labelled forms, an accessible checkout and a stable layout (low CLS) help both humans and agents. llms.txt is optional and cheap. WebMCP is worth piloting only on sites with transactional flows (booking, quote, search-filter, cart).

### Cited findings
- Lighthouse agentic browsing audit — [Locomotive](https://locomotive.agency/blog/lighthouse-agentic-browsing-audit/), [accessiBe](https://accessibe.com/blog/google-lighthouses-agentic-browsing-audit-explained), [Classmethod](https://dev.classmethod.jp/en/articles/lighthouse-agentic-browsing-mcp-audit/)
- WebMCP early preview — [Chrome for Developers](https://developer.chrome.com/blog/webmcp-epp), [SEL](https://searchengineland.com/webmcp-explained-inside-chrome-146s-agent-ready-web-preview-470630), [SER](https://seroundtable.com/google-webmcp-40918.html), [eWeek](https://www.eweek.com/news/google-webmcp-chrome-ai-web-standard-preview/)
- Chrome Auto Browse (28 Jan 2026) and Atlas changes — [TechSpot](https://www.techspot.com/news/111112-google-introduces-agentic-ai-browsing-chrome-auto-browse.html), [AlternativeTo](https://alternativeto.net/news/2026/1/google-launches-a-new-ai-agent-style-auto-browse-tool-for-task-automation-in-chrome), [Decrypt](https://decrypt.co/356344/google-agentic-browsing-chrome-not-playing-nice-competitors)
