import os
import sys
import traceback
from pathlib import Path
from typing import List, Optional

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")
OUTPUT_DIR = os.path.join(BASE_DIR, "output_prod")

DIGITALISED_DIR = os.path.join(OUTPUT_DIR, "digitalised")
NORMALISED_DIR = os.path.join(OUTPUT_DIR, "normalised")
RECTIFIED_DIR = os.path.join(OUTPUT_DIR, "rectified")

os.makedirs(DIGITALISED_DIR, exist_ok=True)
os.makedirs(NORMALISED_DIR, exist_ok=True)
os.makedirs(RECTIFIED_DIR, exist_ok=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

stage0_net = None
stage1_net = None
stage2_net = None


class ProcessResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    series_shape: Optional[List[int]] = None
    series: Optional[List[List[float]]] = None
    npy_file: Optional[str] = None
    normalised_image: Optional[str] = None
    rectified_image: Optional[str] = None
    plot_4leads: Optional[str] = None
    plot_12leads: Optional[str] = None
    plot_full_lead_ii: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    device: str
    models_loaded: dict
    base_dir: str
    weights_dir: str
    output_dir: str


def save_rgb_image(image_rgb, output_path):
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    cv2.imwrite(output_path, image_bgr)
    return output_path


def interpolate_signal_to_length(signal, target_length):
    if len(signal) == target_length:
        return signal
    x_old = np.linspace(0.0, 1.0, len(signal), endpoint=False)
    x_new = np.linspace(0.0, 1.0, target_length, endpoint=False)
    return np.interp(x_new, x_old, signal)


def extract_12_leads_from_series(series, target_length=1000):
    lead_names_by_row = [
        ["I", "aVR", "V1", "V4"],
        ["II_short", "aVL", "V2", "V5"],
        ["III", "aVF", "V3", "V6"],
    ]
    lead_order = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]

    predicted_leads = {}
    for row_idx in range(3):
        split = np.array_split(series[row_idx], 4)
        for lead_name, sig in zip(lead_names_by_row[row_idx], split):
            predicted_leads[lead_name] = sig

    predicted_leads["II"] = predicted_leads["II_short"]
    del predicted_leads["II_short"]

    leads_12 = np.zeros((12, target_length))
    for idx, lead_name in enumerate(lead_order):
        if lead_name in predicted_leads:
            leads_12[idx] = interpolate_signal_to_length(predicted_leads[lead_name], target_length)
    return leads_12


def generate_signal_plot_4leads(signal, title, output_path):
    n_leads, n_samples = signal.shape
    lead_names = ["Lead I", "Lead II", "Lead III", "Lead V1"]
    colors = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b"]

    fig, axes = plt.subplots(4, 1, figsize=(15, 10))
    fig.suptitle(title, fontsize=16, fontweight="bold")
    time = np.arange(n_samples)

    for i in range(min(n_leads, 4)):
        ax = axes[i]
        ax.plot(time, signal[i], linewidth=0.8, color=colors[i], label=lead_names[i])
        ax.set_title(lead_names[i], fontsize=14)
        ax.grid(True, alpha=0.3)
        ax.set_xlim(0, n_samples)
        ax.legend(fontsize=10, loc="upper right")
        ax.set_ylabel("Amplitude (mV)", fontsize=10)
        if i == min(n_leads, 4) - 1:
            ax.set_xlabel("Time (samples)", fontsize=10)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return output_path


def generate_signal_plot_12leads(signal, title, output_path):
    lead_names = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]
    display_order = [
        ["I", "aVR", "V1", "V4"],
        ["II", "aVL", "V2", "V5"],
        ["III", "aVF", "V3", "V6"],
    ]
    lead_to_idx = {name: idx for idx, name in enumerate(lead_names)}

    fig, axes = plt.subplots(3, 4, figsize=(20, 12))
    axes = axes.flatten()
    fig.suptitle(title, fontsize=16, fontweight="bold")
    time = np.arange(signal.shape[1])

    for row_idx, row in enumerate(display_order):
        for col_idx, lead_name in enumerate(row):
            ax_idx = row_idx * 4 + col_idx
            ax = axes[ax_idx]
            lead_idx = lead_to_idx[lead_name]
            ax.plot(time, signal[lead_idx], linewidth=0.8, color="blue")
            ax.set_title(lead_name, fontsize=14)
            ax.grid(True, alpha=0.3)
            ax.set_xlim(0, signal.shape[1])
            if row_idx == 2:
                ax.set_xlabel("Time (samples)", fontsize=10)
            if col_idx == 0:
                ax.set_ylabel("Amplitude (mV)", fontsize=10)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return output_path


