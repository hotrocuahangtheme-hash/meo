# FengWu-W2S (arXiv 2411.10191) and newer FengWu-family versions (2025–2026)

Research date: 14 Oct 2026. Access notes: arxiv.org, nature.com, ADS, Semantic Scholar, OpenAlex and fengwu.intern-ai.org.cn were unreachable from this environment (proxy/DNS block), so paper details below come from search-engine extracts of the arXiv PDF/abstract and secondary summaries, NOT a direct read of the full paper. The GitHub repo, however, was cloned (git read, LFS skipped) and every text/source file was read directly — those findings are first-hand. The GitHub issues/API endpoints were not accessible (session not attached), so issues could not be checked.

## 1. FengWu-W2S paper: method, coupling, 42-day forecasts, ensemble, skill vs ECMWF, MJO/NAO, publication status

### Takeaway
FengWu-W2S (Ling, Chen, Wu, Han, Luo, Ouyang, Bai; Shanghai AI Lab + NUIST collaborators) extends the FengWu medium-range model into one seamless 6-hourly autoregressive model out to 42 days. It adds an ocean-atmosphere-land coupling module and two kinds of perturbation (Perlin-noise initial-condition perturbations plus adaptive, controllable perturbations inside the model). The authors report useful MJO skill to 37 days, against 32 days for ECMWF S2S. As of Oct 2026 it is still an arXiv preprint (v2, 20 Nov 2024). I found no journal version.

