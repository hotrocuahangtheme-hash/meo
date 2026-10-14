# FengWu ecosystem: third-party wrappers and mirrors, HKO operational use, independent benchmarks

Research date: 14 Oct 2026. Access notes: raw.githubusercontent.com worked. The GitHub REST API (commit history) did not; it is bound to the session's repositories. WebFetch hit DNS errors for hko.gov.hk, weather.gov.hk, info.gov.hk, nature.com, sciencedirect.com, huggingface.co and readthedocs, and curl through the proxy got 403 on gov.hk and web.archive.org. Because of that, the HKO, Hugging Face and journal facts below come from **search-engine snippets of the primary pages**, not full-text reads. They are marked "(snippet)".

## 1. NVIDIA Earth2Studio FengWu wrapper

### Takeaway
Earth2Studio (Apache-2.0) has shipped a `FengWu` prognostic wrapper since its first release, 0.1.0 (22 Apr 2024). It runs the **operational ONNX checkpoint** `fengwu_v1.onnx` from `hf://NickGeneva/earth_ai/fengwu` through ONNX Runtime GPU. The model takes 2 time steps (t-6h and t0) of 69 variables on a 721x1440 0.25° grid, with latitude running north to south (90 to -90), and steps forward 6 h at a time.

### Cited Findings
- Source file header: `SPDX-License-Identifier: Apache-2.0`, Copyright 2024-2026 NVIDIA. — [fengwu.py (main)](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- Docstring: "FengWu (operational) weather model consists of single auto-regressive model with a time-step size of 6 hours. FengWu operates on 0.25 degree lat-lon grid (south-pole including) equirectangular grid with 69 atmospheric/surface variables. This model uses two time-steps as an input." — [fengwu.py](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- Docstring note: "This model uses the ONNX checkpoint from the original publication repository. This checkpoint is a operational version to the one used in the paper which requires less variables." It references arXiv 2304.02948, github.com/OpenEarthLab/FengWu and huggingface.co/NickGeneva/earth_ai. — [fengwu.py](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- Variables (69): u10m, v10m, t2m, msl, plus z, q, u, v and t at 13 pressure levels (50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000 hPa). — [fengwu.py](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- Input coords: `lead_time = [-6h, 0h]`, `lat = np.linspace(90, -90, 721)` (north to south, poles included), `lon = np.linspace(0, 360, 1440, endpoint=False)`. Output coords: `lead_time = [+6h]`, same grid. — [fengwu.py](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- Default package and files: `Package("hf://NickGeneva/earth_ai/fengwu", ...)`. `load_model` resolves `fengwu_v1.onnx` and loads normalization files `global_means.npy` (center) and `global_stds.npy` (scale), each of size [69]. — [fengwu.py](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- Forward pass: the input is normalized with `(x-center)/scale`, the two time steps are concatenated to shape (B, 138, 721, 1440), and the result is bound to ONNX input `"input"` and output `"output"`. The comment reads "ONNX model outputs two time-steps, take the first", so the code keeps the first 69 channels and un-normalizes them. In the iterator, the model rolls `x = cat(x[:,1:], out)`. — [fengwu.py](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- Badges: `region:global class:medium-range ... year:2023 gpu:40gb backend:onnx`. The docstring also advises setting the default PyTorch device before construction, to avoid ONNX session init overhead. — [fengwu.py](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- Optional-dependency extra in pyproject: `fengwu = ["onnx", "onnxscript", "onnxruntime-gpu>=1.21.0"]` (the FuXi extra is identical). — [pyproject.toml](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/pyproject.toml)
- Version history: `fengwu.py` exists at tag `0.1.0`. The CHANGELOG lists 0.1.0 (2024-04-22) as "Initial Release". In the 0.1.0 code the default package was already `hf://NickGeneva/earth_ai/fengwu` with `fengwu_v1.onnx`, `global_means.npy` and `global_stds.npy`. FuXi, by contrast, was added in 0.2.0 (2024-07-23). — [fengwu.py @0.1.0](https://raw.githubusercontent.com/NVIDIA/earth2studio/0.1.0/earth2studio/models/px/fengwu.py); [CHANGELOG](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/CHANGELOG.md)
- Later changes in the CHANGELOG:
  - 0.18.0 (2026-08-31): "Fixed intermittent repeated FengWu forecast timesteps by synchronizing ONNX Runtime I/O buffers with PyTorch".
  - Aurora coordinate fix: lead-time slicing aligned "the same way as FuXi, DLWP and FengWu".
  - 0.19.0 (2026-09-30): "Added ... Pangu, FengWu, FuXi ... to the docs scorecard". — [CHANGELOG](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/CHANGELOG.md)
- License disclaimer in the README: "Earth2Studio is an interface to third-party models, checkpoints, and datasets. Licenses for these assets are owned by their providers. Ensure you have the rights to download, use, and (if applicable) redistribute each model and dataset." Earth2Studio itself is Apache-2.0. — [README](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/README.md)

### Inferences
- The wrapper's code contains no data-source restriction. Any Earth2Studio data source that can supply these 69 variables on the 0.25° grid should work, for example GFS, ARCO ERA5, CDS or IFS. I did not read the docs examples that confirm which sources have been tested with FengWu.
- The pressure levels match the original FengWu paper (37 levels in ERA5, 13 used). The "fewer variables" remark probably refers to the operational checkpoint's input set compared with the paper version. That is unverified.
- The "docs scorecard" added in 0.19.0 is NVIDIA's own scoring, not an independent third-party benchmark. I did not see its numbers.

### Gaps
- I could not read the Hugging Face repo NickGeneva/earth_ai (blocked), so its model card, file sizes and any license statement for the FengWu ONNX are unverified.
- I could not get the git commit history (API blocked) or check the docs examples/API pages for data-source support.

## 2. Hugging Face and other mirrors (NickGeneva/earth_ai, OneScience)

### Takeaway
NickGeneva/earth_ai is the mirror that Earth2Studio pulls from (path `fengwu/`). A Hugging Face repo `OneScience/FengWu` exists, and a search engine indexed its README with `license: apache-2.0` (snippet only). OneScience is a scientific-AI model platform. A news roundup attributes its launch to Sugon (中科曙光). Its other Hugging Face model cards (OneScience-Group/*) target Sugon DCU hardware through the DTK toolkit. I could not verify FengWu-specific content: weights, training code or DCU support.

### Cited Findings
- Earth2Studio's FengWu docstring and default package point to huggingface.co/NickGeneva/earth_ai (subfolder `fengwu`). — [fengwu.py](https://raw.githubusercontent.com/NVIDIA/earth2studio/main/earth2studio/models/px/fengwu.py)
- A search result titled "license: apache-2.0" points to `huggingface.co/OneScience/FengWu/blob/main/README.md` (snippet; the page itself was unreachable). — [HF OneScience/FengWu README](https://huggingface.co/OneScience/FengWu/blob/main/README.md)
- The OneScience Hugging Face org lists about 42 models, e.g. evo2, ProteinMPNN, MatRIS, OpenFold and AlphaFold3 (snippet). — [huggingface.co/OneScience/models](https://huggingface.co/OneScience/models)
- A French news roundup reports that Sugon launched OneScience at the China Computer Conference (23 Oct) as an integrated platform for scientific-model R&D, training, evaluation and deployment (secondary source; snippet). — [toolnavs.com](https://toolnavs.com/fr/article/545-24-hour-ai-news-sugon-onescience-and-genos-launch-australia-launches-compliance)
- Model cards in OneScience-Group, e.g. Saluki, RemoteCLIP and UPT (snippets):
  - Saluki recommends running on DCU in the "OneScience DTK environment" with `onescience[bio-dcu]`.
  - RemoteCLIP and UPT say DCU users need DTK 25.04.2 or later. — [OneScience-Group/Saluki](https://huggingface.co/OneScience-Group/Saluki); [OneScience-Group/RemoteCLIP](https://huggingface.co/OneScience-Group/RemoteCLIP); [OneScience-Group/UPT](https://huggingface.co/OneScience-Group/UPT)
- The GitHub repo onescience-ai/OneScience-examples (default branch `master`) is under Apache-2.0 per its LICENSE file. The README's weather and climate table lists FourCastNet, **FengWu ("气象预测模型")**, GraphCast and Pangu-Weather. The README also says "本仓库中的代码遵循各模型原始项目的许可证", meaning each model follows its original project's license. — [OneScience-examples README](https://raw.githubusercontent.com/onescience-ai/OneScience-examples/master/README.md); [LICENSE](https://raw.githubusercontent.com/onescience-ai/OneScience-examples/master/LICENSE); [GitHub page](https://github.com/onescience-ai/OneScience-examples)
- The README's link `models/FengWu/README.md` returned **HTTP 404** on master (checked Oct 2026), so I could not read the FengWu directory. — [raw link](https://raw.githubusercontent.com/onescience-ai/OneScience-examples/master/models/FengWu/README.md)
- The GitHub page lists the project's other homes: onescience.ai, gitee.com/onescience-ai and github.com/onescience-ai. — [GitHub page](https://github.com/onescience-ai/OneScience-examples)

### Inferences
- OneScience/FengWu is most likely a re-packaging of the public OpenEarthLab FengWu ONNX checkpoint, possibly ported to DCU and DTK like the platform's other models. This is unconfirmed.
- If the Apache-2.0 tag on the OneScience Hugging Face repo is real, it may describe OneScience's wrapper code rather than a license granted by the FengWu authors (Shanghai AI Lab). OneScience's own README defers to each original project's license.

### Gaps
- Unreachable or not found: huggingface.co/OneScience-Group/FengWu, OneScience-Sugon/FengWu, any ModelScope copy, and Gitee.
- Unknown: whether the OneScience FengWu includes weights, training code or a DCU port.
- The Sugon link to OneScience rests on one secondary news source plus the DCU/DTK pattern in model cards.

## 3. Hong Kong Observatory (HKO) use of FengWu ("Earth Weather")

### Takeaway
HKO has run AI models, FengWu among them, in real time since mid-2023, mainly for tropical-cyclone (TC) track guidance. On **30 June 2025** it added FengWu **15-day** forecast products to the public "Earth Weather" webpage, with a MyObservatory app update to follow. HKO publications report that AI models, FengWu included, had smaller TC track errors than traditional NWP. They also flag weak intensity forecasts, and FengWu in particular becomes smooth at long lead times.

### Cited Findings
- HKO What's New, "More computer model forecast products available on 'Earth Weather'" (snippet):
  - On 30 June 2025 the Observatory enhanced "Earth Weather" with products from the AI model "Fengwu".
  - The products are 15-day forecasts of surface wind, temperature, mean sea-level pressure and rainfall, plus upper-air wind, temperature, relative humidity and geopotential height.
  - The same update added thunderstorm-potential forecasts for East Asia based on ECMWF EPS.
  - MyObservatory app support was to follow, and model details are in the page's Notes section. — [HKO What's New 109559](https://www.hko.gov.hk/en/Whats-New/109559/More-computer-model-forecast-products-available-on-Earth-Weather)
- A Friends of HKO e-newsletter vol. 98 article covers the 2025 Earth Weather new products (content not read). — [HKO newsletter](https://www.hko.gov.hk/en/education/friends_hko/e-newsletter/vol98/earth_wx_new_product_2025.html)
- HKO's education article "Applications of Artificial Intelligence Models in Weather Forecasting" (snippet):
  - Since mid-2023 HKO has run a series of AI models, including FengWu, in real time and uses them for TC track products.
  - Performance on rare extreme events needs more verification. — [HKO education 00761](https://www.hko.gov.hk/en/education/weather/data-and-technology/00761-Applications-of-Artificial-Intelligence-Models-in-Weather-Forecasting.html)
- HKO's article "Weather Forecast Based on Artificial Intelligence" (snippet): "AI models generally outperformed conventional NWP models in the forecasts of tropical cyclone tracks with smaller errors". This is a preliminary assessment and not specific to FengWu. — [HKO education 00728](https://www.hko.gov.hk/en/education/weather/data-and-technology/00728-Weather-Forecast-Based-on-Artificial-Intelligence.html)
- Press coverage (snippet) describes FengWu, FuXi, Pangu and ECMWF AIFS as models HKO has tested operationally since 2023 for TC prediction. It stresses that the outputs are experimental, can change sharply between runs, and do not replace official track forecasts. — [The Standard 340131](https://www.thestandard.com.hk/news/article/340131/Weather-unsettled-week-with-two-potential-cyclones-on-horizon-Observatory); [Dimsum Daily](https://www.dimsumdaily.hk/ai-models-forecast-twin-cyclones-near-hong-kong/)
- "Operational experience of using AI global models for TC forecasting in the WNP and SCS" (TCRR, 2026) (snippet):
  - HKO says it introduced AI global models operationally for TC forecasting for the first time in 2025.
  - The AI models reduced track errors, converged on the actual track earlier and were more consistent between runs than the selected traditional global NWP models.
  - The paper proposes a grand ensemble of AI and NWP models.
  - The snippet does not show the model list. — [ScienceDirect S222560322600038X](https://www.sciencedirect.com/science/article/pii/S222560322600038X)
- "Advances in TC Monitoring and Forecasting in Hong Kong using Ensemble Predictions and AI" (snippet): adding AI models to HKO's operational ensemble consensus track from 2025 reduced the average 24 to 120 h position errors (preliminary 2025 data). — [ScienceDirect S2225603226000093](https://www.sciencedirect.com/science/article/pii/S2225603226000093)
- "Observational and Forecasting Aspects of Super Typhoon Ragasa in Hong Kong" (snippet): global AI models give generally smaller track errors than physics-based models, while physics-based models remain better for intensity. — [ScienceDirect S2225603226000330](https://www.sciencedirect.com/science/article/pii/S2225603226000330)
- HKO said AI models predicted the path of Typhoon Wutip (June 2025) better than two traditional models. — [Hong Kong Free Press, 17 Jun 2025](https://hongkongfp.com/2025/06/17/artificial-intelligence-predicted-typhoon-wutip-better-than-traditional-computer-models-hong-kong-observatory-says/)
- Ho et al., "Comparative evaluation of data-driven weather forecast models ... TC genesis in 2024", *Weather* (2026) (snippet): "Fengwu tended to give rather smoothed forecasts at longer lead times, illustrated by the significantly decreasing forecast activity of MSLP." — [Wiley wea.70043](https://rmets.onlinelibrary.wiley.com/doi/10.1002/wea.70043?af=R)
- He & Chan, *Weather* (2025): a study of extended-range (10 to 15 day) forecasts by Pangu-Weather and FengWu, focused on China. — [Wiley wea.7648](https://rmets.onlinelibrary.wiley.com/doi/10.1002/wea.7648)
- Related coverage: SCMP articles on AI forecasts and Hong Kong typhoon forecasting. — [SCMP 3318817](https://www.scmp.com/news/hong-kong/health-environment/article/3318817/are-ai-based-forecasts-changing-way-hong-kongs-typhoon-watchers-work); [SCMP 3357567](https://www.scmp.com/tech/article/3357567/chinese-ai-improves-forecasts-as-hong-kong-braces-for-super-typhoons)

### Inferences
- HKO almost certainly runs the public FengWu (0.25°, 6-hourly autoregressive) checkpoint in-house, initialized from an operational analysis (likely ECMWF), and extends it to 15 days. I did not find the initialization source or any local adaptation, such as fine-tuning or bias correction, in snippets. The Notes page would be the place to confirm.

### Gaps
- Not reachable: the full What's New text, Earth Weather Notes (maps.weather.gov.hk/wxviewer/notes.html), a Chinese-language version and the info.gov.hk press release. Still unconfirmed:
  - display resolution
  - initialization data and run times (00/12 UTC?)
  - whether FengWu is fine-tuned locally
  - which other models were on Earth Weather by then (e.g. FuXi, Pangu, AIFS, ECMWF IFS)
- I found no FengWu-specific HKO track-error numbers (km).

## 4. Independent benchmarks (WeatherBench 2, peer-reviewed comparisons)

### Takeaway
I found no evidence that FengWu is in the WeatherBench 2 scorecards. WB2 v0.2.0 added Pangu (operational), GraphCast (operational), FuXi, SphericalCNN and NeuralGCM, and the WB2 paper mentions FengWu only in the literature review. The main independent comparison is an npj Climate & Atmospheric Science (2024) study of five models over East Asia and the Western Pacific, Jun to Nov 2023, with IFS as reference:
- FengWu ranked best overall on RMSE.
- FengWu had the most accurate typhoon tracks up to 144 h but the largest intensity errors.

CMA and Shanghai Typhoon Institute evaluations of six AI models confirm that FengWu, like other AI models, has strong track skill and underestimates intensity.

### Cited Findings
- WB2 release notes for v0.2.0 list the models added as Pangu-Weather (operational), GraphCast (operational), FuXi, SphericalCNN and NeuralGCM. FengWu is absent (snippet). — [ecosyste.ms WB2 releases](https://ost.ecosyste.ms/projects/44180/releases)
- The WB2 paper describes FengWu (2023, vision transformer) as achieving state-of-the-art deterministic scores at longer lead times. This is a citation in the review, not a WB2 entry (snippet). — [arXiv 2308.15560](https://arxiv.org/pdf/2308.15560v2.pdf); [JAMES paper](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023MS004019)
- npj Clim Atmos Sci 2024, "Evaluation of five global AI models for predicting weather in Eastern Asia and Western Pacific" (snippets):
  - The five models were FengWu, FuXi, GraphCast, FCN2 and Pangu-Weather, plus an ensemble, with IFS as reference, over Jun to Nov 2023.
  - Overall ranking: FengWu best, then FuXi and GraphCast, FCN2 behind, Pangu-Weather last.
  - For the 11 typhoons of 2023, "FengWu demonstrates the most accurate track prediction; however, it also has the largest intensity errors."
  - Track errors up to 144 h shrink in this order: Pangu (largest), FCN2, GraphCast, FuXi, FengWu. At 168 h, FengWu's error is higher than FuXi's and slightly higher than GraphCast's.
  - ECMWF IFS sits roughly mid-pack on track error despite the smallest initial position error.
  - The multi-model ensemble is close to FengWu and avoids outliers. — [Nature npj s41612-024-00769-0](https://www.nature.com/articles/s41612-024-00769-0); [ResearchGate](https://www.researchgate.net/publication/384431088_Evaluation_of_five_global_AI_models_for_predicting_weather_in_Eastern_Asia_and_Western_Pacific)
- TCRR 2025, "Verification of AI Models on TC Forecasting over the WNP and SCS in 2024" (snippet):
  - Six AIWP models were evaluated on 5-day TC track and intensity: Fengqing, FengWu, FuXi, Pangu-Weather, AIFS and GraphCast.
  - The models ran in operational trial at the China Meteorological Administration.
  - All showed positive track skill relative to climatology and persistence, and most had large extreme errors at long lead times. — [ScienceDirect S2225603225000475](https://www.sciencedirect.com/science/article/pii/S2225603225000475)
- Shanghai Typhoon Institute (ISTM preprint) evaluated six AI models, FengWu included. Most AIWP models significantly underestimate typhoon intensity, and its hybrid model outperforms them (snippet). — [arXiv 2508.16851](https://arxiv.org/pdf/2508.16851)
- Also relevant, though I did not confirm whether FengWu is included:
  - AIES (2025), "An Operations-Based Evaluation of TC Track and Intensity Forecasts from AIWP Models" (DeMaria et al.; arXiv 2409.06735). — [AMS AIES](https://journals.ametsoc.org/view/journals/aies/4/4/AIES-D-24-0085.1.xml); [arXiv 2409.06735](https://arxiv.org/abs/2409.06735)
  - "Station-Based Evaluation of AI Weather Models ... Eastern Coastal China". — [ResearchGate](https://www.researchgate.net/publication/414134895_Station-Based_Evaluation_of_AI_Weather_Models_for_Near-Surface_Temperature_Pressure_and_Wind_Forecasts_over_Eastern_Coastal_China)
  - "Performance of Five ML-based Global Weather Prediction Models in the East Asia Region". — [ResearchGate](https://www.researchgate.net/publication/379951857_Performance_of_Five_Machine_Learning-based_Global_Weather_Prediction_Models_in_the_East_Asia_Region/fulltext/6622b03f66ba7e2359e94e2b/Performance-of-Five-Machine-Learning-based-Global-Weather-Prediction-Models-in-the-East-Asia-Region.pdf)
- Context on fairness: GraphCast and Pangu WB2 runs are initialized and evaluated with ERA5, which is not available in real time, and that affects comparisons. — [WB2 paper (JAMES)](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023MS004019)
- The 10-day-plus claim comes from the developers, not an independent source: Shanghai AI Lab says FengWu GHR has 0.09° resolution and an 11.25-day skillful lead time, and press coverage repeats the "11.25 day" figure. — [fengwu.intern-ai.org.cn](https://fengwu.intern-ai.org.cn/); [The Standard 323970](https://www.thestandard.com.hk/news/article/323970/)

### Inferences
- Independent evidence consistently shows FengWu as one of the best deterministic models for TC **tracks** in the Western Pacific at 3 to 6 days, and weak on **intensity**, as with all 0.25° AI models trained on ERA5. Its forecasts are blurry or smooth at long lead times, a typical result of training on deterministic MSE loss.
- Because FengWu is not on WB2, there is no standardized global z500/t850 RMSE scorecard against IFS, GraphCast or FuXi. The global RMSE comparisons available are the developers' own (the FengWu paper) or regional.

### Gaps
- Not obtained (full texts unreachable): exact RMSE numbers (z500, t850) and km track errors from the npj, TCRR and HKO papers.
- No ECMWF-published evaluation of FengWu found.
- Did not verify whether the current WB2 site has added FengWu after v0.2.0. Its absence there is from release notes and snippets only.
- Did not verify whether AIFS appears in any FengWu head-to-head besides the CMA 2024 TCRR paper.
