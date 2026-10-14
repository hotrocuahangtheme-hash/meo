# FengWu variants for data assimilation and high resolution: FengWu-4DVar, FengWu-Adas, FengWu-GHR (plus related OpenEarthLab repos)

Method note: arxiv.org, proceedings.mlr.press, alphaxiv, shlab.org.cn and Semantic Scholar were blocked from this environment (proxy 403 / DNS fail), so paper facts come from web-search snippets of those pages. GitHub repos were cloned read-only (git, `--depth`) into the scratchpad and read file by file; the GitHub REST API (issues, org listing) was refused, but the org repo list was obtained via the GitHub MCP search tool (`org:OpenEarthLab`, 13 repos). No code was run and no weights were downloaded.

## FengWu-4DVar (arXiv 2312.12455 / ICML 2024): paper, method, resolution, repo contents, weights, standalone use

### Takeaway
FengWu-4DVar couples a ~1.4° (128x256) "FengWu-lite" Swin-transformer forecast model with strong-constraint 4DVar, using autograd in place of a hand-written adjoint. It was tested only on simulated observations taken from ERA5. The ICML 2024 version is titled "Towards a Self-contained Data-driven Global Weather Forecasting Framework". The official repo (OpenEarthLab/FengWu-4DVar) is a 5-commit research dump from 2 June 2024. It has no LICENSE, no requirements file and no model weights, and it depends on Shanghai AI Lab's internal storage client (petrel_client) and SLURM cluster, so it cannot run standalone.

