Dribble – AI Interview Feedback Bot
Project Overview

Dribble is an AI-powered web application that evaluates interview responses from uploaded audio and provides structured feedback to help users improve their communication and interview performance.

The system converts speech to text, extracts speech features, predicts fluency using a machine learning model, and generates detailed feedback along with downloadable performance reports.

Key Highlights

End-to-end AI pipeline for analyzing spoken interview responses

Speech-to-text transcription using Whisper

Machine learning based fluency prediction using Scikit-learn

AI-generated structured feedback including strengths and improvement suggestions

Downloadable PDF performance reports

Role-based authentication (User / Admin)

Interview history dashboard

Latency benchmarking of the full AI pipeline

System Pipeline
Audio Input
     ↓
Speech-to-Text (Whisper)
     ↓
Feature Extraction
     ↓
Fluency Prediction (ML Model)
     ↓
AI Feedback Generation
     ↓
PDF Report Generation
     ↓
Result Storage & Dashboard Display
Tech Stack
Backend

Python

Flask

AI / Machine Learning

OpenAI Whisper

Scikit-learn

Frontend

HTML

CSS

Libraries

ReportLab (PDF generation)

NumPy

Project Structure
dribble-ai-interview-feedback-bot/

audio_module/
│
├── speech_utils.py
├── test_audio.py
├── test_cpu.py
└── test_whisper.py


backend/
│
├── cpu_proof_ml.py
├── fluency_predictor.py
├── list_models.py
├── train_model.py
├── test_model.py
├── test_llm.py
│
└── llm_module/
    ├── __init__.py
    └── llm_feedback.py


data/
│
├── fluency_model.pkl
├── training_data.csv
├── results.json
└── full_results.json


webapp/
│
├── app.py
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── pics/
│       └── logo.png
│
└── templates/
    ├── login.html
    ├── dashboard.html
    ├── interview.html
    ├── report.html
    ├── latency.html
    ├── latency_result.html
    ├── admin.html
    └── view_result.html


.gitignore
requirements.txt
README.md
Installation
Clone the repository
git clone https://github.com/sharantejreddy1602-syntropy/dribble-ai-interview-feedback-bot.git
cd dribble-ai-interview-feedback-bot
Create virtual environment
python -m venv venv

Activate environment

Windows

venv\Scripts\activate
Install dependencies
pip install -r requirements.txt
Run the application
cd webapp
python app.py

Open the application in browser:

http://127.0.0.1:5000
Example Capabilities

The system analyzes interview responses and provides:

Speech transcript

Fluency classification

Speech metrics (filler words, speaking rate, word count)

Structured AI feedback

Downloadable performance report

Latency performance metrics

Future Improvements

Real-time speech analysis

Video interview feedback support

Cloud deployment with Docker

Improved fluency model using deep learning

Author

Sharan Tej Reddy
B.Tech Computer Science Engineering
Vellore Institute of Technology, Vellore