def generate_full_lead_ii_plot(signal_ii, title, output_path):
    fig, ax = plt.subplots(1, 1, figsize=(20, 4))
    time = np.arange(len(signal_ii))
    ax.set_title(title, fontsize=16, fontweight="bold")
    ax.plot(time, signal_ii, linewidth=0.8, color="blue", label="Lead II")
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, len(signal_ii))
    ax.set_xlabel("Time (samples)", fontsize=12)
    ax.set_ylabel("Amplitude (mV)", fontsize=12)
    ax.legend(fontsize=12, loc="upper right")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return output_path


def load_models():
    global stage0_net, stage1_net, stage2_net

    from models.stage0_model import Net as Stage0Net
    from models.stage1_model import Net as Stage1Net
    from models.stage2_model import Net as Stage2Net
    from models.stage0_common import load_net as load_stage0_net
    from models.stage1_common import load_net as load_stage1_net
    from models.stage2_common import load_net as load_stage2_net

    stage0_net = Stage0Net(pretrained=False)
    stage0_net = load_stage0_net(stage0_net, os.path.join(WEIGHTS_DIR, "stage0-last.checkpoint.pth"))
    stage0_net.to(DEVICE).eval()

    stage1_net = Stage1Net(pretrained=False)
    stage1_net = load_stage1_net(stage1_net, os.path.join(WEIGHTS_DIR, "stage1-last.checkpoint.pth"))
    stage1_net.to(DEVICE).eval()

    stage2_net = Stage2Net(pretrained=False)
    stage2_net = load_stage2_net(stage2_net, os.path.join(WEIGHTS_DIR, "stage2-00005810.checkpoint.pth"))
    stage2_net.to(DEVICE).eval()

    return True


def run_stage0(image):
    from models.stage0_common import image_to_batch, output_to_predict, normalise_by_homography

    batch = image_to_batch(image)
    batch["image"] = batch["image"].to(DEVICE)

    with torch.no_grad():
        output = stage0_net(batch)

    rotated, keypoint = output_to_predict(image, batch, output)
    normalised, keypoint, homo = normalise_by_homography(rotated, keypoint)
    return normalised, keypoint, homo


def run_stage1(image_norm):
    from models.stage0_common import image_to_batch
    from models.stage1_common import output_to_predict, rectify_image

    batch = image_to_batch(image_norm)
    batch["image"] = batch["image"].to(DEVICE)

    with torch.no_grad():
        output = stage1_net(batch)

    gridpoint_xy, more = output_to_predict(image_norm, batch, output)
    rectified = rectify_image(image_norm, gridpoint_xy)
    return rectified, gridpoint_xy


def run_stage2(image_rect, sample_length=5000):
    from models.stage2_common import pixel_to_series, filter_series_by_limits

    x0, x1 = 0, 2176
    y0, y1 = 0, 1696
    zero_mv = [703.5, 987.5, 1271.5, 1531.5]
    mv_to_pixel = 79.0
    t0, t1 = 118, 2080

    crop = image_rect[y0:y1, x0:x1]
    batch = {
        "image": torch.from_numpy(np.ascontiguousarray(crop.transpose(2, 0, 1))).unsqueeze(0).to(DEVICE),
    }

    with torch.no_grad():
        output = stage2_net(batch)
        pixel = output["pixel"].data.cpu().numpy()[0]

    series_in_pixel = pixel_to_series(pixel[..., t0:t1], zero_mv, sample_length)
    series = (np.array(zero_mv).reshape(4, 1) - series_in_pixel) / mv_to_pixel
    series = filter_series_by_limits(series)

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return series


app = FastAPI(title="ECG Digitization API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("ECG DIGITIZATION API STARTING")
    print("=" * 60)
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"MODELS_DIR: {MODELS_DIR}")
    print(f"WEIGHTS_DIR: {WEIGHTS_DIR}")
    print(f"DEVICE: {DEVICE}")
    load_models()
    print("API ready")