### Cited Findings
**Paper / venue**
- arXiv 2312.12455 is titled "FengWu-4DVar: Coupling the Data-driven Weather Forecasting Model with 4D Variational Assimilation". Authors in the repo citation are Yi Xiao, Lei Bai, Wei Xue, Kang Chen, Tao Han and Wanli Ouyang (2023); the arXiv HTML carries a CC BY-NC-ND 4.0 license — [AI-VarDA README citation](https://github.com/xiaoyi018/AI-VarDA); [arXiv HTML](https://arxiv.org/html/2312.12455v1)
- The ICML 2024 version is "Towards a Self-contained Data-driven Global Weather Forecasting Framework" by Yi Xiao, Lei Bai, Wei Xue, Hao Chen, Kun Chen, Tao Han, Wanli Ouyang et al., PMLR vol. 235, pp. 54255–54275 (ICML poster 33791). OpenReview id is Y2WorV5ag6 — [PMLR](https://proceedings.mlr.press/v235/xiao24a.html); [ICML virtual](https://ICML.cc/virtual/2024/poster/33791); [ACM DL](https://dl.acm.org/doi/abs/10.5555/3692070.3694298); [AI-VarDA README](https://github.com/xiaoyi018/AI-VarDA)
- So yes, the work appeared at ICML 2024, but under a different title from the arXiv preprint.
- The work was also presented at EGU 2024 (EGU24-2857) as "Coupling the Data-driven Weather Forecasting Model with 4D Variational Assimilation" — [EGU24](https://meetingorganizer.copernicus.org/EGU24/EGU24-2857.html)

**Method and results**
- FengWu is coupled with 4DVar in a cyclic assimilation–forecast system. Auto-differentiation of the deep model removes the need to build an adjoint model — [ar5iv mirror](https://ar5iv.labs.arxiv.org/html/2312.12455); [PMLR](https://proceedings.mlr.press/v235/xiao24a.html)
- Experiments used ERA5-simulated observations at different proportions and noise levels. The system produced accurate analyses and ran a stable self-contained global forecast cycle for a full year. It is reported as roughly 100x faster than traditional 4DVar under similar conditions — [ACM DL / ICML abstract](https://dl.acm.org/doi/abs/10.5555/3692070.3694298)
- EGU 2024 abstract (prototype): FengWu at 1.4° with 15% observation coverage and a 6-hour window ran stably for at least one year. Average z500 analysis RMSE was below 25 m²/s², and each 6-hour assimilation took under 30 s on a single NVIDIA A100 — [EGU24](https://meetingorganizer.copernicus.org/EGU24/EGU24-2857.html)
- The paper is evaluated against ERA5 "truth" with simulated observations. I found no reported head-to-head skill comparison against IFS or IFS-HRES; the reference baseline is traditional 4DVar cost and speed.

**Repo contents (cloned, commit 6cc7e1e)**
- Commit history has 5 commits, all on 2024-06-02: "Create .gitignore", "first commit" (author xiaoyi), "Update README", and deletions of `__pycache__` and `.DS_Store` — [GitHub repo](https://github.com/OpenEarthLab/FengWu-4DVar)
- The GitHub description is "Integrating Large Weather Models with Data Assimilation". The repo has about 26 stars, no license field, was created 2024-05-25 and last pushed 2024-06-02 — [GitHub repo](https://github.com/OpenEarthLab/FengWu-4DVar) (via GitHub search metadata)
- Full file list:
  - `README` (130 bytes)
  - `cyclic_da.py` (about 20 KB, main DA cycle)
  - `cyclic_da_script.sh`
  - `networks/transformer.py` (`LGUnet_all`)
  - `networks/utils/swinblock.py`
  - `utils/{builder,logger,metrics,metrics_bk,misc}.py`
  - `dataset/bq_info/q1..q5.npy` + `len_scale.npy` (static background-error covariance coefficients, about 18 MB each)
  - `dataset/layer_mean.npy`, `dataset/layer_std.npy`
  - `dataset/mask_random_005/010/015.npy` (5/10/15% random observation masks)
  - two `output/model/*/training_options.yaml` configs
  - There is no LICENSE, no requirements.txt or setup file, and no `.pth` checkpoint — [GitHub repo](https://github.com/OpenEarthLab/FengWu-4DVar)
- The full README reads: "Checkpoints for 1h and 6h FengWu and ERA5 dataset are required to run this script. To run FengWu-4DVar: bash cyclic_da_script.sh". It gives no download links for the checkpoints — [GitHub repo](https://github.com/OpenEarthLab/FengWu-4DVar)
- The code loads `output/model/<name>/checkpoint_best.pth` for a 1-hour "flow model" (`world_size16-model-37years-stride1`, used inside the 4DVar window) and a 6-hour "forecast model" (`world_size8-model-37years-stride6`). Neither file is in the repo — [cyclic_da.py](https://github.com/OpenEarthLab/FengWu-4DVar/blob/main/cyclic_da.py)

**Resolution and backbone**
- Configs set `data_dir: s3://era5_np128x256` and `img_size: [128, 256]`, which is about 1.4°.
- There are 69 channels: u10, v10, t2m, msl, plus z/q/u/v/t at 13 levels (50–1000 hPa).
- The backbone is `LGUnet_all`, a Swin-window transformer: enc_dim 96, embed_dim 1152, window 4, patch 2x2, Possloss.
- Training was on 37 years of ERA5, and the output path is named "fengwu-lite".
- Cluster settings: AdamW lr 5e-4, 50 epochs, world_size 16 (1h model) / 8 (6h model) — [training_options.yaml](https://github.com/OpenEarthLab/FengWu-4DVar/tree/main/output/model)

**DA algorithm**
- `--da_mode` accepts free_run or sc4dvar (strong-constraint 4DVar).
- Defaults: 6-h window, 3 outer iterations, torch LBFGS with strong_wolfe (history 10, max_iter 5), obs_std 0.001 in normalized units, obs_type random_015.
- The test period is 2018-01-01 to 2018-12-31.
- Imports include `torch_harmonics` and `petrel_client.client` (Shanghai AI Lab internal Ceph/S3 client); ERA5 is read from `s3://era5_np128x256` — [cyclic_da.py](https://github.com/OpenEarthLab/FengWu-4DVar/blob/main/cyclic_da.py)

**Hardware**
- `cyclic_da_script.sh` launches 1 GPU with 4 CPUs via `srun -p ai4earth --quotatype=spot`, which is Shanghai AI Lab's internal SLURM partition — [cyclic_da_script.sh](https://github.com/OpenEarthLab/FengWu-4DVar/blob/main/cyclic_da_script.sh)

**Issues**
- I could not read the issue list because the GitHub API was blocked for this repo in this session. The repo has had no commits since 2024-06-02.

**Maintained successor: AI-VarDA**
- AI-VarDA (github.com/xiaoyi018/AI-VarDA, personal repo of first author Yi Xiao, commits 2025-05-31 to 2025-06-01) is a modular variational DA framework. It covers 3DVar, 4DVar, GEN_BE, VAE-Var and LoRA-EnVar, includes `networks/fengwu_lr` and `networks/fengwu_hr`, and cites FengWu-4DVar, the ICML 2024 paper and VAE-Var — [AI-VarDA](https://github.com/xiaoyi018/AI-VarDA)
- AI-VarDA ships only small statistics files (GEN_BE eigenvectors, length scales, err_std). It includes no FengWu forecast checkpoints and no LICENSE file. Its TODO list includes real station observations, satellite/radar, and coupling with DiffDA/APPA — [AI-VarDA](https://github.com/xiaoyi018/AI-VarDA)

### Inferences
- The repo is a research snapshot, not a runnable release. To run it you would need to:
  - train your own 1-h and 6-h 128x256 FengWu-lite models (the public FengWu ONNX is 0.25° 6-h and does not match);
  - replace petrel_client/S3 I/O with local files;
  - remove the SLURM wrapper;
  - work out dependencies yourself (torch, torch_harmonics, pandas, yaml, tensorboard).
- Without a LICENSE file, default copyright applies. Legally, the code is "source-available" only: there is no explicit permission to reuse or modify it.
- Its resolution (1.4°) is far coarser than operational DA. The setup is an OSSE (simulated observations), so it is not a demonstration with real observations.

### Gaps
- Exact ICML camera-ready numbers (RMSE tables, observation fractions, whether 0.25° experiments were added) are not confirmed because PMLR/arXiv were unreachable.
- I could not inspect the GitHub issues.
- No public 1h/6h FengWu-lite checkpoints were found.

## FengWu-Adas (arXiv 2312.12462): existence, paper, method, data, skill, code/weights

### Takeaway
"FengWu-Adas" does exist. It is the official name used by the OpenEarthLab/FengWu-Adas repo for the paper "Towards an end-to-end artificial intelligence driven global weather forecasting system" (arXiv 2312.12462). The first author is Kun Chen, not Xiao; Xiao's paper is 2312.12455. Adas is a 0.25° (721x1440) AI assimilation model that ingests sparse observations (simulated or real GDAS conventional observations) together with a FengWu background. The paper claims that with real-world GDAS observations the system reaches a skillful z500 lead time beyond 8.75 days, exceeding IFS. Code and four Adas checkpoints (Google Drive) are public, but the repo has no LICENSE.

### Cited Findings
**Paper**
- Title: "Towards an end-to-end artificial intelligence driven global weather forecasting system", arXiv 2312.12462, first submitted 18 Dec 2023 and revised to v4 (Dec 2025). It is listed under physics.ao-ph with cs.AI and cs.LG.
- The v4 author list is Kun Chen, Lei Bai, Fenghua Ling, Peng Ye, Tao Chen, Hang Fan, Hao Chen, Yi Xiao, Kang Chen, Tao Han, Jing-Jia Luo and Wanli Ouyang — [arXiv abs](https://arxiv.org/abs/2312.12462); [arXiv v4](https://arxiv.org/abs/2312.12462v4)
- The repo BibTeX lists a shorter early author set: Chen, Bai, Ling, Ye, Chen, Chen, Han, Ouyang — [FengWu-Adas README](https://github.com/OpenEarthLab/FengWu-Adas)
- No peer-reviewed venue or journal_ref was found; it appears to remain an arXiv preprint as of these searches — [arXiv abs](https://arxiv.org/abs/2312.12462)

**Method**
- Adas uses gated convolution to handle sparse observations and gated cross-attention to capture background–observation interactions.
- Both modules are guided by a confidence matrix with values from 0 to 1 per observation.
- FengWu provides the background, and the Adas analysis becomes FengWu's initial state in a cycle — [arXiv HTML v2](https://arxiv.org/html/2312.12462v2)

**Skill**
- Abstract: forecast skill is comparable to IFS. Adas produces high-quality analyses from conventional observations and keeps the system stable over long periods — [arXiv abs](https://arxiv.org/abs/2312.12462)
- v3: "forecasts based on the analyses generated by AI with a skillful forecast lead time of more than 8.75 days, which exceeds that of the IFS for the first time". Skillful here means z500 ACC = 0.6 — [arXiv HTML v3](https://arxiv.org/html/2312.12462v3)
- Against IFS-HRES: FengWu-Adas is slightly worse at short lead times and better at longer leads (lower medians and IQRs). At a 10-day lead, IFS-HRES shows large errors over North America, where FengWu-Adas does better — [arXiv PDF](https://arxiv.org/pdf/2312.12462)
- Speed: Adas inference takes about 0.6 s per assimilation on an NVIDIA Tesla A100, and FengWu takes about 1.5 s per 6-h step — [arXiv PDF](https://arxiv.org/pdf/2312.12462)
- Data: an ERA5 subset spanning 39 years (1979–2017) is used for training and evaluation — [search snippet of 2312.12462](https://arxiv.org/html/2312.12462v1)

**Repo (cloned, commit 22324b3)**
- Commit history: "Initial commit" by LeiBAI on 2024-10-17, then code by "kunc3301"/ChenKun on 2025-01-13 and 2025-01-14. The repo has about 9 stars and no license — [GitHub](https://github.com/OpenEarthLab/FengWu-Adas)
- Files: `README.md`, `train.py`, `inference.py`, `models/Adas.py` and `models/modules.py`, `datasets/era5_npy_f32.py` with mean_std JSONs, `utils/*`, `configs/training_options.yaml`, and `data/igra/igra_t850.json` / `igra_z500.json` (processed IGRA radiosonde verification data, about 13–14 MB each). The `data/era5` and `data/gdas` folders are empty placeholders. There is no LICENSE or requirements file — [GitHub](https://github.com/OpenEarthLab/FengWu-Adas)
- Config: `img_size [69, 721, 1440]` (0.25°), dim 192, patch (1,6,6), window (2,5,10), depth 8, 8 heads, abs pos-embed, UnifyMAE loss, AdamW/OneCycle lr 1e-4. It uses the same 69 variables as FengWu (13 levels) — [configs/training_options.yaml](https://github.com/OpenEarthLab/FengWu-Adas/blob/main/configs/training_options.yaml)
- Weights: the README links Google Drive checkpoints for Adas trained on GDAS conventional observations and on 10%, 1% and 0.1% simulated observations. It also links the 721x1440 FengWu ONNX forecast model — [FengWu-Adas README](https://github.com/OpenEarthLab/FengWu-Adas)
- Inputs and environment: ERA5 comes from the CDS, GDAS conventional observations from the NOAA NCEI Archive Information Request System, and IGRA from NCEI. The stated environment is Python 3.8.18 and torch==1.13.1+cu117 — [FengWu-Adas README](https://github.com/OpenEarthLab/FengWu-Adas)
- Training defaults to `torchrun --nproc_per_node=8` (multi-node supported). Evaluation needs 1 GPU. `--pred_len=40` gives a 10-day end-to-end forecast, and `--eval_data='igra'` verifies against radiosondes — [FengWu-Adas README](https://github.com/OpenEarthLab/FengWu-Adas)

### Inferences
- FengWu-Adas is the most "runnable" of the three variants. Code, Adas checkpoints and the FengWu ONNX model are all available, and inference fits on 1 GPU. The A100 timing suggests a high-memory GPU; a 721x1440x69 transformer with checkpointing likely needs about 40–80 GB, but the exact VRAM requirement is not stated.
- Licensing is unclear. The repo has no LICENSE file. The FengWu weights themselves are covered by the main FengWu repo's terms, and that repo also has no LICENSE file.
- The "exceeds IFS" claim rests on a z500 ACC=0.6 lead-time metric. It comes from an unreviewed preprint whose abstract wording changed between versions (v1 said "comparable to IFS").

### Gaps
- The exact v4 abstract wording and any 2025–2026 journal publication are unconfirmed.
- The real-observation evaluation period is not confirmed here.
- Reported VRAM is not stated.
- GitHub issues could not be read.

## Other FengWu-family assimilation work (FNP, VAE-Var, DiffDA, "FengWu-DA", "4DVarFormer")

### Takeaway
Beyond 4DVar and Adas, the Shanghai AI Lab group has published two related assimilation papers. FNP (NeurIPS 2024, arbitrary-resolution DA, code public) and VAE-Var (ICLR 2025, code in AI-VarDA) both use FengWu as the background model. DiffDA is an external work (a diffusion DA model, arXiv 2401.05932) that serves as a baseline, not a FengWu product. I found no evidence of models named "FengWu-DA" or "4DVarFormer".

### Cited Findings
- FNP: "Fourier Neural Processes for Arbitrary-Resolution Data Assimilation", NeurIPS 2024. Its repo includes configurations for Adas, ConvCNP and FNP and uses a 128x256 FengWu ONNX model (Google Drive) for backgrounds. The environment is Python 3.8.18 / torch 1.13.1. The repo was created 2024-10-20, has about 14 stars and no LICENSE — [FNP repo](https://github.com/OpenEarthLab/FNP); [NeurIPS proceedings](https://proceedings.neurips.cc/paper_files/paper/2024/hash/f93d03f2ad836c815b7ca60dfbe23bf8-Abstract-Conference.html)
- FNP handles observations at resolutions it was not trained on, without fine-tuning — [arXiv 2406.01645](https://arxiv.org/html/2406.01645)
- VAE-Var: "Variational Autoencoder-Enhanced Variational Methods for Data Assimilation in Meteorology", ICLR 2025, by Yi Xiao, Qilong Jia, Kun Chen, Lei Bai and Wei Xue. Paired with FengWu, it reportedly outperforms DiffDA and two traditional baselines — [ICLR 2025 poster](https://iclr.cc/virtual/2025/poster/27950); [AI-VarDA citation](https://github.com/xiaoyi018/AI-VarDA)
- DiffDA ("a Diffusion Model for Weather-scale Data Assimilation", arXiv 2401.05932) is listed in AI-VarDA's TODO as an external method to integrate — [AI-VarDA](https://github.com/xiaoyi018/AI-VarDA); [DiffDA](https://arxiv.org/pdf/2401.05932)
- DAMBench (arXiv 2511.01468, a multimodal benchmark for deep-learning atmospheric DA) appeared in Adas-related search results — [DAMBench](https://arxiv.org/pdf/2511.01468)

### Inferences
- The lineage is FengWu-4DVar (variational with AI forecast model), then VAE-Var / AI-VarDA (learned background error), plus Adas and then FNP (end-to-end learned analysis).

### Gaps
- I did not verify whether DAMBench is from Shanghai AI Lab.
- No "FengWu-DA" or "4DVarFormer" was found under the FengWu name; these names may not exist.

## FengWu-GHR (arXiv 2402.00059): 0.09° kilometer-scale model

### Takeaway
FengWu-GHR (28 Jan 2024; Tao Han, ..., Lei Bai) is presented as the first data-driven global model at 0.09° (about 9 km, 2001x4000 grid). It inherits knowledge from a pretrained 0.25° meta model through a spatial-transfer scheme and is fine-tuned on ECMWF operational analysis. In the 2022 hindcast it beat IFS-HRES on 91.3% of 320 variable/lead combinations. No official code or weights were found in any OpenEarthLab repo, there is no evidence of a peer-reviewed venue, and I found no confirmed public operational deployment.

### Cited Findings
**Paper**
- "FengWu-GHR: Learning the Kilometer-scale Medium-range Global Weather Forecasting", arXiv 2402.00059, submitted 28 January 2024.
- Authors: Tao Han, Song Guo, Fenghua Ling, Kang Chen, Junchao Gong, Jingjia Luo, Junxia Gu, Kan Dai, Wanli Ouyang and Lei Bai. They are mainly from Shanghai AI Laboratory, with HKUST and Nanjing University of Information Science and Technology also listed — [Semantic Scholar](https://www.semanticscholar.org/paper/FengWu-GHR:-Learning-the-Kilometer-scale-Global-Han-Guo/2eacf25564e7835ff71ffa2603c234fd1435a3ee); [arXiv abs](https://arxiv.org/abs/2402.00059); [Shanghai AI Lab news](https://www.shlab.org.cn/news/5443874)

**Resolution and method**
- The model runs at 0.09° on a 2001x4000 grid, aligned closely with operational IFS-HRES — [arXiv HTML](https://arxiv.org/html/2402.00059v1)
- It inherits prior knowledge from a pretrained low-resolution model. The low-resolution meta model is a ViT pretrained on 0.25° ERA5 (1979–2021) — [arXiv abs](https://arxiv.org/abs/2402.00059); [Moonlight review (secondary)](https://www.themoonlight.io/en/review/fengwu-ghr-learning-the-kilometer-scale-medium-range-global-weather-forecasting)
- Spatial transfer (SIME): high-resolution fields are split into overlapping patches that are shrunk to the meta model's input size. "Regional Enhanced Simulation" modules are inserted. Fine-tuning uses about 9 km ECMWF operational analysis from 2016–2022 — [Moonlight review (secondary)](https://www.themoonlight.io/en/review/fengwu-ghr-learning-the-kilometer-scale-medium-range-global-weather-forecasting)
- The model has more than 4 billion trainable parameters — [search snippet of arXiv full text / AlphaXiv](https://www.alphaxiv.org/abs/2402.00059). This comes from secondary snippets; another search did not surface it.

**Skill**
- In the 2022 hindcast, FengWu-GHR is superior to IFS-HRES on 91.3% of 320 targets (8 variables x 40 six-hour lead steps out to 10 days). RMSE and ACC are scored against ECMWF operational analysis on the 0.09° grid — [arXiv HTML](https://arxiv.org/html/2402.00059v1)
- Station observations and extreme-event case studies are also used as evidence. A third-party summary reports about 0.9 °C lower surface temperature error than IFS-HRES in December 2022 — [arXiv abs](https://arxiv.org/abs/2402.00059); [Semantic Scholar/search summary](https://www.semanticscholar.org/paper/FengWu-GHR:-Learning-the-Kilometer-scale-Global-Han-Guo/2eacf25564e7835ff71ffa2603c234fd1435a3ee)
- Secondary only (AlphaXiv summary, unverified): 18,150 stations, z500 RMSE gains of 11.5–21.7% at 5–10 day leads, and T850 RMSE 3.76 K vs 2.86 K at 10 days — [AlphaXiv](https://www.alphaxiv.org/abs/2402.00059)
- A secondary summary reports lower bias drift than other ML weather models — [Moonlight review (secondary)](https://www.themoonlight.io/en/review/fengwu-ghr-learning-the-kilometer-scale-medium-range-global-weather-forecasting)

**Code and weights**
- None of the 13 OpenEarthLab repos is FengWu-GHR. The repos are:
  - FengWu
  - CasCast
  - EarthLink
  - PredBench
  - ORCA-DL
  - AI-for-Earth-Paper-List
  - FengWu-4DVar
  - FNP
  - FengWu-Adas
  - ai-models-fengwu
  - openearthlab.github.io
  - GuanXiang
  - Yushi
  - Source: [OpenEarthLab org](https://github.com/OpenEarthLab) (GitHub search listing)
- The main FengWu repo (last README update 2025-12-18) releases only the 0.25°, 13-level `fengwu_v1.onnx` (ERA5) and `fengwu_v2.onnx` (fine-tuned on operational analysis up to 2021). It does not mention GHR and has no LICENSE file — [FengWu repo](https://github.com/OpenEarthLab/FengWu)
- A third-party reimplementation exists: "GSoC 2024 @ OpenClimateFix: Implementation of FengWu-GHR" — [gist](https://gist.github.com/rnwzd/94a3d13d244ec85d90630ee52f62c78b) (content not read)
- Operational use: no source found confirming operational deployment. A search for 2025 operational status returned nothing.

### Inferences
- FengWu-GHR is effectively closed: there are no weights and no official code. Its comparisons against IFS-HRES use the authors' own verification against ECMWF operational analysis, and the preprint shows no sign of peer review.
- Inference at 2001x4000 with more than 4B parameters would need multi-GPU datacenter hardware. This is an inference from the size; no hardware figure was found.

### Gaps
- Training hardware, inference time and memory are not found.
- Exact per-variable scores, journal publication (2025–2026) and operational use are unconfirmed.
- The OpenClimateFix gist was not read.

## Other OpenEarthLab / FengWu-family repos

### Takeaway
The OpenEarthLab org has 13 public repos. FengWu-relevant ones are FengWu (0.25° ONNX weights), ai-models-fengwu (the only Apache-2.0 repo, an ECMWF ai-models plugin), FengWu-4DVar, FengWu-Adas and FNP. The newer GuanXiang ("observation-driven model families", created 2026-08-28) and Yushi (2026) repos are empty or near-empty.

### Cited Findings
- Repos with stars, license and created/last-push dates (source: [OpenEarthLab org](https://github.com/OpenEarthLab), GitHub search metadata):
  - FengWu: 181 stars, no license, created 2023-07-04, last push 2025-12-18
  - CasCast: 76 stars, 2024
  - EarthLink: 49 stars, "Self-Evolving AI Agent System for Climate Science", 2025–2026
  - PredBench: ECCV 2024
  - ORCA-DL: Science Advances, ocean seasonal-decadal, last push 2026-07
  - AI-for-Earth-Paper-List
  - FengWu-4DVar: 26 stars
  - FNP: 14 stars
  - FengWu-Adas: 9 stars
  - ai-models-fengwu: 5 stars, Apache-2.0, 2024-02/03
  - openearthlab.github.io
  - GuanXiang: 0 stars, created 2026-08-28
  - Yushi: 0 stars, created 2026-02-04, last push 2026-05-12
- The GuanXiang repo contains only a README: "Official repository of the observation-driven model families." — [GuanXiang](https://github.com/OpenEarthLab/GuanXiang)
- The FengWu README warns: use `fengwu_v1` only for ERA5 evaluation and `fengwu_v2` only for operational analysis — [FengWu repo](https://github.com/OpenEarthLab/FengWu)
- FengWu-W2S (arXiv 2411.10191, weather-to-subseasonal) is another FengWu-family paper — [arXiv](https://arxiv.org/pdf/2411.10191)

### Inferences
- GuanXiang suggests a 2026 move toward observation-driven (assimilation-free) forecasting at Shanghai AI Lab. The repo has no content yet.

### Gaps
- The contents of the Yushi and ai-models-fengwu repos were not read in detail.
- GuanXiang's associated paper was not identified.
