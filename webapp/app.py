from flask import Flask, render_template, request, redirect, session, flash, send_file, jsonify
from google import genai
from dotenv import load_dotenv
import os
import json
import time
import uuid
from datetime import datetime
from json.decoder import JSONDecodeError
from pathlib import Path

# Load .env from both webapp and project root so running from different cwd still works.
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
load_dotenv(BASE_DIR / ".env", override=True)
load_dotenv(ROOT_DIR / ".env", override=True)

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "audio_module")))
from speech_utils import full_audio_analysis, latency_test_10_runs

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


app = Flask(__name__)
app.secret_key = "dribble_secret_key_123"


# -----------------------------
# AUDIO DURATION HELPER
# -----------------------------
def get_audio_duration(filepath):
    """Returns duration in seconds. Tries wave first, falls back to stat-based estimate."""
    import contextlib, wave, os
    try:
        with contextlib.closing(wave.open(filepath, 'r')) as f:
            frames = f.getnframes()
            rate   = f.getframerate()
            return round(frames / float(rate), 2) if rate > 0 else None
    except Exception:
        pass
    # For non-WAV (webm, mp3, m4a) fall back to file-size heuristic (128 kbps assumed)
    try:
        size_bytes = os.path.getsize(filepath)
        return round(size_bytes / (128 * 1024 / 8), 2)
    except Exception:
        return None

# -----------------------------
# GEMINI API SETUP
# -----------------------------
GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


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
# HOME / LANDING PAGE ROUTE
# -----------------------------
@app.route("/")
@app.route("/index")
def index():
    return render_template("index.html")


# -----------------------------
# KNOW MORE ROUTE
# -----------------------------
@app.route("/knowmore")
def knowmore():
    return render_template("knowmore.html")


# -----------------------------
# FULL HISTORY ROUTE
# -----------------------------
@app.route("/history")
def history():
    if "username" not in session:
        return redirect("/login")
    if not is_token_valid():
        flash("Session expired! Please login again.", "danger")
        return redirect("/logout")
    all_results = load_results()
    user_history = [r for r in all_results if r.get("username") == session["username"]]
    return render_template(
        "history.html",
        username=session["username"],
        role=session["role"],
        token=session["token"],
        history=user_history
    )


# -----------------------------
# HISTORY API (JSON)
# -----------------------------
@app.route("/api/history")
def api_history():
    if "username" not in session:
        return jsonify({"ok": False, "error": "Not logged in"}), 401

    if not is_token_valid():
        return jsonify({"ok": False, "error": "Session expired"}), 401

    all_results = load_results()
    user_history = [r for r in all_results if r.get("username") == session["username"]]

    fluent_count = sum(
        1 for r in user_history
        if str(r.get("fluency_label", "")).strip().lower() == "fluent"
    )

    categories = sorted({r.get("category") for r in user_history if r.get("category")})

    seconds_left = max(
        0,
        TOKEN_EXPIRY_SECONDS - int(time.time() - session.get("token_time", time.time()))
    )

    return jsonify({
        "ok": True,
        "username": session.get("username"),
        "role": session.get("role", "user"),
        "token": session.get("token", ""),
        "seconds_left": seconds_left,
        "history": user_history,
        "stats": {
            "total": len(user_history),
            "fluent": fluent_count,
            "needs_work": len(user_history) - fluent_count,
            "categories": len(categories)
        }
    })


# -----------------------------
# ADMIN HISTORY API (JSON)
# -----------------------------
@app.route("/api/admin/history")
def api_admin_history():
    if "username" not in session:
        return jsonify({"ok": False, "error": "Not logged in"}), 401

    if not is_token_valid():
        return jsonify({"ok": False, "error": "Session expired"}), 401

    if session.get("role") != "admin":
        return jsonify({"ok": False, "error": "Access denied"}), 403

    all_results = load_full_results()

    fluent_count = sum(
        1 for r in all_results
        if str(r.get("fluency_label", "")).strip().lower() == "fluent"
    )

    unique_users = len({r.get("username") for r in all_results if r.get("username")})
    categories = len({r.get("category") for r in all_results if r.get("category")})

    seconds_left = max(
        0,
        TOKEN_EXPIRY_SECONDS - int(time.time() - session.get("token_time", time.time()))
    )

    return jsonify({
        "ok": True,
        "username": session.get("username"),
        "role": session.get("role", "user"),
        "token": session.get("token", ""),
        "seconds_left": seconds_left,
        "history": all_results,
        "stats": {
            "total": len(all_results),
            "unique_users": unique_users,
            "fluent": fluent_count,
            "needs_work": len(all_results) - fluent_count,
            "categories": categories,
        }
    })


