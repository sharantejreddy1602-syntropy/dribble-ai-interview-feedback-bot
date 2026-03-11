import whisper
import torch

print("Torch CUDA available:", torch.cuda.is_available())

model = whisper.load_model("base", device="cpu")
print("Whisper model loaded successfully on CPU")
