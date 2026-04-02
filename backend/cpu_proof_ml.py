import joblib
import os
import torch
import time

MODEL_PATH = os.path.abspath("../data/fluency_model.pkl")
model = joblib.load(MODEL_PATH)

print("=== CPU PROOF FOR ML MODEL ===")
print("Model Type:", type(model))
print("CUDA Available:", torch.cuda.is_available())

# sample input
X = [[120, 2, 0.72, 4.3, 4, 45, 2.66, 1.2]]

start = time.time()
prediction = model.predict(X)[0]
end = time.time()

print("Prediction Output:", prediction)
print("Inference Time (ms):", round((end - start) * 1000, 2))

if torch.cuda.is_available():
    print("GPU Memory Allocated:", torch.cuda.memory_allocated())
else:
    print("GPU Memory Allocated: 0 (No GPU used)")
