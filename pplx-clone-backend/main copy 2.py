from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import asyncio
import os
import openai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# === Config ===
SAMBA_API_KEY = os.getenv("SAMBANOVA_API_KEY")
SAMBA_BASE_URL = os.getenv("SAMBANOVA_BASE_URL")
LLM_MODEL = "Meta-Llama-3.3-70B-Instruct"

# SambaNova client setup
samba_client = openai.OpenAI(
    api_key=SAMBA_API_KEY,
    base_url=SAMBA_BASE_URL
)

# === State ===
pipeline_state = []
latest_feedback = ""

# === Sample Data ===
research_data = [
    {"title": "Paragraph 1", "content": "The earliest humans developed language and tools."},
    {"title": "Paragraph 2", "content": "Agriculture allowed stable settlements and tech progress."},
    {"title": "Paragraph 3", "content": "Trade and writing led to the rise of complex societies."},
    {"title": "Paragraph 4", "content": "Empires formed through conquest, spreading culture and ideas."},
    {"title": "Paragraph 5", "content": "The Industrial Revolution transformed economies and daily life."}
]

# === Pydantic Models ===
class Feedback(BaseModel):
    feedback: str

# === Endpoints ===

@app.post("/start")
async def start_pipeline(background_tasks: BackgroundTasks):
    global pipeline_state
    pipeline_state = [{"title": p["title"], "content": p["content"], "latest_state": "Queued"} for p in research_data]
    print("[🚀] Pipeline started...")
    background_tasks.add_task(run_pipeline)
    return {"status": "Pipeline started"}

@app.post("/feedback")
async def receive_feedback(feedback: Feedback):
    global latest_feedback
    latest_feedback = feedback.feedback
    print(f"[📝] Feedback received: {latest_feedback}")
    return {"status": "Feedback received", "feedback": latest_feedback}

@app.get("/state")
async def get_state():
    return {"state": pipeline_state}

# === Core Logic ===

async def run_pipeline():
    global latest_feedback
    for i, paragraph in enumerate(research_data):
        prompt = create_prompt(paragraph["content"], latest_feedback)
        print(f"\n[🔍] Processing: {paragraph['title']}")
        print(f"[🧠] Prompt sent to LLM:\n{prompt}\n")

        try:
            result = await call_llm(prompt)
            pipeline_state[i]["latest_state"] = result
            print(f"[✅] Result:\n{result}\n")
        except Exception as e:
            error_msg = f"Error: {e}"
            pipeline_state[i]["latest_state"] = error_msg
            print(f"[❌] {error_msg}")
        await asyncio.sleep(5)  # Simulate processing time

def create_prompt(paragraph_text, feedback_text):
    prompt = f"Summarize the following paragraph:\n\n{paragraph_text}\n"
    if feedback_text:
        prompt += f"\nIncorporate this user feedback: \"{feedback_text}\""
    return prompt

async def call_llm(user_prompt: str) -> str:
    system_prompt = "You are a helpful research summarizer. Produce clear, informative summaries."

    response = samba_client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)