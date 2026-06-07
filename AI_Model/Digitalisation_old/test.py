import numpy as np

# 👉 remplace par ton chemin
file_path = r"C:\Users\MSI\Downloads\wetransfer_ecg_2026-04-16_1135\ECG\output_prod\digitalised\4_extracted_12leads.npy"
data = np.load(file_path)

print("Shape:", data.shape)