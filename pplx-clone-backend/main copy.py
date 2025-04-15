import asyncio
import time
import json
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

app = FastAPI()

# An asyncio.Queue to receive human feedback asynchronously.
feedback_queue: asyncio.Queue[str] = asyncio.Queue()


# A simple Pydantic model for user-submitted feedback.
class Feedback(BaseModel):
    feedback: str


# Simulated ReflectionAgent that “processes” the paragraph context.
class ReflectionAgent:
    def run_with_feedback(self, context: dict) -> str:
        """
        Simulate processing the context.
        In a real implementation, this method would call your LLM (e.g., via OpenAI API)
        using an updated prompt that includes any user feedback.
        """
        # Simulate processing delay
        time.sleep(1)
        # The agent takes the previous summary and attaches new info if user feedback is present.
        base_summary = context.get("paragraph_latest_state", "No summary yet")
        user_feedback = context.get("user_feedback", "")
        updated_summary = base_summary + " | Updated with feedback: " + user_feedback if user_feedback else base_summary
        # For demonstration, return a string summary.
        return f"Processed summary based on title '{context.get('title')}'. New summary: {updated_summary}"


# Instantiate our simulated ReflectionAgent.
reflection_agent = ReflectionAgent()


# A simple Paragraph class to hold our state.
class Paragraph:
    def __init__(self, title: str, content: str, latest_state: str = "Initial state"):
        self.title = title
        self.content = content
        self.latest_state = latest_state

    def to_dict(self):
        return {
            "title": self.title,
            "content": self.content,
            "latest_state": self.latest_state
        }


# Global application state representing the research report
STATE = {
    "paragraphs": [
        Paragraph("Paragraph 1", "Content about human species")
    ]
}


async def get_feedback_if_any() -> str | None:
    """
    Non-blocking check for user feedback from the queue.
    """
    try:
        # get_nowait() will raise asyncio.QueueEmpty if no item is available.
        fb = feedback_queue.get_nowait()
        return fb
    except asyncio.QueueEmpty:
        return None


async def research_pipeline():
    """
    A background task representing the research pipeline.
    For each paragraph, it runs several reflection iterations.
    Each iteration checks for new user feedback.
    """
    NUM_REFLECTIONS = 3  # Number of iterations for reflection
    for idx, paragraph in enumerate(STATE["paragraphs"]):
        for iteration in range(NUM_REFLECTIONS):
            # Build the current context for reflection.
            context = {
                "paragraph_latest_state": paragraph.latest_state,
                "title": paragraph.title,
                "content": paragraph.content
            }

            # Check for any user feedback (non-blocking)
            user_feedback = await get_feedback_if_any()
            if user_feedback:
                print(f"Integrating user feedback: {user_feedback}")
                context["user_feedback"] = user_feedback

            # Call the reflection agent with the current context (simulate LLM inference)
            updated_output = reflection_agent.run_with_feedback(context)
            print(f"[Iteration {iteration+1}] {updated_output}")

            # Update the paragraph's state with the new summary.
            paragraph.latest_state = updated_output

            # Wait a short time to simulate processing and allow time for feedback.
            await asyncio.sleep(0.5)

        # At the end of processing for each paragraph, print the final summary.
        print(f"Final summary for '{paragraph.title}': {paragraph.latest_state}")


@app.post("/feedback")
async def feedback_endpoint(feedback: Feedback):
    """
    Endpoint for users to submit feedback.
    The feedback is added to the asynchronous feedback queue.
    """
    await feedback_queue.put(feedback.feedback)
    return {"status": "feedback received", "feedback": feedback.feedback}


@app.post("/start")
async def start_pipeline(background_tasks: BackgroundTasks):
    """
    Endpoint to start the research pipeline.
    The pipeline runs as a background task while the FastAPI server remains responsive.
    """
    background_tasks.add_task(research_pipeline)
    return {"status": "pipeline started"}


@app.get("/state")
async def get_state():
    """
    Optional endpoint to inspect the current state of the paragraphs.
    """
    paragraphs = [p.to_dict() for p in STATE["paragraphs"]]
    return {"state": paragraphs}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8001)
