import os
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

# the newest OpenAI model is "gpt-5" which was released August 7, 2025.
# do not change this unless explicitly requested by the user

_client = None

def get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY"),
            base_url=os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")
        )
    return _client

MODELS = {
    "planning": "gpt-5-mini",
    "coding": "gpt-5-mini",
    "debugging": "gpt-5-mini",
    "quick": "gpt-5-mini",
}


def is_rate_limit_error(exception):
    error_msg = str(exception)
    return (
        "429" in error_msg
        or "RATELIMIT_EXCEEDED" in error_msg
        or "quota" in error_msg.lower()
        or "rate limit" in error_msg.lower()
        or (hasattr(exception, "status_code") and exception.status_code == 429)
    )


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=64),
    retry=retry_if_exception(is_rate_limit_error),
    reraise=True
)
def chat_completion(system_prompt, user_message, model_type="quick"):
    model = MODELS.get(model_type, MODELS["quick"])
    response = get_client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_completion_tokens=8192,
    )
    return response.choices[0].message.content or ""


async def chat_completion_stream(system_prompt, user_message, model_type="quick"):
    model = MODELS.get(model_type, MODELS["quick"])
    stream = get_client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_completion_tokens=8192,
        stream=True,
    )
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


def chat_completion_with_history(system_prompt, messages, model_type="quick"):
    model = MODELS.get(model_type, MODELS["quick"])
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    response = get_client().chat.completions.create(
        model=model,
        messages=full_messages,
        max_completion_tokens=8192,
    )
    return response.choices[0].message.content or ""
