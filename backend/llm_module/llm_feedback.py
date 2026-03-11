import os
import time
from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=API_KEY)


def generate_feedback(transcript, category="HR"):
    """
    Calls Gemini LLM API and generates interview feedback.
    Returns feedback text + latency.
    """

    prompt = f"""
You are an AI Interviewer.

Category: {category}

Candidate Answer Transcript:
{transcript}

Give output in this format:

1. Overall Rating (out of 10)
2. Strengths (3 bullet points)
3. Weaknesses (3 bullet points)
4. Suggestions to Improve (3 bullet points)
5. A sample improved answer (short)

Be strict but professional.
"""

    start_time = time.time()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    end_time = time.time()

    llm_latency = round(end_time - start_time, 2)

    return {
        "feedback": response.text,
        "llm_latency_sec": llm_latency
    }
