from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import openai
import uuid
from pydantic import BaseModel
import time
from dotenv import load_dotenv
import os
import asyncio
from tavily import TavilyClient

load_dotenv()

# --- SambaNova config ---
class Config:
    SAMBANOVA_API_KEY = os.getenv("SAMBANOVA_API_KEY")
    SAMBANOVA_BASE_URL = os.getenv("SAMBANOVA_BASE_URL")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    LLM_REASONING = "Meta-Llama-3.3-70B-Instruct"

config = Config()

# --- Create SambaNova client ---
openai_client = openai.OpenAI(
    api_key=config.SAMBANOVA_API_KEY,
    base_url=config.SAMBANOVA_BASE_URL
)

# --- FastAPI setup ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory store for sessions and user injections ---
sessions = {}

class PromptInput(BaseModel):
    prompt: str

class FeedbackInput(BaseModel):
    session_id: str
    feedback: str

async def generate_research_data(user_prompt: str) -> str:
    """Call SambaNova to generate research context based on user input."""
    system_prompt = "You are a research assistant. Provide relevant factual information and context for the following research prompt."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    response = openai_client.chat.completions.create(
        model=config.LLM_REASONING,
        messages=messages
    )
    return response.choices[0].message.content.strip()

@app.post("/start")
async def start_reasoning(user_input: PromptInput):
    # session_id = str(uuid.uuid4())
    session_id = '0'
    sessions[session_id] = {
        "user_prompt": user_input.prompt,
        "injected_feedback": [],
    }
    return {"session_id": session_id}

@app.post("/feedback")
async def inject_feedback(feedback: FeedbackInput):
    if feedback.session_id in sessions:
        sessions[feedback.session_id]["injected_feedback"].append(feedback.feedback)
        return {"status": "feedback received"}
    return {"status": "session not found"}

@app.get("/stream/{session_id}")
async def stream_response(session_id: str, request: Request):
    if session_id not in sessions:
        return {"error": "Invalid session ID"}

    user_prompt = sessions[session_id]["user_prompt"]
    injected_feedback = sessions[session_id]["injected_feedback"]
    research_context = await generate_research_data(user_prompt)

    async def token_stream():
        try:
            system_prompt = (
                f"You are an intelligent agent helping with deep reasoning. Your job is to provide a report of 5 paragraphs each containing around 10 sentences.\n"
                f"User research request: {user_prompt}\n\n"
                f"Relevant context:\n{research_context}\n\n"
                f"Start thinking step-by-step."
            )

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            def start_stream(prompt_messages):
                return openai_client.chat.completions.create(
                    model=config.LLM_REASONING,
                    messages=prompt_messages,
                    stream=True,
                )

            stream = start_stream(messages)

            full_text = ""
            paragraph_count = 0
            start_time = time.time()
            MAX_PARAGRAPHS = 100
            TIME_LIMIT = 15

            while True:
                for chunk in stream:
                    if await request.is_disconnected():
                        print("\n[Client disconnected — stopping stream]\n")
                        return

                    token = chunk.choices[0].delta.content or ""
                    full_text += token
                    print(token, end="", flush=True)
                    yield token

                    if token.count("\n\n") > 0:
                        paragraph_count += token.count("\n\n")

                    if paragraph_count >= MAX_PARAGRAPHS:
                        print(f"\n[Stopping: Reached {MAX_PARAGRAPHS} paragraphs]\n")
                        return
                    if time.time() - start_time > TIME_LIMIT:
                        print(f"\n[Stopping: Reached {TIME_LIMIT} seconds]\n")
                        return

                    if sessions[session_id]["injected_feedback"]:
                        feedback_text = "\n".join(sessions[session_id]["injected_feedback"])
                        sessions[session_id]["injected_feedback"].clear()

                        print(f"\n[RESTARTING with feedback: {feedback_text}]\n")

                        new_prompt = f"{user_prompt}\n\nUpdate: {feedback_text}"
                        messages = [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": new_prompt}
                        ]
                        stream = start_stream(messages)
                        full_text = ""
                        paragraph_count = 0
                        start_time = time.time()
                        break  # Break inner for-loop to restart while-loop
                else:
                    break  # Break outer while-loop if for-loop wasn't restarted

        except Exception as e:
            print(f"\n[Error while streaming: {e}]\n")

    return StreamingResponse(token_stream(), media_type="text/plain")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)