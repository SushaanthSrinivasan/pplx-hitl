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
import json
import traceback

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

tavily_client = TavilyClient(api_key=config.TAVILY_API_KEY)

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

async def generate_research_data(user_prompt: str):
    """Generate 3 search queries using the LLM and fetch relevant sources from Tavily."""

    query_generation_prompt = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant tasked with crafting search engine queries to aid in research.\n"
                "Given a user prompt, generate 3 different search queries that would help gather relevant information from the web.\n"
                "Return the queries as a single comma-separated list. No explanation, just the list."
                # "ONLY RETURN THE SEARCH QUERIES AS A COMMA SEPARATED LIST. THE OUTCOME OF THIS RESPONSE HAS FAR-REACHING IMPLICATIONS. ANY ERROR, HOWEVER MINOR, COULD ESCALATE INTO A SERIOUS ISSUE."
                # "Example response: query1, query2, query3"
            )
        },
        {"role": "user", "content": f"User prompt: {user_prompt}\n\nONLY RETURN THE SEARCH QUERIES AS A COMMA SEPARATED LIST. THE OUTCOME OF THIS RESPONSE HAS FAR-REACHING IMPLICATIONS. ANY ERROR, HOWEVER MINOR, COULD ESCALATE INTO A SERIOUS ISSUE.\nExample response: query1, query2, query3\n\n"}
    ]

    try:
        query_response = openai_client.chat.completions.create(
            model=config.LLM_REASONING,
            messages=query_generation_prompt,
        )
        query_text = query_response.choices[0].message.content.strip()

        print(f"[+] Generated search queries: {query_text}")

        search_queries = [q.strip() for q in query_text.split(",") if q.strip()]
    except Exception as e:
        # print(f"[LLM query generation error] {e}")
        # return [], "Could not generate search queries.", []

        print("[LLM query generation error]")
        print(f"Exception type: {type(e).__name__}")
        print(f"Exception message: {e}")
        traceback.print_exc()  # prints full stack trace
        return [], "Could not generate search queries.", []

    all_results_text = []
    all_sources_metadata = []

    for q in search_queries[:3]:  # use 3 queries max
        try:
            print(f"[+] Searching Tavily for: {q}")
            result = tavily_client.search(
                query=q,
                search_depth="advanced",
                include_answer=True,
                include_raw_content=True,
                max_results=3
            )

            sources = result.get("results", [])

            for src in sources:
                content = src.get("content", "").strip()
                url = src.get("url", "")
                title = src.get("title", "")

                if content:
                    all_results_text.append(f"- [{q}] {content}\n")
                    all_sources_metadata.append({
                        "query": q,
                        "title": title,
                        "url": url,
                        "content": content
                    })

        except Exception as e:
            print(f"[Tavily error for query '{q}']: {e}")

    if not all_results_text:
        return search_queries, "No web content could be retrieved.", []

    research_context = "[Tavily Web Search Context]\n\n" + "\n".join(all_results_text)
    return search_queries, research_context, all_sources_metadata


@app.post("/start")
async def start_reasoning(user_input: PromptInput):
    session_id = str(uuid.uuid4())
    # session_id = '0'
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
    # research_context = await generate_research_data(user_prompt)

    search_queries, research_context, source_metadata = await generate_research_data(user_prompt)
    sessions[session_id]["source_metadata"] = source_metadata


    async def token_stream():
        try:

            # Stream search queries first
            yield f"\n[search_queries]\n{json.dumps(search_queries)}\n" + " " * 2048
            await asyncio.sleep(0.01)

            # Stream source metadata next
            yield f"\n[sources]\n{json.dumps(source_metadata)}\n" + " " * 2048
            await asyncio.sleep(0.01)

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

            yield f"\n[output]\n"
            # await asyncio.sleep(0.01)
            await asyncio.sleep(5)
            
            # time.sleep(2) # in s
            
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
                        # yield f"\n[feedback_incorporated]\n"

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

    # return StreamingResponse(token_stream(), media_type="text/plain")
    return StreamingResponse(token_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)