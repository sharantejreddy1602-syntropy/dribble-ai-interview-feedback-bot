from flask import Flask, render_template, request, redirect, session, flash, send_file
import os
import json
import time
import uuid
from datetime import datetime
from json.decoder import JSONDecodeError

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "audio_module")))
from speech_utils import full_audio_analysis, latency_test_10_runs

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


app = Flask(__name__)
app.secret_key = "dribble_secret_key_123"


UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# -----------------------------
# DEMO USERS (ROLE BASED)
# -----------------------------
USERS = {
    "user": {"password": "user123", "role": "user"},
    "admin": {"password": "admin123", "role": "admin"}
}

TOKEN_EXPIRY_SECONDS = 300  # 5 minutes


# -----------------------------
# PREDEFINED QUESTIONS (5 EACH ROUND)
# -----------------------------
QUESTIONS = {
    "HR": [
        "Tell me about yourself.",
        "Why should we hire you?",
        "What are your strengths and weaknesses?",
        "Where do you see yourself in 5 years?",
        "Why do you want to work in this company?"
    ],
    "Technical": [
        "Explain OOP concepts with an example.",
        "What is the difference between stack and queue?",
        "What is a database index and why is it used?",
        "Explain the difference between HTTP and HTTPS.",
        "What is the difference between a compiler and an interpreter?"
    ],
    "Behavioral": [
        "Tell me about a time you faced a challenge and how you solved it.",
        "Describe a situation where you worked in a team.",
        "Tell me about a time you handled criticism.",
        "How do you manage stress and pressure?",
        "Describe a time you showed leadership."
    ],
    "Aptitude": [
        "If a train travels 60 km in 1 hour, how far will it travel in 2.5 hours?",
        "A shopkeeper sells an item at 20% profit. If cost is 500, what is selling price?",
        "If 5 workers finish a job in 10 days, how long will 10 workers take?",
        "Find the average of 10, 20, 30, 40, 50.",
        "If the ratio of boys to girls is 3:2 and total students are 50, how many girls?"
    ]
}


# -----------------------------
# RESULTS FILES
# -----------------------------
RESULTS_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "results.json"))
FULL_RESULTS_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "full_results.json"))


# -----------------------------
# LOAD SUMMARY HISTORY RESULTS
# -----------------------------
def load_results():
    if not os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, "w") as f:
            json.dump([], f, indent=4)

    try:
        with open(RESULTS_FILE, "r") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            return data

    except JSONDecodeError:
        with open(RESULTS_FILE, "w") as f:
            json.dump([], f, indent=4)
        return []


def save_result(entry):
    data = load_results()
    data.append(entry)

    with open(RESULTS_FILE, "w") as f:
        json.dump(data, f, indent=4)


# -----------------------------
# LOAD FULL RESULTS
# -----------------------------
def load_full_results():
    if not os.path.exists(FULL_RESULTS_FILE):
        with open(FULL_RESULTS_FILE, "w") as f:
            json.dump([], f, indent=4)

    try:
        with open(FULL_RESULTS_FILE, "r") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            return data

    except JSONDecodeError:
        with open(FULL_RESULTS_FILE, "w") as f:
            json.dump([], f, indent=4)
        return []


def save_full_result(entry):
    data = load_full_results()
    data.append(entry)

    with open(FULL_RESULTS_FILE, "w") as f:
        json.dump(data, f, indent=4)


# -----------------------------
# GENERATE TOKEN (UUID)
# -----------------------------
def generate_token():
    return str(uuid.uuid4())


# -----------------------------
# CHECK TOKEN VALIDITY
# -----------------------------
def is_token_valid():
    if "token_time" not in session:
        return False

    now = time.time()
    if now - session["token_time"] > TOKEN_EXPIRY_SECONDS:
        return False

    return True


