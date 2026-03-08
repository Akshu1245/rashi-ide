import os
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

# the newest OpenAI model is "gpt-5" which was released August 7, 2025.
# do not change this unless explicitly requested by the user

_client = None
_settings = {
    "provider": "replit",
    "apiKey": "",
    "baseUrl": "",
    "model": "gpt-5-mini",
}

def get_settings():
    safe = dict(_settings)
    if safe.get("apiKey"):
        safe["apiKey"] = "***" + safe["apiKey"][-4:] if len(safe["apiKey"]) > 4 else "****"
    return safe

def get_raw_settings():
    return dict(_settings)

def update_settings(new_settings):
    global _client
    _settings.update(new_settings)
    _client = None

def get_client():
    global _client
    if _client is None:
        provider = _settings.get("provider", "replit")
        api_key = _settings.get("apiKey") or os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY")
        base_url = _settings.get("baseUrl") or os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")

        if provider == "openai" and not base_url:
            base_url = None
        elif provider == "kilocode" and not base_url:
            base_url = "https://api.kilocode.ai/v1"

        if base_url:
            _client = OpenAI(api_key=api_key, base_url=base_url)
        else:
            _client = OpenAI(api_key=api_key)
    return _client

def _get_model():
    return _settings.get("model", "gpt-5-mini") or "gpt-5-mini"

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
    model = _get_model() if _settings.get("model") else MODELS.get(model_type, MODELS["quick"])
    response = get_client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_completion_tokens=16384,
    )
    return response.choices[0].message.content or ""


async def chat_completion_stream(system_prompt, user_message, model_type="quick"):
    model = _get_model() if _settings.get("model") else MODELS.get(model_type, MODELS["quick"])
    stream = get_client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_completion_tokens=16384,
        stream=True,
    )
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=64),
    retry=retry_if_exception(is_rate_limit_error),
    reraise=True
)
def chat_completion_with_context(system_prompt, user_message, file_context, model_type="quick"):
    model = _get_model() if _settings.get("model") else MODELS.get(model_type, MODELS["quick"])
    context_text = ""
    if file_context:
        for file_path, content in file_context.items():
            context_text += f"\n--- {file_path} ---\n{content}\n"
    full_user_message = user_message
    if context_text:
        full_user_message = f"File context:\n{context_text}\n\nRequest: {user_message}"
    response = get_client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": full_user_message},
        ],
        max_completion_tokens=16384,
    )
    return response.choices[0].message.content or ""


def chat_completion_with_history(system_prompt, messages, model_type="quick"):
    model = _get_model() if _settings.get("model") else MODELS.get(model_type, MODELS["quick"])
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    response = get_client().chat.completions.create(
        model=model,
        messages=full_messages,
        max_completion_tokens=16384,
    )
    return response.choices[0].message.content or ""