@app.get("/", response_model=dict)
async def root():
    return {
        "message": "ECG Digitization API is running",
        "endpoints": {
            "health": "/health",
            "digitize": "/digitize",
            "files": "/files/{category}/{filename}",
        },
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy" if all([stage0_net, stage1_net, stage2_net]) else "degraded",
        device=str(DEVICE),
        models_loaded={
            "stage0": stage0_net is not None,
            "stage1": stage1_net is not None,
            "stage2": stage2_net is not None,
        },
        base_dir=BASE_DIR,
        weights_dir=WEIGHTS_DIR,
        output_dir=OUTPUT_DIR,
    )


@app.get("/files/{category}/{filename}")
async def get_file(category: str, filename: str):
    folders = {
        "normalised": NORMALISED_DIR,
        "rectified": RECTIFIED_DIR,
        "digitalised": DIGITALISED_DIR,
    }
    if category not in folders:
        raise HTTPException(status_code=400, detail="Categorie invalide")

    file_path = os.path.join(folders[category], filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return FileResponse(file_path)


@app.post("/digitize", response_model=ProcessResponse)
async def digitize_ecg(file: UploadFile = File(...), sample_length: int = 5000, save_result: bool = True):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Image invalide")

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.resize(image, (1024, 1024))
        filename = Path(file.filename).stem

        image_norm, keypoint, homography = run_stage0(image)
        if image_norm is None:
            raise HTTPException(status_code=500, detail="Erreur Stage 0")

        image_rect, gridpoint_xy = run_stage1(image_norm)
        if image_rect is None:
            raise HTTPException(status_code=500, detail="Erreur Stage 1")

        series_4 = run_stage2(image_rect, sample_length=sample_length)
        if series_4 is None:
            raise HTTPException(status_code=500, detail="Erreur Stage 2")

        series_output = series_4


        output_file = None
        normalised_url = None
        rectified_url = None
        plot_4leads_url = None
        plot_12leads_url = None
        plot_full_lead_ii_url = None

        if save_result:
            normalised_path = os.path.join(NORMALISED_DIR, f"{filename}_normalised.png")
            rectified_path = os.path.join(RECTIFIED_DIR, f"{filename}_rectified.png")
            output_file_path = os.path.join(DIGITALISED_DIR, f"{filename}_extracted_12leads.npy")
            plot_4leads_path = os.path.join(DIGITALISED_DIR, f"{filename}_plot_4leads.png")
            plot_12leads_path = os.path.join(DIGITALISED_DIR, f"{filename}_plot_12leads.png")
            plot_full_lead_ii_path = os.path.join(DIGITALISED_DIR, f"{filename}_plot_full_lead_ii.png")

            save_rgb_image(image_norm, normalised_path)
            save_rgb_image(image_rect, rectified_path)
            np.save(output_file_path, series_output)

            generate_signal_plot_4leads(series_4, f"Stage 2 - {filename} (4 leads)", plot_4leads_path)
            generate_full_lead_ii_plot(series_4[3], f"Full Lead II - {filename}", plot_full_lead_ii_path)

            # Generate 12 leads plot
            leads_12 = extract_12_leads_from_series(series_4[:3])
            generate_signal_plot_12leads(leads_12, f"12 Leads - {filename}", plot_12leads_path)

            BASE_URL = "http://localhost:8000"

            npy_file = f"{BASE_URL}/files/digitalised/{filename}_extracted_12leads.npy"
            normalised_url = f"{BASE_URL}/files/normalised/{filename}_normalised.png"
            rectified_url = f"{BASE_URL}/files/rectified/{filename}_rectified.png"
            plot_4leads_url = f"{BASE_URL}/files/digitalised/{filename}_plot_4leads.png"
            plot_12leads_url = f"{BASE_URL}/files/digitalised/{filename}_plot_12leads.png"
            plot_full_lead_ii_url = f"{BASE_URL}/files/digitalised/{filename}_plot_full_lead_ii.png"

        return ProcessResponse(
            success=True,
            message="Digitalisation ECG terminee avec succes",
            series_shape=list(series_output.shape),
            npy_file=npy_file,
            normalised_image=normalised_url,
            rectified_image=rectified_url,
            plot_4leads=plot_4leads_url,
            plot_12leads=plot_12leads_url,
            plot_full_lead_ii=plot_full_lead_ii_url,
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")