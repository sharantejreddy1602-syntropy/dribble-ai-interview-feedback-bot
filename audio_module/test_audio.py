import json
from speech_utils import full_audio_analysis, latency_test_10_runs


audio_file = "audio_samples/sample1.mp4"
category = "HR"   # Change to "Technical" if needed


print("\n==============================================")
print("      AI INTERVIEW BOT - FULL PIPELINE TEST")
print("==============================================\n")

print("Running full audio analysis (Single Run)...\n")

result = full_audio_analysis(audio_file, category=category)

print("---------- FINAL OUTPUT (Single Run) ----------")
print(json.dumps(result, indent=4))
print("\n==============================================\n")


print("Running latency benchmark test (10 Runs)...\n")

latency_result = latency_test_10_runs(audio_file, runs=10, category=category)

print("---------- LATENCY OUTPUT (10 Runs) ----------")
print(json.dumps(latency_result, indent=4))

print("\n==============================================")
print(" TEST COMPLETED SUCCESSFULLY")
print("==============================================\n")
