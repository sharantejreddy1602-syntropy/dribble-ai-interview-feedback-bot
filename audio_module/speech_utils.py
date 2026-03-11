import whisper
import torch
from pydub import AudioSegment
import re
import time
import joblib
import os
import pandas as pd
import sys

# -----------------------------
# IMPORT GEMINI LLM FEEDBACK MODULE
# -----------------------------
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from llm_module.llm_feedback import generate_feedback


# -----------------------------
# LOAD WHISPER MODEL (CPU ONLY)
# -----------------------------
whisper_model = whisper.load_model("base", device="cpu")

print("Whisper model loaded successfully on CPU")
print("CUDA Available:", torch.cuda.is_available())


# -----------------------------
# LOAD TRAINED ML MODEL
# -----------------------------
MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "fluency_model.pkl")
)

fluency_model = joblib.load(MODEL_PATH)
print("Fluency ML Model loaded successfully from:", MODEL_PATH)


# -----------------------------
# FILLER WORDS LIST
# -----------------------------
FILLER_WORDS = ["um", "uh", "like", "actually", "basically", "you know"]


# -----------------------------
# CONVERT AUDIO TO WAV
# -----------------------------
def convert_to_wav(input_path, output_path="converted.wav"):
    """
    Converts input audio into WAV format (mono, 16kHz).
    Whisper works best with this format.
    """
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1)
    audio = audio.set_frame_rate(16000)
    audio.export(output_path, format="wav")
    return output_path


# -----------------------------
# GET AUDIO DURATION
# -----------------------------
def get_audio_duration(audio_path):
    """
    Returns audio duration in seconds.
    """
    audio = AudioSegment.from_file(audio_path)
    return round(len(audio) / 1000, 2)


# -----------------------------
# COUNT FILLER WORDS
# -----------------------------
def count_filler_words(text):
    """
    Counts filler words used in the answer.
    """
    text = text.lower()
    filler_count = {}

    for filler in FILLER_WORDS:
        pattern = r"\b" + re.escape(filler) + r"\b"
        matches = re.findall(pattern, text)
        filler_count[filler] = len(matches)

    filler_count["total_fillers"] = sum(filler_count.values())
    return filler_count


# -----------------------------
# SPEECH ANALYSIS
# -----------------------------
def analyze_speech(text):
    """
    Provides basic analysis: word count + filler word stats.
    """
    words = text.split()
    word_count = len(words)

    fillers = count_filler_words(text)

    return {
        "word_count": word_count,
        "filler_stats": fillers
    }


# -----------------------------
# FEATURE EXTRACTION
# -----------------------------
def extract_features(transcript_text, audio_path, whisper_latency_sec, total_fillers):
    """
    Extracts features needed for our ML model prediction.
    """
    words = transcript_text.split()
    word_count = len(words)

    unique_words = len(set([w.lower() for w in words]))
    unique_word_ratio = round(unique_words / word_count, 3) if word_count > 0 else 0

    avg_word_length = round(sum(len(w) for w in words) / word_count, 2) if word_count > 0 else 0

    sentence_count = transcript_text.count(".") + transcript_text.count("?") + transcript_text.count("!")

    duration_sec = get_audio_duration(audio_path)

    speaking_rate_wps = round(word_count / duration_sec, 2) if duration_sec > 0 else 0

    return {
        "word_count": word_count,
        "total_fillers": total_fillers,
        "unique_word_ratio": unique_word_ratio,
        "avg_word_length": avg_word_length,
        "sentence_count": sentence_count,
        "duration_sec": duration_sec,
        "speaking_rate_wps": speaking_rate_wps,
        "whisper_latency_sec": whisper_latency_sec
    }


# -----------------------------
# ML PREDICTION
# -----------------------------
def predict_fluency(features):
    """
    Predict fluency label using trained RandomForest model.
    Output: Good / Average / Poor
    """

    X = pd.DataFrame([{
        "word_count": features["word_count"],
        "total_fillers": features["total_fillers"],
        "unique_word_ratio": features["unique_word_ratio"],
        "avg_word_length": features["avg_word_length"],
        "sentence_count": features["sentence_count"],
        "duration_sec": features["duration_sec"],
        "speaking_rate_wps": features["speaking_rate_wps"],
        "latency_sec": features["whisper_latency_sec"]
    }])

    prediction = fluency_model.predict(X)[0]
    return prediction


# -----------------------------
# TRANSCRIBE WITH LATENCY
# -----------------------------
def transcribe_audio_with_latency(audio_path):
    """
    Transcribes speech into text using Whisper and measures latency.
    """
    wav_path = convert_to_wav(audio_path)

    start_time = time.time()
    result = whisper_model.transcribe(wav_path)
    end_time = time.time()

    whisper_latency = round(end_time - start_time, 2)

    return {
        "transcript": result["text"],
        "whisper_latency_sec": whisper_latency,
        "cuda_available": torch.cuda.is_available(),
        "device_used": "cpu"
    }