# -----------------------------
# LOGIN ROUTE
# -----------------------------
@app.route("/api/login", methods=["POST"])
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        is_json_login = request.is_json
        payload = request.get_json(silent=True) if is_json_login else request.form

        username = (payload.get("username") or "").strip()
        password = payload.get("password") or ""

        if username in USERS and USERS[username]["password"] == password:
            session["username"] = username
            session["role"] = USERS[username]["role"]

            session["token"] = generate_token()
            session["token_time"] = time.time()
            redirect_path = "/admin" if session["role"] == "admin" else "/dashboard"

            if is_json_login:
                return jsonify({
                    "ok": True,
                    "username": session["username"],
                    "role": session["role"],
                    "redirect": redirect_path
                })

            flash("Login successful!", "success")
            return redirect(redirect_path)

        if is_json_login:
            return jsonify({"ok": False, "error": "Invalid username or password!"}), 401

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

    return render_template("interview.html")


# -----------------------------
# GENERATE QUESTIONS (Gemini)
# -----------------------------
@app.route("/generate_questions", methods=["POST"])
def generate_questions():
    if "username" not in session:
        return jsonify({"error": "Not logged in"}), 401

    if not GEMINI_API_KEY or gemini_client is None:
        return jsonify({"error": "GEMINI_API_KEY is missing on backend server"}), 500

    data = request.get_json(silent=True) or {}
    category = data.get("category", "HR")

    prompt = f"""Generate exactly 5 interview questions for a {category} interview round.
Return ONLY a JSON array of 5 strings, no extra text, no numbering, no markdown.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]
Make the questions realistic, varied, and suitable for a college student applying for their first job."""

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        text = response.text.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        questions = json.loads(text.strip())

        if not isinstance(questions, list) or len(questions) < 1:
            return jsonify({"error": "Gemini returned an invalid response format"}), 502

        return jsonify({"questions": questions[:5], "source": "gemini"})

    except JSONDecodeError:
        return jsonify({"error": "Gemini response could not be parsed as JSON"}), 502
    except Exception as e:
        return jsonify({"error": f"Gemini API error: {str(e)}"}), 502


