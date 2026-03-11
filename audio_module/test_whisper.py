import whisper

print("Loading Whisper model...")
model = whisper.load_model("base")   # base is good and fast

print("Transcribing audio...")
result = model.transcribe("audio_samples/sample1.mp4")

print("\n--- TRANSCRIPTION OUTPUT ---")
print(result["text"])