# -----------------------------
# FULL AUDIO PIPELINE + LLM
# -----------------------------
def full_audio_analysis(audio_path, category="HR"):
    """
    Complete pipeline:
    1. Whisper transcription (CPU only)
    2. Filler word + word count analysis
    3. Feature extraction
    4. ML fluency prediction
    5. LLM feedback generation (Gemini)
    6. Latency benchmarking for each stage
    """

    pipeline_start = time.time()

    # -----------------------------
    # Whisper Transcription
    # -----------------------------
    whisper_start = time.time()
    transcription_data = transcribe_audio_with_latency(audio_path)
    whisper_end = time.time()

    transcript_text = transcription_data["transcript"]
    whisper_latency_sec = round(whisper_end - whisper_start, 2)

    # -----------------------------
    # Filler Analysis
    # -----------------------------
    analysis_data = analyze_speech(transcript_text)
    total_fillers = analysis_data["filler_stats"]["total_fillers"]

    # -----------------------------
    # Feature Extraction Latency
    # -----------------------------
    feature_start = time.time()
    features = extract_features(
        transcript_text,
        audio_path,
        whisper_latency_sec,
        total_fillers
    )
    feature_end = time.time()

    feature_latency_sec = round(feature_end - feature_start, 4)

    # -----------------------------
    # ML Prediction Latency
    # -----------------------------
    ml_start = time.time()
    fluency_label = predict_fluency(features)
    ml_end = time.time()

    ml_latency_sec = round(ml_end - ml_start, 4)

    # -----------------------------
    # LLM Feedback Latency
    # -----------------------------
    llm_start = time.time()
    llm_result = generate_feedback(transcript_text, category=category)
    llm_end = time.time()

    llm_latency_sec = round(llm_end - llm_start, 2)
    llm_feedback = llm_result["feedback"]

    # -----------------------------
    # TOTAL PIPELINE LATENCY
    # -----------------------------
    pipeline_end = time.time()
    total_latency_sec = round(pipeline_end - pipeline_start, 2)

    return {
        "transcript": transcript_text,
        "analysis": analysis_data,
        "features": features,
        "fluency_label": fluency_label,
        "llm_feedback": llm_feedback,

        "latency_report": {
            "whisper_latency_sec": whisper_latency_sec,
            "feature_extraction_sec": feature_latency_sec,
            "ml_latency_sec": ml_latency_sec,
            "llm_latency_sec": llm_latency_sec,
            "total_latency_sec": total_latency_sec
        },

        "cuda_available": transcription_data["cuda_available"],
        "device_used": transcription_data["device_used"]
    }


# -----------------------------
# LATENCY TEST (10 RUNS)
# -----------------------------
# -----------------------------
# LATENCY TEST (10 RUNS) - WITHOUT LLM
# -----------------------------
def latency_test_10_runs(audio_path, runs=10):
    """
    Runs pipeline multiple times and records latency ONLY for:
    - Whisper
    - Feature Extraction
    - ML Prediction
    - Total pipeline (Whisper + Feature + ML)
    """

    whisper_latencies = []
    feature_latencies = []
    ml_latencies = []
    total_latencies = []

    transcripts = []
    fluency_labels = []

    for i in range(runs):
        pipeline_start = time.time()

        # Whisper Latency
        whisper_start = time.time()
        transcription_data = transcribe_audio_with_latency(audio_path)
        whisper_end = time.time()
        whisper_latency_sec = round(whisper_end - whisper_start, 2)

        transcript_text = transcription_data["transcript"]

        # Filler Analysis
        analysis_data = analyze_speech(transcript_text)
        total_fillers = analysis_data["filler_stats"]["total_fillers"]

        # Feature Extraction Latency
        feature_start = time.time()
        features = extract_features(
            transcript_text,
            audio_path,
            whisper_latency_sec,
            total_fillers
        )
        feature_end = time.time()
        feature_latency_sec = round(feature_end - feature_start, 4)

        # ML Latency
        ml_start = time.time()
        fluency_label = predict_fluency(features)
        ml_end = time.time()
        ml_latency_sec = round(ml_end - ml_start, 4)

        pipeline_end = time.time()
        total_latency_sec = round(pipeline_end - pipeline_start, 2)

        whisper_latencies.append(whisper_latency_sec)
        feature_latencies.append(feature_latency_sec)
        ml_latencies.append(ml_latency_sec)
        total_latencies.append(total_latency_sec)

        transcripts.append(transcript_text)
        fluency_labels.append(fluency_label)

    return {
        "runs": runs,

        "whisper_latencies_sec": whisper_latencies,
        "feature_latencies_sec": feature_latencies,
        "ml_latencies_sec": ml_latencies,
        "total_latencies_sec": total_latencies,

        "whisper_avg_sec": round(sum(whisper_latencies) / runs, 2),
        "whisper_min_sec": round(min(whisper_latencies), 2),
        "whisper_max_sec": round(max(whisper_latencies), 2),

        "feature_avg_sec": round(sum(feature_latencies) / runs, 4),
        "feature_min_sec": round(min(feature_latencies), 4),
        "feature_max_sec": round(max(feature_latencies), 4),

        "ml_avg_sec": round(sum(ml_latencies) / runs, 4),
        "ml_min_sec": round(min(ml_latencies), 4),
        "ml_max_sec": round(max(ml_latencies), 4),

        "total_avg_sec": round(sum(total_latencies) / runs, 2),
        "total_min_sec": round(min(total_latencies), 2),
        "total_max_sec": round(max(total_latencies), 2),

        "device_used": "cpu",
        "cuda_available": torch.cuda.is_available(),

        "sample_transcript": transcripts[0],
        "sample_fluency_label": fluency_labels[0]
    }

