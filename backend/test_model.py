import joblib
import os

MODEL_PATH = os.path.abspath("../data/fluency_model.pkl")
model = joblib.load(MODEL_PATH)

# Example test input
# [word_count, total_fillers, unique_word_ratio, avg_word_length, sentence_count, duration_sec, speaking_rate_wps, latency_sec]
sample_input = [[120, 2, 0.72, 4.3, 4, 45, 2.66, 1.2]]

prediction = model.predict(sample_input)

print("Prediction:", prediction[0])
