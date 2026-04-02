import joblib
import os

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "fluency_model.pkl"))
model = joblib.load(MODEL_PATH)

def predict_fluency(features):
    X = [[
        features["word_count"],
        features["total_fillers"],
        features["unique_word_ratio"],
        features["avg_word_length"],
        features["sentence_count"],
        features["duration_sec"],
        features["speaking_rate_wps"],
        features["latency_sec"]
    ]]

    return model.predict(X)[0]