# -----------------------------
# SUBMIT ANSWER (AJAX)
# -----------------------------
@app.route("/submit_answer", methods=["POST"])
def submit_answer():
    if "username" not in session:
        return jsonify({"error": "Not logged in"}), 401

    if not is_token_valid():
        return jsonify({"error": "Session expired"}), 401

    category   = request.form.get("category", "HR")
    question   = request.form.get("question", "")
    audio_file = request.files.get("audio")

    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400

    filename = f"{int(time.time())}_{audio_file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    audio_file.save(filepath)

    # Run full analysis (Whisper + ML fluency + LLM)
    result = full_audio_analysis(filepath, category=category)

    result_id = str(uuid.uuid4())
    result["id"]        = result_id
    result["category"]  = category
    result["question"]  = question
    result["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    result["username"]  = session["username"]

    # Generate PDF
    pdf_filename = f"report_{session['username']}_{int(time.time())}.pdf"
    pdf_path     = os.path.join(UPLOAD_FOLDER, pdf_filename)
    generate_pdf_report(result, pdf_path, report_title="Dribble Interview Report")
    result["pdf_file"] = pdf_filename

    # Save full result
    save_full_result(result)

    # Save summary for dashboard history
    history_entry = {
        "id":           result_id,
        "username":     session["username"],
        "timestamp":    result["timestamp"],
        "category":     category,
        "question":     question,
        "fluency_label": result.get("fluency_label", "Unknown")
    }
    save_result(history_entry)

    # Store last result in session for /report page
    session["result"]   = json.dumps(result)
    session["pdf_file"] = pdf_filename

    # Compute fluency score out of 10 from analysis metrics
    analysis      = result.get("analysis", {})
    filler_stats  = analysis.get("filler_stats", {})
    word_count    = analysis.get("word_count", 0)
    total_fillers = filler_stats.get("total_fillers", 0)
    fluency_label = result.get("fluency_label", "Non-Fluent")

    score_10 = 10.0

    # Word count scoring — ideal answer is 60–200 words
    if word_count == 0:
        score_10 -= 6
    elif word_count < 20:
        score_10 -= 4
    elif word_count < 40:
        score_10 -= 2
    elif word_count < 60:
        score_10 -= 1

    # Filler word penalty — each 5% filler ratio costs 1 point (max 4 pts)
    if word_count > 0:
        filler_ratio   = total_fillers / word_count
        filler_penalty = min(round(filler_ratio * 20, 1), 4.0)
        score_10 -= filler_penalty

    # ML label penalty
    if fluency_label.lower() in ("non-fluent", "non fluent"):
        score_10 -= 1.5

    # Clamp between 1 and 10
    score_10 = max(1.0, min(10.0, round(score_10, 1)))

    # Pull rich features from pipeline
    features     = result.get("features", {})
    filler_stats = analysis.get("filler_stats", {})

    # Per-filler-word breakdown (exclude the 'total_fillers' key)
    filler_breakdown = {
        k: v for k, v in filler_stats.items()
        if k != "total_fillers" and v > 0
    }

    return jsonify({
        "transcript":         result.get("transcript", ""),
        "fluency_label":      fluency_label,
        "fluency_score":      score_10,
        "llm_feedback":       result.get("llm_feedback", ""),
        "result_id":          result_id,

        # Speech metrics
        "word_count":         word_count,
        "total_fillers":      total_fillers,
        "filler_breakdown":   filler_breakdown,
        "duration_sec":       features.get("duration_sec", 0),
        "speaking_rate_wps":  features.get("speaking_rate_wps", 0),
        "unique_word_ratio":  features.get("unique_word_ratio", 0),
        "avg_word_length":    features.get("avg_word_length", 0),
        "sentence_count":     features.get("sentence_count", 0),
    })


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

    found = _get_accessible_full_result(result_id)

    if not found:
        flash("Result not found!", "danger")
        return redirect("/dashboard")

    report_data = _build_result_metrics(found)

    return render_template(
        "view_result.html",
        result           = found,
        token            = session["token"],
        fluency_score    = report_data["fluency_score"],
        word_count       = report_data["word_count"],
        total_fillers    = report_data["total_fillers"],
        filler_breakdown = report_data["filler_breakdown"],
        features         = report_data["features"],
    )


# -----------------------------
# INTERNAL RESULT HELPERS
# -----------------------------
def _get_accessible_full_result(result_id):
    all_results = load_full_results()
    for r in all_results:
        if r.get("id") != result_id:
            continue
        if session.get("role") == "admin" or r.get("username") == session.get("username"):
            return r
    return None


def _build_result_metrics(result_obj):
    analysis = result_obj.get("analysis") or {}
    filler_stats = analysis.get("filler_stats") or {}
    features = result_obj.get("features") or {}
    fluency_label = result_obj.get("fluency_label") or "Non-Fluent"

    word_count = analysis.get("word_count") or features.get("word_count") or 0
    total_fillers = filler_stats.get("total_fillers") or features.get("total_fillers") or 0

    score_10 = 10.0

    if word_count == 0:
        score_10 -= 6
    elif word_count < 20:
        score_10 -= 4
    elif word_count < 40:
        score_10 -= 2
    elif word_count < 60:
        score_10 -= 1

    if word_count > 0:
        filler_ratio = total_fillers / word_count
        filler_penalty = min(round(filler_ratio * 20, 1), 4.0)
        score_10 -= filler_penalty

    if fluency_label.lower() in ("non-fluent", "non fluent", "poor"):
        score_10 -= 1.5

    score_10 = max(1.0, min(10.0, round(score_10, 1)))

    filler_breakdown = {
        k: v for k, v in filler_stats.items()
        if k != "total_fillers" and isinstance(v, (int, float)) and v > 0
    }

    return {
        "fluency_score": score_10,
        "word_count": word_count,
        "total_fillers": total_fillers,
        "filler_breakdown": filler_breakdown,
        "features": features,
    }


# -----------------------------
# VIEW RESULT API (JSON)
# -----------------------------
@app.route("/api/result/<result_id>")
def api_result(result_id):
    if "username" not in session:
        return jsonify({"ok": False, "error": "Not logged in"}), 401

    if not is_token_valid():
        return jsonify({"ok": False, "error": "Session expired"}), 401

    found = _get_accessible_full_result(result_id)
    if not found:
        return jsonify({"ok": False, "error": "Result not found"}), 404

    report_data = _build_result_metrics(found)

    seconds_left = max(
        0,
        TOKEN_EXPIRY_SECONDS - int(time.time() - session.get("token_time", time.time()))
    )

    return jsonify({
        "ok": True,
        "username": session.get("username"),
        "role": session.get("role", "user"),
        "token": session.get("token", ""),
        "seconds_left": seconds_left,
        "result": found,
        "fluency_score": report_data["fluency_score"],
        "word_count": report_data["word_count"],
        "total_fillers": report_data["total_fillers"],
        "filler_breakdown": report_data["filler_breakdown"],
        "features": report_data["features"],
    })


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
# LATENCY INTERNAL HELPERS
# -----------------------------
def _build_latency_pdf_data(latency_result):
    return {
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


def _run_latency_benchmark(audio_file):
    filename = f"{int(time.time())}_{audio_file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    audio_file.save(filepath)

    latency_result = latency_test_10_runs(filepath, runs=10)
    session["latency_result"] = json.dumps(latency_result)

    pdf_filename = f"latency_report_{session['username']}_{int(time.time())}.pdf"
    pdf_path = os.path.join(UPLOAD_FOLDER, pdf_filename)
    pdf_data = _build_latency_pdf_data(latency_result)

    generate_pdf_report(pdf_data, pdf_path, report_title="Dribble Latency Benchmark Report")
    session["latency_pdf_file"] = pdf_filename

    return latency_result, pdf_filename


# -----------------------------
# LATENCY BENCHMARK API (JSON)
# -----------------------------
@app.route("/api/latency/benchmark", methods=["POST"])
def api_latency_benchmark():
    if "username" not in session:
        return jsonify({"ok": False, "error": "Not logged in"}), 401

    if not is_token_valid():
        return jsonify({"ok": False, "error": "Session expired"}), 401

    audio_file = request.files.get("audio")
    if not audio_file:
        return jsonify({"ok": False, "error": "Please upload a file."}), 400

    if not audio_file.filename:
        return jsonify({"ok": False, "error": "Uploaded file is invalid."}), 400

    try:
        latency_result, pdf_filename = _run_latency_benchmark(audio_file)
    except Exception as exc:
        return jsonify({"ok": False, "error": f"Latency benchmark failed: {str(exc)}"}), 500

    seconds_left = max(
        0,
        TOKEN_EXPIRY_SECONDS - int(time.time() - session.get("token_time", time.time()))
    )

    return jsonify({
        "ok": True,
        "username": session.get("username"),
        "role": session.get("role", "user"),
        "token": session.get("token", ""),
        "seconds_left": seconds_left,
        "latency_result": latency_result,
        "pdf_file": pdf_filename,
        "redirect": "/latency_result",
    })


# -----------------------------
# LATENCY RESULT API (JSON)
# -----------------------------
@app.route("/api/latency/result")
def api_latency_result():
    if "username" not in session:
        return jsonify({"ok": False, "error": "Not logged in"}), 401

    if not is_token_valid():
        return jsonify({"ok": False, "error": "Session expired"}), 401

    if "latency_result" not in session:
        return jsonify({"ok": False, "error": "No benchmark result found."}), 404

    try:
        latency_result_data = json.loads(session["latency_result"])
    except JSONDecodeError:
        return jsonify({"ok": False, "error": "Stored benchmark data is corrupted."}), 500

    seconds_left = max(
        0,
        TOKEN_EXPIRY_SECONDS - int(time.time() - session.get("token_time", time.time()))
    )

    return jsonify({
        "ok": True,
        "username": session.get("username"),
        "role": session.get("role", "user"),
        "token": session.get("token", ""),
        "seconds_left": seconds_left,
        "latency_result": latency_result_data,
        "pdf_file": session.get("latency_pdf_file"),
    })


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

        try:
            _run_latency_benchmark(audio_file)
        except Exception:
            flash("Latency benchmark failed. Please try again.", "danger")
            return redirect("/latency")

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
    return redirect("/")


if __name__ == "__main__":
    app.run(debug=True)