### Cited Findings
- Title: "FengWu-W2S: A deep learning model for seamless weather-to-subseasonal forecast of global atmosphere". Authors: Fenghua Ling, Kang Chen, Jiye Wu, Tao Han, Jing-Jia Luo, Wanli Ouyang, Lei Bai. arXiv:2411.10191, Nov 2024 — [arXiv abs](https://arxiv.org/abs/2411.10191); [ADS](https://ui.adsabs.harvard.edu/abs/2024arXiv241110191L/abstract)
- v2 was submitted on 20 Nov 2024 (from a search extract of the arXiv page) — [arXiv abs](https://arxiv.org/abs/2411.10191)
- The model "builds on the FengWu global weather forecast model and incorporates an ocean-atmosphere-land coupling structure along with a diverse perturbation strategy". It produces 6-hourly forecasts autoregressively out to 42 days — [arXiv PDF](https://arxiv.org/pdf/2411.10191); [Moonlight review](https://www.themoonlight.io/en/review/fengwu-w2s-a-deep-learning-model-for-seamless-weather-to-subseasonal-forecast-of-global-atmosphere)
- Coupling: the paper describes a feature-extraction module meant to represent energy and mass exchange among the atmosphere, land and ocean. This is a coupling inside one network, not separate coupled component models — [arXiv PDF](https://arxiv.org/pdf/2411.10191) (via search extract)
- Ensemble design has two parts. "Initial Condition Perturbations" add Perlin noise to the initial state. "Adaptive Controllable Model Perturbations" act on several internal layers of the model — [arXiv PDF](https://arxiv.org/pdf/2411.10191) (via search extract)
- One secondary summary says the ensemble has 30 members. I could not confirm this in the primary paper — [aimodels.fyi summary](https://www.aimodels.fyi/papers/arxiv/fengwu-w2s-deep-learning-model-seamless-weather) (unverified)
- MJO: the authors report bivariate correlation above 0.5 out to 37 days, against 32 days for ECMWF S2S. One strong 2019 MJO event was predicted well up to about 40 days ahead. MJO amplitude is somewhat underestimated at long leads — [arXiv PDF](https://arxiv.org/pdf/2411.10191); [Moonlight review](https://www.themoonlight.io/en/review/fengwu-w2s-a-deep-learning-model-for-seamless-weather-to-subseasonal-forecast-of-global-atmosphere)
- The abstract claims reliable prediction 3–6 weeks ahead, "enhancing predictive capabilities for global surface air temperature, precipitation, geopotential height and intraseasonal signals", with the NAO and MJO named — [arXiv abs](https://arxiv.org/abs/2411.10191)
- At 3–4 week leads, T2m forecasts capture temperature phase changes over most of the globe. Some mid- and high-latitude regions show negative skill at weeks 5–6. Skill is said to beat traditional dynamical and AI models, "especially for T2m and Z500" — [arXiv PDF](https://arxiv.org/pdf/2411.10191) (via search extract)
- Publication status: the repo README's citation is still the arXiv preprint. It says the 25 km model "will be open-sourced following the acceptance of the manuscript", which means the paper was not yet accepted when the README was last edited on 30 Sep 2026 — [GitHub README](https://github.com/LingFH/FengWu-W2S.onnx)
- Do not confuse it with the original FengWu paper (Chen et al., arXiv 2304.02948). That one was published as "The operational medium-range deterministic weather forecasting can be extended beyond a 10-day lead time", Commun. Earth Environ. 6, 518 (2025) — [arXiv 2304.02948](https://arxiv.org/abs/2304.02948); [Nature CEE](https://www.nature.com/articles/s43247-025-02502-y) (page not directly readable here; title and reference come from search extracts)

### Inferences
- The repo (see section 2) shows that the model predicts SST, wave variables (swh, mwd, mwp), soil moisture (swvl1) and OLR (mtnlwrf) as prognostic channels alongside the atmosphere. So "coupling" here means one network that jointly predicts atmosphere, ocean-surface and land-surface variables. It is not a coupled ocean GCM.
- 42 days × 4 steps/day = 168 steps. This matches `pred_step = 168` in the public config.

### Gaps
- I could not read the full paper. Missing: architecture details and parameter count, training years and data (presumably ERA5), exact ensemble size used in the evaluation, numeric ACC/CRPS tables against ECMWF S2S, NAO skill lead time, the reference S2S system and hindcast period, and inference time.
- The NAO-specific numbers were not in any extract retrieved.
- I found no independent or peer-reviewed evaluation of FengWu-W2S. A 2026 arXiv paper, "Evaluation of medium range machine learning models for sub-seasonal prediction" ([arXiv 2606.25417](https://arxiv.org/pdf/2606.25417)), came up in search, but I could not check whether it covers FengWu-W2S.

## 2. Public release: GitHub repo LingFH/FengWu-W2S.onnx (read first-hand)

### Takeaway
The repo has inference code only: ONNX Runtime wrapper, config, normalization statistics, land-sea mask, two example input arrays and demo GIFs. It contains no model weights and no LICENSE. The 140 km (128×256, 1.40625°) ONNX model is available only by emailing the author. A 25 km version with stratospheric levels is promised once the paper is accepted, and as of Oct 2026 it has not been released. So this is not a full open release.

### Cited Findings
All items below come from a direct clone of [github.com/LingFH/FengWu-W2S.onnx](https://github.com/LingFH/FengWu-W2S.onnx) at HEAD `5ce9bf3` (main), read on 14 Oct 2026.
- **File list:** `README.md`, `main.py`, `requirement.txt`, `configs/FengWu_W2S_setting.py`, `onnx/fengwu_w2s_128.py`, `onnx/utils.py`, `onnx/mean_std.json`, `onnx/mean_std_single.json`, `onnx/Land_sea.npy` (262 KB), stray `onnx/__pycache__/*.pyc` (including one for a `fengwu_w2s_128_new` module whose source is not in the repo), `input_data0.npy` and `input_data1.npy` (20.4 MB each), and `demos/*.gif` (EA_Typhoon.gif is 41.9 MB; `tp6h_hourly.gif` is a 1-byte placeholder).
- **No `.onnx` weight file and no LICENSE file** are in the repo.
- **Commit history** (7 commits): initial commit 2025-03-12, "example data" and other revisions 2025-03-13, then two README edits on 2026-09-30. The 2026 edits changed the clone URL from a copy-paste error (`taohan10200/FengWu-GHR.onnx`) to `LingFH/FengWu-W2S.onnx`, and removed bailei@pjlab.org.cn from the contact line.
- **Weights access, quoted from the README:**
  - "140 km Resolution: For access to this version, please contact us at lingfenghua@pjlab.org.cn".
  - "25 km Resolution: This version includes stratospheric data and provides enhanced spatial detail, making it particularly effective for predicting extreme weather events… The 25 km model will be open-sourced following the acceptance of the manuscript."
  - The README links no hosting site (no HF, Zenodo or Baidu link). The config's `model_path` points to an internal cluster path: `/mnt/petrelfs/lingfenghua/S2S/FengWu-W2S.onnx/140km/FengWu_W2S_128.onnx`.
- **Variables:**
  - 13 single-level channels: `u10, v10, msl, u100, v100, t2m, sst, tp6h, swvl1, mtnlwrf, swh, mwd, mwp`.
  - 5 pressure-level variables `z, q, u, v, t` on 13 levels (50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000 hPa).
  - Total: 13 + 65 = 78 channels per time step.
- **Input shape:**
  - Each example input is float64 `(78, 128, 256)`, covering 90N to 90S and 0–360E.
  - The model takes two consecutive states (t−6h and t), normalized and concatenated, giving a `(1, 156, 128, 256)` float32 tensor.
  - Output is the next state. It is fed back autoregressively by sliding the two-step window.
- **Resolution:** 128 lat × 256 lon. Longitude is `np.arange(0, 360, 1.40625)`. Latitude is `np.linspace(90, -90, 128)`, which is not exactly 1.40625° spacing. The netCDF metadata labels it "FengWu-W2S-140km". So the public model is about 1.4°, not 1.5° or 0.25°. The 25 km (about 0.25°) version is unreleased.
- **Preprocessing:**
  - tp6h is log(1+x) transformed.
  - NaNs in sst, swh, mwd and mwp (land) are filled with climatological constants. The README says users should not handle SST or wave NaNs themselves.
  - On output, ocean variables are masked to NaN over land using `Land_sea.npy`. tp6h below 0.1 mm is set to 0.
- **Ensemble in the public script:**
  - `ensembles_nums = 10` by default.
  - Member 0 is unperturbed. The other members get initial-condition noise from `generate_fractal_noise_2d` (Perlin-octave noise, res [4, 4], 3 octaves, tileable in longitude), scaled by `n_level = 0.09` in normalized units.
  - The paper's model-internal "adaptive controllable model perturbations" are not exposed in the public script. If they exist in the ONNX graph, they cannot be controlled from it.
- **Forecast length:** `pred_step = 168` (168 × 6 h = 42 days). One netCDF file is written per step (`Prediction_{h}h.nc`, dims time/member/level/lat/lon).
- **Software and hardware:**
  - `requirement.txt` (the README wrongly says `requirements.txt`) lists numpy, torch, netCDF4==1.7.2, onnx==1.12.0, onnxruntime-gpu==1.14.0 and xarray==2025.1.2, with Python 3.10 via conda.
  - It uses the CUDAExecutionProvider. The config hard-codes `device_id: 4`, a leftover from a multi-GPU node.
  - No GPU memory or runtime requirements are stated anywhere.
- **Demos:** hourly and weekly tp6h GIFs, and a "25km Typhoon 850hPa Wind Speed initial from 2024-06-21T00" ensemble GIF (member 23 shows several typhoons forming in late July).

### Inferences
- "Is it the full model?" No. The repo is a thin inference harness. Weights are gated: the 140 km version by email request, and the 25 km version not released. There is no training code, and no code for the model-perturbation scheme.
- With no LICENSE file, default copyright applies, so reuse rights for the code are legally unclear.
- Inputs presumably need to be ERA5-like fields regridded to 128×256. The mean/std statistics have count 16436 (about 11 years of 6-hourly samples), which suggests an ERA5 training climatology, but the repo does not state the dataset.
- The repo's naming (`fengwu_w2s_128`) and the README template copied from FengWu-GHR.onnx (Tao Han) suggest it follows the earlier FengWu/FengWu-GHR ONNX release pattern.

### Gaps
- I could not view GitHub issues, stars or forks (API blocked for unattached repos).
- No information on inference time or VRAM. A rough estimate for one ONNX call on a 128×256×156 tensor is a few hundred ms on an A100 (by analogy with FengWu's reported about 600 ms/step on A100, [arXiv 2304.02948](https://arxiv.org/abs/2304.02948)). That makes a 42-day, 10-member run on the order of minutes, but this is my estimate, not a sourced figure.

## 3. Newer FengWu versions or successors in 2025–2026, and their availability

### Takeaway
I found no new model branded "FengWu" (no "FengWu 2.0", FengWu-Ocean or FengWu-Climate) released in 2025–2026. Activity in this window falls into four groups:
- **Publication:** the original FengWu appeared in Commun. Earth Environ. (2025).
- **Commercialization:** an incubated company sells FengWu-based services (2025).
- **Lab-wide platform:** the FengWu team's work is folded into Shanghai AI Lab's Intern ("书生") science platform (WAIC 2025).
- **Observation-native models by the same team:** FengYuan/风源 V1.0, a CMA-led model co-developed with Shanghai AI Lab (Dec 2025), and Earth-o1 (arXiv May 2026, Shanghai AI Lab, corresponding authors Fenghua Ling and Lei Bai).

Earth-o1 and FengYuan are the closest things to "successors", but neither carries the FengWu name.

### Cited Findings
**Background, pre-2025 (for the inventory)**
- FengWu: released Apr 2023 by Shanghai AI Lab with USTC, SJTU, NUIST, IAP-CAS and Shanghai Central Meteorological Observatory. It gave the first skillful forecast beyond 10 days (10.75 days, z500 ACC above 0.6), producing 10-day global forecasts in about 30 s — [shlab.org.cn news](https://www.shlab.org.cn/news/5443382); [arXiv 2304.02948](https://arxiv.org/abs/2304.02948)
- FengWu-GHR (arXiv 2402.00059, early 2024):
  - Grid is about 9 km (2001×4000) with more than 4B parameters — [arXiv 2402.00059](https://arxiv.org/html/2402.00059)
  - Media reported "10-km-level" forecasts with an 11.25-day effective lead — [IT之家](https://www.ithome.com/0/753/292.htm)
- An ocean-wave and weather paper (arXiv 2401.16669) is from the same ecosystem — [arXiv 2401.16669](https://arxiv.org/pdf/2401.16669)
- WAIC 2024: "书生·风乌" was upgraded to a full weather-ocean forecasting system. It covers severe-convection nowcasting, global medium-range weather, and ocean/climate prediction (minutes up to decadal ocean). This includes the long-range ocean model ORCA (Oceanic Reliable foreCAst), which produces multi-year to interannual 3D ocean predictions — [Shanghai AI Lab / 书生·风乌 site](https://fengwu.intern-ai.org.cn/) (site content via search extract)
- Open code: [OpenEarthLab/FengWu](https://github.com/OpenEarthLab/FengWu) (ONNX inference) and the ECMWF ai-models plugin [OpenEarthLab/ai-models-fengwu](https://github.com/OpenEarthLab/ai-models-fengwu). The model hub "OneScience" mirrors FengWu under Apache-2.0 and says the Hong Kong Observatory has adopted FengWu operationally — [HF OneScience/FengWu README](https://huggingface.co/OneScience/FengWu/blob/main/README.md) (HF blocked here, so this comes from a search snippet; treat the HKO claim as hub-reported)

**2025**
- Original FengWu paper formally published: Commun. Earth Environ. 6, 518 (2025), DOI 10.1038/s43247-025-02502-y, titled "The operational medium-range deterministic weather forecasting can be extended beyond a 10-day lead time" — [arXiv 2304.02948 journal-ref](https://arxiv.org/abs/2304.02948); [Nature CEE](https://www.nature.com/articles/s43247-025-02502-y)
- Mar 2025: FengWu-W2S inference repo created (see section 2) — [GitHub](https://github.com/LingFH/FengWu-W2S.onnx)
- WAIC 2025 (26 Jul 2025):
  - Shanghai AI Lab launched Intern-S1 (书生 scientific multimodal model) and the Intern-Discovery platform. A joint release listed EarthLink, an "AI Earth scientist" agent built with IAP-CAS and CAMS.
  - Hinton cited "风乌" as an example of AI for science.
  - No new FengWu version was announced — [shlab.org.cn news 5444177](https://www.shlab.org.cn/news/5444177); [shlab.org.cn news 5444192](https://www.shlab.org.cn/news/5444192); [Sohu](https://m.sohu.com/a/918381108_121228203)
- Sep 2025 commercialization: 相风科技, the lab's first incubated company, sells "AI+weather" products based on FengWu ("one GPU predicts 10 days of weather"). Customers named are State Grid and China Southern Power Grid — [Sina Finance 2025-09-17](https://finance.sina.com.cn/jjxw/2025-09-17/doc-infqtywq4815300.shtml); [shlab.org.cn news 5444212](https://www.shlab.org.cn/news/5444212)
- OneForecast (arXiv 2502.00338, ICML 2025): a GNN-based global-regional nested forecasting framework, code at YuanGao-YG/OneForecast. I found no confirmed link to Shanghai AI Lab or FengWu, so it should be excluded — [arXiv 2502.00338](https://arxiv.org/pdf/2502.00338); [PMLR](https://proceedings.mlr.press/v267/gao25r.html)
- 19 Dec 2025: CMA released the AI meteorological science model **"风源" (FengYuan) V1.0**.
  - Leads: Chinese Academy of Meteorological Sciences and the Xiong'an Meteorological AI Innovation Institute.
  - Co-developers: National Meteorological Information Center, **Shanghai AI Laboratory**, Nanjing Meteorological S&T Innovation Institute and Jiangxi Provincial Meteorological Observatory.
  - It is end-to-end: it reads satellite, radar and station observations directly and outputs global forecasts, skipping a separate data-assimilation step.
  - Upgrades to CMA's 风清, 风雷 and 风顺 models were announced at the same event.
  - For now it mainly serves research and operational professionals — [Xinhua 2025-12-19](https://www.news.cn/tech/20251219/99223b9d028a46faa3dda987a5f607b9/c.html); [China Daily](https://govt.chinadaily.com.cn/s/202512/19/WS69464ac2498e3685503390a9/china-unveils-a-new-ai-meteorological-model.html); [IT之家](https://www.ithome.com/0/906/594.htm); [bjnews](https://www.bjnews.com.cn/detail/1789383179019484.html)
- A 2026 Journal of Meteorological Research paper on FengYuan lists Lei Bai as co-author. The search summary describes it as "an end-to-end global weather forecasting model driven by multi-source observational data". I did not open the paper — (search extract of Lei Bai publication listings; no direct URL verified)

**2026**
- **Earth-o1: A Grid-free Observation-native Atmospheric World Model**, arXiv 2605.06337, 7 May 2026.
  - 25 authors, lead affiliation Shanghai AI Laboratory. Corresponding authors are Fenghua Ling (W2S first author), Ben Fei (CUHK) and Lei Bai. Pierre Gentine (Columbia) is a co-author.
  - It learns atmospheric evolution directly from ungridded observations, with no dynamical solver and no traditional data assimilation.
  - In hindcasts its surface forecast skill is reported comparable to operational IFS.
  - Availability of code or weights is unknown — [arXiv 2605.06337](https://arxiv.org/pdf/2605.06337); [emergentmind](https://www.emergentmind.com/papers/2605.06337)
- 17 Jul 2026, WAIC 2026: CMA released "风和" (FengHe), a weather-service large language model with a global open-source plan. It was co-developed by the CMA Public Meteorological Service Center, the Xiong'an institute, Zhipu and others. It is **not** a FengWu model and does not appear to involve Shanghai AI Lab; it is listed here only because the name is easily confused — [Xinhua 2026-07-17](http://www.news.cn/tech/20260717/7209fae8257d4e5291c71cfaaacd975d/c.html); [STDaily](https://www.stdaily.com/web/gdxw/2026-07/17/content_549154.html)
- No "风乌" release at WAIC 2026 turned up in Chinese searches ("风乌 气象大模型 新版本 2026") — [search context: people.com.cn report on 风和](http://sh.people.com.cn/n2/2026/0721/c134768-41645116.html)

**Models to exclude (not FengWu or not Shanghai AI Lab)**
- TianXing-S2S (arXiv 2512.12545, Dec 2025): a diffusion-based multi-sphere coupled S2S model that reports beating ECMWF S2S and FuXi-S2S at 1.5° over 45 days. Its affiliations are Tongji and Fudan, not Shanghai AI Lab — [arXiv 2512.12545](https://arxiv.org/pdf/2512.12545)
- FuXi / FuXi-S2S are from Fudan University. Baguan is from Alibaba DAMO. Xihe is from NUDT (not verified in this session; from background knowledge, so treat with caution).

### Inferences
- The FengWu team's direction in 2025–2026 has moved from gridded reanalysis emulators (FengWu, GHR, W2S) toward observation-native, assimilation-free models: FengYuan with CMA, and Earth-o1. These are the realistic "successors", but they are new brands.
- FengWu-W2S itself remains the latest FengWu-branded model. Its 25 km weights are still unreleased as of Oct 2026 because the paper has not been accepted.

### Gaps
- I could not access fengwu.intern-ai.org.cn or Shanghai AI Lab pages directly, so a FengWu product update (for example a WAIC 2025/2026 booth demo or an API) could exist without being indexed.
- FengWu-GHR's operational status at CMA is unconfirmed. Apart from the hub-reported HKO adoption, I found no source showing FengWu running operationally at CMA.
- Code and weights availability for Earth-o1 and FengYuan is unknown. Chinese reports describe FengYuan as serving professional users, with no open-source mention.
- Whether ORCA got a 2025–2026 update is unknown.