# -----------------------------
# PDF GENERATOR
# -----------------------------
def generate_pdf_report(data, pdf_path, report_title="Dribble Report"):
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter

    y = height - 50

    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, y, report_title)

    y -= 30
    c.setFont("Helvetica", 12)
    c.drawString(50, y, f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    y -= 30
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "User Details:")

    y -= 20
    c.setFont("Helvetica", 12)
    c.drawString(50, y, f"Username: {data.get('username', '-')}")

    y -= 20
    c.drawString(50, y, f"Category: {data.get('category', '-')}")

    y -= 20
    c.drawString(50, y, f"Question: {data.get('question', '-')}")

    y -= 20
    c.drawString(50, y, f"Timestamp: {data.get('timestamp', '-')}")

    y -= 30
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "Transcript:")

    y -= 20
    c.setFont("Helvetica", 11)
    transcript = data.get("transcript", "")
    for line in transcript.split("\n"):
        if y < 80:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 11)
        c.drawString(50, y, line[:110])
        y -= 15

    y -= 20
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "Fluency Prediction:")

    y -= 20
    c.setFont("Helvetica", 12)
    c.drawString(50, y, f"Fluency Label: {data.get('fluency_label', '-')}")

    y -= 30
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "Speech Analysis:")

    analysis = data.get("analysis", {})
    filler_stats = analysis.get("filler_stats", {})

    y -= 20
    c.setFont("Helvetica", 12)
    c.drawString(50, y, f"Word Count: {analysis.get('word_count', '-')}")

    y -= 20
    c.drawString(50, y, f"Total Fillers: {filler_stats.get('total_fillers', '-')}")

    y -= 30
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "Latency Report (seconds):")

    latency = data.get("latency_report", {})

    y -= 20
    c.setFont("Helvetica", 12)
    c.drawString(50, y, f"Whisper Latency: {latency.get('whisper_latency_sec', '-')}")

    y -= 20
    c.drawString(50, y, f"Feature Extraction Latency: {latency.get('feature_extraction_sec', '-')}")

    y -= 20
    c.drawString(50, y, f"ML Latency: {latency.get('ml_latency_sec', '-')}")

    y -= 20
    c.drawString(50, y, f"LLM Latency: {latency.get('llm_latency_sec', '-')}")

    y -= 20
    c.drawString(50, y, f"Total Latency: {latency.get('total_latency_sec', '-')}")

    y -= 30
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "CPU Proof:")

    y -= 20
    c.setFont("Helvetica", 12)
    c.drawString(50, y, f"CUDA Available: {data.get('cuda_available', '-')}")

    y -= 20
    c.drawString(50, y, f"Device Used: {data.get('device_used', '-')}")

    y -= 30
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "LLM Feedback:")

    y -= 20
    c.setFont("Helvetica", 11)
    feedback = data.get("llm_feedback", "")
    for line in feedback.split("\n"):
        if y < 80:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 11)
        c.drawString(50, y, line[:110])
        y -= 15

    c.save()


# -----------------------------
# HOME ROUTE
# -----------------------------
@app.route("/")
def home():
    return redirect("/login")


# -----------------------------
# LOGIN ROUTE
# -----------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if username in USERS and USERS[username]["password"] == password:
            session["username"] = username
            session["role"] = USERS[username]["role"]

            session["token"] = generate_token()
            session["token_time"] = time.time()

            flash("Login successful!", "success")
            return redirect("/dashboard")

        flash("Invalid username or password!", "danger")
        return redirect("/login")

    return render_template("login.html")


# -----------------------------
# DASHBOARD PAGE
# -----------------------------
@app.route("/dashboard")
def dashboard():
    if "username" not in session:
        return redirect("/login")

    if not is_token_valid():
        flash("Session expired! Please login again.", "danger")
        return redirect("/logout")

    all_results = load_results()
    history = [r for r in all_results if r.get("username") == session["username"]]

    return render_template(
        "dashboard.html",
        username=session["username"],
        role=session["role"],
        token=session["token"],
        history=history
    )


