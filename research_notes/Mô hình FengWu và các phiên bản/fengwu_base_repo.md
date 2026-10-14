# FengWu base model (arXiv 2304.02948) and public ONNX release (OpenEarthLab/FengWu)

Research date: 2026-10-14. Access notes: arxiv.org, nature.com, semanticscholar, huggingface, ecmwf, d-nb.info were all blocked from this environment (WebFetch DNS failure / proxy 403). Paper facts below therefore come from search-engine excerpts of the arXiv abstract, the ResearchGate copy and the journal version, not from a full read of the PDF. Repo facts come from a direct `git clone` of github.com/OpenEarthLab/fengwu (full history, 25 commits, HEAD 15891e6, 2025-12-18) and from github.com issue pages read with WebFetch.

## 1. The paper: architecture, data, results, publication

### Takeaway
FengWu (Shanghai AI Lab with collaborators, arXiv 6 Apr 2023) is a deterministic, autoregressive 6-hour, 0.25° transformer. It treats each variable group as a separate "modality", with modality-specific encoders and decoders, a cross-modal transformer fuser, an uncertainty-weighted multi-task loss and a replay buffer. It was trained on about 39 years of ERA5 at 37 pressure levels. The authors claim skill out to 10.75 days (z500 ACC > 0.6) and say it beats GraphCast on 80% of 880 predictands in 2018. A peer-reviewed version appeared in 2025 in *Communications Earth & Environment* under a new title.

