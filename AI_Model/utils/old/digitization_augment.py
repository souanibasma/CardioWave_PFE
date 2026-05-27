import numpy as np
from scipy.ndimage import gaussian_filter1d


def add_baseline_drift(signal):
    """
    Simulate baseline wander (common in digitized ECG)
    """
    t = np.linspace(0, 1, signal.shape[1])

    drift = 0.15 * np.sin(2 * np.pi * 0.5 * t)

    return signal + drift


def amplitude_scaling(signal):
    """
    Random amplitude scaling
    """
    scale = np.random.uniform(0.7, 1.3)

    return signal * scale


def smooth_signal(signal):
    """
    Simulate digitization smoothing
    """
    smoothed = gaussian_filter1d(signal, sigma=1, axis=1)

    return smoothed


def add_noise(signal):
    """
    Quantization / scanning noise
    """
    noise = np.random.normal(0, 0.02, signal.shape)

    return signal + noise


def digitization_augment(signal):
    """
    Apply random digitization artifacts
    """

    if np.random.rand() < 0.5:
        signal = add_baseline_drift(signal)

    if np.random.rand() < 0.5:
        signal = amplitude_scaling(signal)

    if np.random.rand() < 0.5:
        signal = smooth_signal(signal)

    if np.random.rand() < 0.5:
        signal = add_noise(signal)

    return signal