# -----------------------------
# INTERVIEW PAGE
# -----------------------------
@app.route("/interview", methods=["GET", "POST"])
def interview():
    if "username" not in session:
        return redirect("/login")

    if not is_token_valid():
        flash("Session expired! Please login again.", "danger")
        return redirect("/logout")

    category = request.args.get("category", "HR")

    try:
        q_index = int(request.args.get("q", 0))
    except:
        q_index = 0

    if category not in QUESTIONS:
        category = "HR"

    if q_index < 0:
        q_index = 0
    if q_index > 4:
        q_index = 4

    current_question = QUESTIONS[category][q_index]

    if request.method == "POST":
        category = request.form.get("category")
        q_index = int(request.form.get("q_index", 0))
        question = request.form.get("question")
        audio_file = request.files.get("audio")

        if not audio_file:
            flash("Please upload an audio/video file!", "danger")
            return redirect(f"/interview?category={category}&q={q_index}")

        filename = f"{int(time.time())}_{audio_file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        audio_file.save(filepath)

        # Run analysis
        result = full_audio_analysis(filepath, category=category)

        result_id = str(uuid.uuid4())
        result["id"] = result_id
        result["category"] = category
        result["question"] = question
        result["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        result["username"] = session["username"]

        # Generate PDF
        pdf_filename = f"report_{session['username']}_{int(time.time())}.pdf"
        pdf_path = os.path.join(UPLOAD_FOLDER, pdf_filename)
        generate_pdf_report(result, pdf_path, report_title="Dribble Interview Report")

        result["pdf_file"] = pdf_filename

        # Save full result
        save_full_result(result)

        # Save summary for dashboard
        history_entry = {
            "id": result_id,
            "username": session["username"],
            "timestamp": result["timestamp"],
            "category": category,
            "question": question,
            "fluency_label": result["fluency_label"]
        }
        save_result(history_entry)

        session["result"] = json.dumps(result)
        session["pdf_file"] = pdf_filename

        flash("Answer analyzed successfully!", "success")
        return redirect("/report")

    return render_template(
        "interview.html",
        token=session["token"],
        category=category,
        q_index=q_index,
        question=current_question,
        total_questions=5
    )


# -----------------------------
# VIEW RESULT PAGE
# -----------------------------
@app.route("/view_result/<result_id>")
def view_result(result_id):
    if "username" not in session:
        return redirect("/login")

    if not is_token_valid():
        flash("Session expired! Please login again.", "danger")
        return redirect("/logout")

    all_results = load_full_results()
    found = None

    for r in all_results:
        if r.get("id") == result_id:
            if session.get("role") == "admin" or r.get("username") == session.get("username"):
                found = r
                break

    if not found:
        flash("Result not found!", "danger")
        return redirect("/dashboard")

    return render_template("view_result.html", result=found, token=session["token"])


# -----------------------------
# REPORT PAGE
# -----------------------------
@app.route("/report")
def report():
    if "username" not in session:
        return redirect("/login")

    if not is_token_valid():
        flash("Session expired! Please login again.", "danger")
        return redirect("/logout")

    if "result" not in session:
        flash("No report found. Please submit an answer first.", "danger")
        return redirect("/dashboard")

    result = json.loads(session["result"])
    pdf_file = session.get("pdf_file")

    return render_template("report.html", result=result, pdf_file=pdf_file, token=session["token"])


# -----------------------------
# DOWNLOAD PDF
# -----------------------------
@app.route("/download/<filename>")
def download_pdf(filename):
    if "username" not in session:
        return redirect("/login")

    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return "File not found"

    return send_file(filepath, as_attachment=True)


# -----------------------------
# LATENCY BENCHMARK PAGE
# -----------------------------
@app.route("/latency", methods=["GET", "POST"])
def latency():
    if "username" not in session:
        return redirect("/login")

    if not is_token_valid():
        flash("Session expired! Please login again.", "danger")
        return redirect("/logout")

    if request.method == "POST":
        audio_file = request.files.get("audio")

        if not audio_file:
            flash("Please upload a file!", "danger")
            return redirect("/latency")

        filename = f"{int(time.time())}_{audio_file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        audio_file.save(filepath)

        latency_result = latency_test_10_runs(filepath, runs=10)
        session["latency_result"] = json.dumps(latency_result)

        pdf_filename = f"latency_report_{session['username']}_{int(time.time())}.pdf"
        pdf_path = os.path.join(UPLOAD_FOLDER, pdf_filename)

        pdf_data = {
            "username": session["username"],
            "category": "Latency Benchmark",
            "question": "Latency Benchmark Run (10 runs)",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "transcript": latency_result.get("sample_transcript", ""),
            "fluency_label": latency_result.get("sample_fluency_label", ""),
            "analysis": {},
            "llm_feedback": "LLM feedback not included in benchmark to avoid quota exhaustion.",
            "latency_report": {
                "whisper_latency_sec": f"{latency_result.get('whisper_avg_sec')} (min: {latency_result.get('whisper_min_sec')}, max: {latency_result.get('whisper_max_sec')})",
                "feature_extraction_sec": f"{latency_result.get('feature_avg_sec')} (min: {latency_result.get('feature_min_sec')}, max: {latency_result.get('feature_max_sec')})",
                "ml_latency_sec": f"{latency_result.get('ml_avg_sec')} (min: {latency_result.get('ml_min_sec')}, max: {latency_result.get('ml_max_sec')})",
                "llm_latency_sec": "Not included",
                "total_latency_sec": f"{latency_result.get('total_avg_sec')} (min: {latency_result.get('total_min_sec')}, max: {latency_result.get('total_max_sec')})"
            },

            "cuda_available": latency_result.get("cuda_available"),
            "device_used": latency_result.get("device_used")
        }

        generate_pdf_report(pdf_data, pdf_path, report_title="Dribble Latency Benchmark Report")
        session["latency_pdf_file"] = pdf_filename

        flash("Latency benchmark completed successfully!", "success")
        return redirect("/latency_result")

    return render_template("latency.html", token=session["token"])


# -----------------------------
# LATENCY RESULT PAGE
# -----------------------------
@app.route("/latency_result")
def latency_result():
    if "username" not in session:
        return redirect("/login")

    if not is_token_valid():
        flash("Session expired! Please login again.", "danger")
        return redirect("/logout")

    if "latency_result" not in session:
        flash("No benchmark result found.", "danger")
        return redirect("/latency")

    latency_result_data = json.loads(session["latency_result"])
    latency_pdf_file = session.get("latency_pdf_file")

    return render_template(
        "latency_result.html",
        latency_result=latency_result_data,
        pdf_file=latency_pdf_file,
        token=session["token"]
    )


# -----------------------------
# ADMIN PAGE
# -----------------------------
@app.route("/admin")
def admin():
    if "username" not in session:
        return redirect("/login")

    if session.get("role") != "admin":
        flash("Access denied! Admin only.", "danger")
        return redirect("/dashboard")

    history = load_full_results()

    return render_template(
        "admin.html",
        username=session["username"],
        token=session["token"],
        history=history
    )


# -----------------------------
# LOGOUT ROUTE
# -----------------------------
@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out successfully!", "success")
    return redirect("/login")


if __name__ == "__main__":
    app.run(debug=True)