### Cited Findings
- arXiv 2304.02948, "FengWu: Pushing the Skillful Global Medium-range Weather Forecast beyond 10 Days Lead", submitted 6 Apr 2023 — [arXiv abs](https://arxiv.org/abs/2304.02948)
- Authors: Kang Chen, Tao Han, Junchao Gong, Lei Bai, Fenghua Ling, Jing-Jia Luo, Xi Chen, Leiming Ma, Tianning Zhang, Rui Su, Yuanzheng Ci, Bin Li, Xiaokang Yang, Wanli Ouyang; released by Shanghai AI Laboratory — [ai-models-fengwu README](https://github.com/OpenEarthLab/ai-models-fengwu)
- Architecture (paper's method overview): "Transformer-based modal-customized encoder-decoders and cross-modal fuser, the uncertainty loss for multi-task optimization, and the replay buffer for long-lead predictions". Weather variables at different pressure levels are treated as distinct modalities — [arXiv](https://arxiv.org/abs/2304.02948), via search excerpt
- A secondary summary (not the paper itself) says there are six modalities: surface, geopotential, humidity, u wind, v wind and temperature. Each has its own transformer encoder. The features are concatenated and fused by a transformer, and separate decoders produce each modality's forecast — search excerpt for [arXiv pdf](https://arxiv.org/pdf/2304.02948)
- Uncertainty loss: described as automatically balancing the many regression tasks (one per variable), each with a learned uncertainty. A secondary source says there are 189 tasks. 189 = 4 surface + 5×37 levels, which matches the 37-level model. I could not confirm the exact formula (e.g. Gaussian NLL with predicted σ versus a learned per-task weight) from primary text — search excerpt, [arXiv](https://arxiv.org/abs/2304.02948)
- Replay buffer: each step's predictions are stored in a fixed-length replay-buffer queue and reused later as training inputs, "which mimics the intermediate input error during the autoregressive inference stage" — paper figure caption, via search excerpt, [arXiv](https://arxiv.org/abs/2304.02948)
- Training data: 0.25° ERA5 "over the past 39 years". It predicts land and atmosphere states at 37 vertical levels on a 0.25° lat-lon grid. The test/hindcast year is 2018 — [arXiv abstract](https://arxiv.org/abs/2304.02948); [ResearchGate copy](https://www.researchgate.net/publication/369855259_FengWu_Pushing_the_Skillful_Global_Medium-range_Weather_Forecast_beyond_10_Days_Lead)
- One search summary gives the journal version's training period as 1979–2017. This is consistent with "39 years", but I did not see an exact train/val split — search excerpt, [Commun. Earth Environ.](https://www.nature.com/articles/s43247-025-02502-y)
- Compute: PyTorch, 32 Nvidia A100 GPUs, about 17 days of training in total (per a summary of the ResearchGate copy) — [ResearchGate](https://www.researchgate.net/publication/369855259_FengWu_Pushing_the_Skillful_Global_Medium-range_Weather_Forecast_beyond_10_Days_Lead)
- Headline results (abstract): 6-hourly hindcasts for 2018 based on ERA5 show FengWu beating GraphCast on 80% of the 880 reported predictands. Example: 10-day global z500 RMSE falls from 733 to 651 m²/s². The abstract also says it extends skillful global medium-range forecasting "out to 10.75 days lead (with ACC of z500 > 0.6) for the first time" — [arXiv](https://arxiv.org/abs/2304.02948)
- The 10.75-day "effective forecast period" is repeated in a 2024 ESCAP/WMO Typhoon Committee presentation — [Typhoon Committee TC56 pdf](https://typhooncommittee.org/56th/docs/item%205/Technical%20PresentationsTC56/10.%20Preliminary%20Explorations%20on%20Data-driven%20AI%20Models%20in%20Tropical%20Cyclone%20Prediction.pdf)
- For context, GraphCast's own headline (beating HRES on 90% of 1,380 targets; beating the previous best ML model on 98.8% of 252 targets) comes from a different evaluation protocol and is not directly comparable — [DeepMind GraphCast](https://deepmind.google/research/publications/graphcast-learned-global-weather-forecasting/)
- Peer-reviewed version: Chen, Han et al., "The operational medium-range deterministic weather forecasting can be extended beyond a 10-day lead time", *Communications Earth & Environment* 6, article 518 (2025), DOI 10.1038/s43247-025-02502-y. According to search excerpts it:
  - describes FengWu at 0.25° and **13 pressure levels**, with the replay buffer;
  - reports deterministic forecasts that outperform ECMWF HRES, Pangu-Weather and GraphCast;
  - adds "FengWu-Ensemble", a conditional diffusion model that produces multi-member forecasts from the deterministic ones and is reported to beat the ECMWF ensemble.

  — [Nature CEE article](https://www.nature.com/articles/s43247-025-02502-y); [ResearchGate](https://www.researchgate.net/publication/393364462_The_operational_medium-range_deterministic_weather_forecasting_can_be_extended_beyond_a_10-day_lead_time)
- Citation sources as of 2024–2026 (Earth2Studio docs, the ai-models plugin README) still cite FengWu as the arXiv preprint — [Earth2Studio FengWu doc](https://nvidia.github.io/earth2studio/modules/generated/models/px/earth2studio.models.px.FengWu.html)
- A 2026 paper notes that long-lead forecasts from the original FengWu become blurred, a typical effect of deterministic MSE-type training — search excerpt, [arXiv 2603.04395](https://arxiv.org/pdf/2603.04395)

### Inferences
- The journal paper (2025) appears to be the peer-reviewed form of the FengWu line. It is reframed around the operational 13-level model plus an ensemble add-on, so its numbers may differ from the arXiv 37-level ERA5 numbers. Cite both and do not mix their metrics.
- Release model: 69 channels = 4 + 5×13. Paper model: 189 = 4 + 5×37. Both are consistent with the "4 surface + 5 upper-air variables" design.

### Gaps
- I could not read the full PDF or HTML (arxiv.org blocked). Unverified: exact parameter count, patch size, embedding dimension and depth; the exact uncertainty-loss formula; replay-buffer length; exact train/val year split; inference time per step; the paper's comparisons with Pangu and IFS HRES; tropical-cyclone results.
- Not verified: the journal version's exact skillful-lead figure, received/accepted/published dates, and its code-availability statement.

## 2. What the GitHub repo OpenEarthLab/FengWu contains (as of 2026-10-14)

### Takeaway
The repo is minimal. It contains only:
- a README;
- one 40-line `inference.py` that uses ONNX Runtime;
- `requirements_gpu.txt`;
- `data_mean.npy` and `data_std.npy` (69 values each).

There is no LICENSE file, no training code and no PyTorch weights. The weights (fengwu_v1/v2.onnx) live on Shanghai AI Lab OneDrive (sharepoint.cn) and a sample input is on Google Drive.

### Cited Findings
- **Files at HEAD.** README.md (3,261 B), inference.py (1,704 B), requirements_gpu.txt (42 B), data_mean.npy (680 B), data_std.npy (680 B). There is no LICENSE file and no input_data folder: an `input.npy`/input_data directory was added and then deleted on 2023-11-16 (commits 445488c, 409dc7b). No releases or tags. About 181 stars, 14 forks, 7 watchers, and only one topic ("model") at time of fetch — [repo](https://github.com/OpenEarthLab/FengWu); git clone
- **Commit history** (25 commits, authors OpenEarthLab, yuchendoudou, LeiBAI):
  - 2023-07-04: initial commit, then README "Paper … Inference code: coming soon".
  - 2023-11-16: inference.py, mean/std files and ONNX links added.
  - 2023-11-24: README states 37 levels for the original and 13 for the release; contact Dr. Lei Bai <bailei@pjlab.org.cn>.
  - 2023-12-18: lat/lon text added saying "longitude range is [-180, 180]".
  - 2024-05-07: v2 is described as "finetune the model with analysis data up to 2021".
  - 2024-07-22: longitude **corrected to [0, 360]**.
  - 2025-01-07: Google Drive sample-data link added.
  - 2025-12-18: large red warning "Use fengwu_v1 for ERA5 evaluation … Use fengwu_v2 for Operational Analysis data evaluation" (also in Chinese: "fengwu_v1.onnx模型仅用于ERA5数据集评估 / fengwu_v2.onnx模型仅用于实时预报Operational Analysis数据集评估").

  — git log of [repo](https://github.com/OpenEarthLab/FengWu)
- **README statement on levels:** "The original version of FengWu has 37 vertical levels. To make it easier for real-time evaluation with operational analysis data, the pre-trained model released here accepts 13 vertical levels." — [README](https://github.com/OpenEarthLab/FengWu)
- **v1 vs v2:** fengwu_v1.onnx is "Fengwu without transfer learning" (ERA5-trained). fengwu_v2.onnx is "Fengwu with transfer learning … finetune the model with analysis data up to 2021". Use v1 for ERA5 evaluation and v2 for operational-analysis (real-time) evaluation. The README does not name the analysis source (e.g. ECMWF IFS analysis vs GFS) — [README](https://github.com/OpenEarthLab/FengWu)
- **Input format:**
  - Two consecutive 6-hourly states, input1 (t−6h) and input2 (t), each 69×721×1440.
  - Latitude runs from 90N to 90S (721 rows, poles included). Longitude runs 0→360 (1440 columns, 0.25°).
  - Channel order: [u10, v10, t2m, msl], then z, q, u, v, t, each at 13 levels [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000] hPa. So index 0–3 is surface, 4–16 z, 17–29 q, 30–42 u, 43–55 v, 56–68 t.
  - The README's written example "[u10, v10, t2m, msl, z50…z1000, q50…q1000, t50…t1000]" omits u and v by typo. The full order is confirmed by Earth2Studio's VARIABLES list and by the magnitudes in data_mean.npy, which I inspected locally: mean z50 ≈ 199,832, i.e. z is **geopotential in m²/s², not geopotential height**; q is in kg/kg; t2m mean ≈ 278.8 K; msl mean ≈ 100,981 Pa.

  — [README](https://github.com/OpenEarthLab/FengWu); [earth2studio fengwu.py](https://github.com/NVIDIA/earth2studio/blob/main/earth2studio/models/px/fengwu.py)
- **Output timing:** per the README, with input1 = 06 UTC and input2 = 12 UTC, the first output is 18 UTC and the second is 00 UTC the next day. Issue #3 (2024-05-19, open) asks the same question: a commenter answered 18:00, but the issue author said their own tests suggested otherwise ("12:00"). No maintainer reply — [README](https://github.com/OpenEarthLab/FengWu); [issue #3](https://github.com/OpenEarthLab/FengWu/issues/3)
- **inference.py, exact behaviour:**
  1. It normalises each input with (x − mean)/std and concatenates them to a tensor of shape (1, 138, 721, 1440), float32, with input name `'input'`.
  2. It loops 56 times: `output = sess.run(None, {'input': input})[0]`, then `input = concat(input[:, 69:], output[:, :69])`, then de-normalises `output[0, :69]`. 56 steps × 6 h = 14 days.
  3. The `np.save` of outputs is commented out, so by default nothing is saved.

  — [inference.py](https://github.com/OpenEarthLab/FengWu/blob/main/inference.py)
- **Known code quirks or bugs** (from reading the code):
  - It loads `'fengwu.onnx'`, but the downloaded files are named fengwu_v1.onnx/fengwu_v2.onnx, so the user must rename the file or edit the script.
  - The model is loaded twice: `onnx.load` plus `InferenceSession`.
  - A comment still says "Initialize onnxruntime session for Pangu-Weather Models" (copied from Pangu's code).
  - Only the CUDAExecutionProvider is listed, so CPU needs a code edit.
  - `intra_op_num_threads = 1`, and memory arena/pattern/reuse are disabled.
  - The README says `pip install -r requirement_gpu.txt`, but the file is named `requirements_gpu.txt`.

  — [inference.py](https://github.com/OpenEarthLab/FengWu/blob/main/inference.py); [README](https://github.com/OpenEarthLab/FengWu)
- **requirements_gpu.txt:** `numpy`, `onnx==1.12.0`, `onnxruntime-gpu==1.14.0` — [repo](https://github.com/OpenEarthLab/FengWu)
- **Output channel count.** Earth2Studio's wrapper allocates the ONNX output buffer "like" the 138-channel normalised input, so the output is (B, 138, 721, 1440), and keeps `[:, :69]`. Its code comment reads "ONNX model outputs two time-steps, take the first". So the output does have 138 channels — [earth2studio fengwu.py](https://github.com/NVIDIA/earth2studio/blob/main/earth2studio/models/px/fengwu.py)
- **Meaning of channels 69–137.** GitHub issue #4 "Likelihood computation" (nbren12, 2024-07-17, open) asks: "Are the final 69 channels in the output related to the noise levels? Seems like they might be log(sigma), but not sure." There is no maintainer answer — [issue #4](https://github.com/OpenEarthLab/FengWu/issues/4)
- **Other issues** (6 in total; none has a maintainer reply that I could see):
  - #1 (2024-03-12): asks when FengWu-4DVar code will be released.
  - #2 (2024-04-24): asks where to get input_data (later partly answered by the Google Drive link added in Jan 2025).
  - #5 (closed 2024-11-15): a FuXi/tp06 index error, off-topic.
  - #6 (2026-01-12): asks for the original PyTorch .pt/.pth checkpoint used to export fengwu_v1.onnx, which is not public.

  None of the issues discuss VRAM, CPU feasibility, runtime or GFS input — [issues list](https://github.com/OpenEarthLab/FengWu/issues?q=is%3Aissue); [issue #1](https://github.com/OpenEarthLab/FengWu/issues/1); [issue #2](https://github.com/OpenEarthLab/FengWu/issues/2); [issue #6](https://github.com/OpenEarthLab/FengWu/issues/6)
- **Hardware hint:** Earth2Studio tags its FengWu wrapper with the badge `gpu:40gb` and backend onnx. It loads `fengwu_v1.onnx` (not v2) with its own `global_means.npy`/`global_stds.npy` — [earth2studio fengwu.py](https://github.com/NVIDIA/earth2studio/blob/main/earth2studio/models/px/fengwu.py)
- **ECMWF ai-models plugin** (OpenEarthLab/ai-models-fengwu, commits 2024-02-26 → 2024-03-03):
  - Runs the same ONNX graph via `pip install ai-models-fengwu`, with the same normalisation and the same `output[:, :69]` loop.
  - Pulls its input from MARS/CDS through ai-models, using params 10u, 10v, 2t, msl plus z, q, u, v, t at 13 levels, a 0.25° grid, area [90, 0, −90, 360], and lagged inputs [−6, 0] h. This is the practical route for using IFS analysis as input.
  - Downloads `fengwu.onnx` plus the mean/std files from `https://get.ecmwf.int/repository/test-data/ai-models/fengwu/`. The plugin does not say which version (v1 or v2) this file is.
  - Its only issue (#1, 2024-06-18) is a pip-install failure.

  — [ai-models-fengwu](https://github.com/OpenEarthLab/ai-models-fengwu); [model.py](https://github.com/OpenEarthLab/ai-models-fengwu/blob/main/ai-models-fengwu/model.py)

### Inferences
- **What channels 69–137 probably are.** Training used an "uncertainty loss" and the output has 138 = 2×69 channels, so the second half is most plausibly the per-variable predicted uncertainty (e.g. log σ) used in that loss. Earth2Studio's comment instead calls it a second time step. Neither interpretation is confirmed by the authors. Both official scripts discard these channels.
- **Memory.** Each input/output tensor is 1×138×721×1440 float32 ≈ 573 MB; activations dominate. Earth2Studio's 40 GB GPU badge suggests an A100-40GB/A6000-class card. CPU inference with ORT is possible in principle (switch to CPUExecutionProvider), but there is no official runtime figure.
- **GFS input.** No official guidance or issue covers GFS input. The model expects ERA5/IFS-analysis-like fields in exact units and order (geopotential, not height; specific humidity in kg/kg; latitude north→south; longitude 0–360). Using GFS would mean regridding to 0.25°, converting units and probably using v2, with skill unvalidated. This is my inference.

### Gaps
- I could not access the ONNX file sizes or opset (sharepoint.cn, huggingface.co and get.ecmwf.int were blocked; no source found). No source states official VRAM, CPU feasibility or runtime per step.
- Which analysis product v2 was fine-tuned on (IFS operational analysis is likely, given the ECMWF plugin, but unconfirmed), and over which years.
- No GitHub Discussions content was found. The issues contain no maintainer answers.

## 3. License and terms of use

### Takeaway
The main FengWu repo has **no LICENSE file**, so legally no rights are granted for its code. The authors' companion ai-models plugin states the **weights are CC BY-NC-SA 4.0 with commercial use forbidden**, and the plugin code itself is Apache-2.0.

### Cited Findings
- The OpenEarthLab/FengWu repo has no LICENSE file in the tree at any commit, and no license is shown in the GitHub sidebar — git clone; [repo](https://github.com/OpenEarthLab/FengWu)
- The ai-models-fengwu README says: "The trained parameters of FengWu are made available under the terms of the BY-NC-SA 4.0 license. The commercial use of these models is forbidden." The repo's LICENSE file is Apache 2.0, setup.py declares "Apache License Version 2.0", and model.py carries an ECMWF © 2023 Apache-2.0 header — [ai-models-fengwu](https://github.com/OpenEarthLab/ai-models-fengwu)
- A Hugging Face mirror "OneScience/FengWu" is labelled apache-2.0 and claims the model is used operationally by the Hong Kong Observatory. This third-party label conflicts with the authors' CC BY-NC-SA statement — search result, [HF OneScience/FengWu README](https://huggingface.co/OneScience/FengWu/blob/main/README.md) (not opened; huggingface blocked)

### Inferences
- For the final report: treat the weights as non-commercial (CC BY-NC-SA 4.0) and the inference code as unlicensed, though trivial. The Apache-2.0 tag on third-party mirrors should not be relied on.

### Gaps
- No explicit license statement is in the main repo README. I did not read the HF mirror's content to check provenance.

## 4. Where the weights and sample data are hosted, and mirrors

### Takeaway
Official weights are on Shanghai AI Lab OneDrive (pjlab-my.sharepoint.cn). Sample input .npy files are on Google Drive. Secondary mirrors exist at ECMWF (get.ecmwf.int, for the ai-models plugin), Hugging Face NickGeneva/earth_ai (used by Earth2Studio, v1) and OneScience/FengWu on Hugging Face.

### Cited Findings
- v1: https://pjlab-my.sharepoint.cn/:u:/g/personal/chenkang_pjlab_org_cn/EVA6V_Qkp6JHgXwAKxXIzDsBPIddo5RgDtGCBQ-sQbMmwg
- v2: https://pjlab-my.sharepoint.cn/:u:/g/personal/chenkang_pjlab_org_cn/EZkFM7nQcEtBve6MsqlWaeIB_lmpa__hX0I8QYOPzf-X6A

  Both are on OneDrive under chenkang_pjlab_org_cn; the links have been unchanged since 2023-11 apart from removal of the `?e=` tokens — [README](https://github.com/OpenEarthLab/FengWu)
- Sample data (added 2025-01-07): https://drive.google.com/drive/folders/11i_l-mEQ7K5OcfbZd9jeBpfr_BGen9M0 — [README](https://github.com/OpenEarthLab/FengWu)
- ECMWF mirror: `https://get.ecmwf.int/repository/test-data/ai-models/fengwu/{fengwu.onnx, data_mean.npy, data_std.npy}` — [model.py](https://github.com/OpenEarthLab/ai-models-fengwu/blob/main/ai-models-fengwu/model.py)
- Earth2Studio package: `hf://NickGeneva/earth_ai/fengwu`, containing fengwu_v1.onnx, global_means.npy and global_stds.npy — [earth2studio fengwu.py](https://github.com/NVIDIA/earth2studio/blob/main/earth2studio/models/px/fengwu.py)
- HF OneScience/FengWu and OneScience-Group/FengWu exist (search results) — [HF](https://huggingface.co/OneScience/FengWu)

### Inferences
- sharepoint.cn may be slow or blocked outside China. The ECMWF and Earth2Studio mirrors are practical alternatives, but the ECMWF file is just "fengwu.onnx" with no version label.

### Gaps
- The checksums and file sizes of the ONNX files could not be obtained.
- I could not verify whether the ECMWF mirror is v1 or v2.
