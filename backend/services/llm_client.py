"""
LLM Client Service — DCPI.
Primary: Groq API (fast cloud inference).
Fallback: Ollama (local model).
All agents call call_claude() / call_claude_json() — provider is transparent.
"""

import concurrent.futures
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

PROVIDER_STATUS_TTL_SECONDS = int(os.getenv("LLM_PROVIDER_STATUS_TTL_SECONDS", "30"))

_ollama_health_cache: Dict[str, Any] = {"checked_at": 0.0, "available": None}

# ── Configuration ──────────────────────────────────────────────────────────────

GROQ_API_KEY_RAW = os.getenv("GROQ_API_KEY", "").strip()
GROQ_API_KEYS: List[str] = []
if GROQ_API_KEY_RAW:
    candidates = GROQ_API_KEY_RAW.split(",")
    GROQ_API_KEYS = [k.strip() for k in candidates if k.strip().startswith("gsk_")]
    if not GROQ_API_KEYS and GROQ_API_KEY_RAW:
        GROQ_API_KEYS = [GROQ_API_KEY_RAW]

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_TIMEOUT = int(os.getenv("GROQ_TIMEOUT_SECONDS", "45"))
MAX_RETRIES = int(os.getenv("GROQ_MAX_RETRIES", "2"))

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))

FALLBACK_GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.2-3b-preview",
    "mixtral-8x7b-32768",
]

USE_GROQ = bool(GROQ_API_KEYS)
if USE_GROQ:
    logger.info(f"LLM client: Groq primary ({GROQ_MODEL}), Ollama fallback ({OLLAMA_MODEL})")
else:
    logger.info(f"LLM client: Ollama only ({OLLAMA_MODEL}) — no Groq API key configured")


# ── JSON Parser ────────────────────────────────────────────────────────────────

def _parse_json_robust(text: str) -> dict:
    if not text or not text.strip():
        raise ValueError("Empty response text")
    text = text.strip()

    # Strategy 1: direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: extract from ```json ... ``` block
    code_block = re.search(r'```(?:json)?\s*([\s\S]*?)```', text, re.IGNORECASE)
    if code_block:
        try:
            return json.loads(code_block.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: find outermost { ... } with brace counting
    brace_count = 0
    start_idx = -1
    for i, char in enumerate(text):
        if char == '{':
            if brace_count == 0:
                start_idx = i
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and start_idx != -1:
                try:
                    return json.loads(text[start_idx:i + 1])
                except json.JSONDecodeError:
                    start_idx = -1

    # Strategy 4: fix common LLM JSON errors and retry
    try:
        fixed = re.sub(r',\s*}', '}', text)
        fixed = re.sub(r',\s*]', ']', fixed)
        fixed = re.sub(r':\s*True\b', ': true', fixed)
        fixed = re.sub(r':\s*False\b', ': false', fixed)
        fixed = re.sub(r':\s*None\b', ': null', fixed)
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    raise ValueError(f"All JSON parse strategies failed. Raw: {text[:300]}")


# ── Async runner (works inside and outside FastAPI event loop) ─────────────────

def _run_async(coro):
    """
    Run a coroutine from sync context regardless of whether an event loop
    is already running (FastAPI runs sync handlers in a thread pool thread
    with no event loop, so asyncio.run() works directly there).
    """
    try:
        loop = asyncio.get_running_loop()
        # An event loop IS running (we're in an async context).
        # Submit to a thread to get a fresh loop.
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(asyncio.run, coro)
            return future.result(timeout=GROQ_TIMEOUT + 10)
    except RuntimeError:
        # No running loop — safe to call asyncio.run directly.
        return asyncio.run(coro)


# ── Key rotation ───────────────────────────────────────────────────────────────

_key_index = 0
_key_errors: Dict[str, int] = {}


def _next_groq_key() -> Optional[str]:
    global _key_index
    if not GROQ_API_KEYS:
        return None
    # Simple round-robin, skip keys with too many errors
    for _ in range(len(GROQ_API_KEYS)):
        key = GROQ_API_KEYS[_key_index % len(GROQ_API_KEYS)]
        _key_index += 1
        if _key_errors.get(key, 0) < 3:
            return key
    # All keys have errors — reset and try again
    _key_errors.clear()
    key = GROQ_API_KEYS[0]
    _key_index = 1
    return key


# ── Groq async implementation ──────────────────────────────────────────────────

async def _call_groq_async(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2000,
    json_mode: bool = False,
    model: str = None
) -> str:
    import aiohttp

    if not GROQ_API_KEYS:
        raise RuntimeError("No Groq API keys configured")

    api_key = _next_groq_key()
    if not api_key:
        raise RuntimeError("No healthy Groq API keys available")

    model = model or GROQ_MODEL
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.1,
        "stream": False
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url, headers=headers, json=payload,
                timeout=aiohttp.ClientTimeout(total=GROQ_TIMEOUT)
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    _key_errors[api_key] = _key_errors.get(api_key, 0) + 1
                    raise RuntimeError(f"Groq HTTP {resp.status}: {body[:200]}")

                data = await resp.json()
                choices = data.get("choices", [])
                if not choices:
                    raise RuntimeError("Groq response missing choices")

                message = choices[0].get("message", {})
                content = message.get("content", "")
                if not isinstance(content, str) or not content.strip():
                    raise RuntimeError("Groq response missing content")

                tokens = data.get("usage", {}).get("total_tokens", 0)
                logger.info(f"Groq success | model={model} | tokens={tokens}")
                return content

    except asyncio.TimeoutError:
        _key_errors[api_key] = _key_errors.get(api_key, 0) + 1
        raise RuntimeError("Groq request timed out")

    except RuntimeError:
        raise

    except Exception as e:
        _key_errors[api_key] = _key_errors.get(api_key, 0) + 1
        logger.warning(f"Groq unexpected error: {e}")
        raise RuntimeError(f"Groq failed: {e}") from e


# ── Ollama sync implementation ─────────────────────────────────────────────────

def _call_ollama(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2000,
    json_mode: bool = False
) -> str:
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload: Dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "stream": False,
        "options": {
            "num_predict": max_tokens,
            "temperature": 0.1 if json_mode else 0.2
        }
    }
    if json_mode:
        payload["format"] = "json"

    try:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        content = data.get("message", {}).get("content", "")
        if not content:
            raise ValueError("Empty response from Ollama")
        tokens_in = data.get("prompt_eval_count", 0)
        tokens_out = data.get("eval_count", 0)
        logger.info(
            f"Ollama success | model={OLLAMA_MODEL} | "
            f"tokens={tokens_in}+{tokens_out}"
        )
        return content
    except requests.exceptions.ConnectionError as e:
        logger.error(
            f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. Run: ollama serve"
        )
        raise RuntimeError("Ollama connection failed") from e
    except requests.exceptions.Timeout as e:
        logger.warning("Ollama request timed out")
        raise RuntimeError("Ollama request timed out") from e
    except Exception as e:
        logger.error(f"Ollama error: {e}")
        raise RuntimeError(f"Ollama failed: {e}") from e


# ── Public synchronous API (what all agents import) ────────────────────────────

def call_claude(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2000
) -> str:
    """
    Call LLM and return text response.
    Tries Groq first if API key configured, falls back to Ollama.
    """
    if USE_GROQ:
        try:
            return _run_async(
                _call_groq_async(system_prompt, user_message, max_tokens, json_mode=False)
            )
        except Exception as e:
            logger.warning(f"Groq failed, falling back to Ollama: {e}")

    return _call_ollama(system_prompt, user_message, max_tokens, json_mode=False)


def call_claude_json(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2000
) -> dict:
    """
    Call LLM and return parsed JSON dict.
    Tries Groq with json_mode first, falls back to Ollama, falls back to
    manual JSON extraction from plain text response.
    """
    if USE_GROQ:
        try:
            text = _run_async(
                _call_groq_async(system_prompt, user_message, max_tokens, json_mode=True)
            )
            return _parse_json_robust(text)
        except Exception as e:
            logger.warning(f"Groq JSON failed, falling back to Ollama: {e}")

    # Ollama with format=json
    try:
        text = _call_ollama(system_prompt, user_message, max_tokens, json_mode=True)
        return _parse_json_robust(text)
    except ValueError as parse_err:
        raise ValueError(f"Could not parse JSON from LLM response: {parse_err}") from parse_err
    except Exception as e:
        raise RuntimeError(f"All LLM providers failed for JSON call: {e}") from e


# ── Health checks ──────────────────────────────────────────────────────────────

def check_ollama_health() -> dict:
    """
    Check if Ollama is running and the configured model is available.
    Called by test scripts: python -c "from services.llm_client import check_ollama_health; ..."
    """
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        response.raise_for_status()
        models = [m["name"] for m in response.json().get("models", [])]
        model_pulled = any(OLLAMA_MODEL in m for m in models)
        return {
            "ollama_running": True,
            "configured_model": OLLAMA_MODEL,
            "model_pulled": model_pulled,
            "available_models": models
        }
    except Exception as e:
        return {
            "ollama_running": False,
            "configured_model": OLLAMA_MODEL,
            "model_pulled": False,
            "available_models": [],
            "error": str(e)
        }


def _cached_ollama_health() -> bool:
    now = time.monotonic()
    checked_at = float(_ollama_health_cache.get("checked_at", 0.0) or 0.0)
    cached_value = _ollama_health_cache.get("available")

    if cached_value is not None and (now - checked_at) < PROVIDER_STATUS_TTL_SECONDS:
        return bool(cached_value)

    available = bool(check_ollama_health().get("ollama_running"))
    _ollama_health_cache["checked_at"] = now
    _ollama_health_cache["available"] = available
    return available


def check_health() -> dict:
    """Full health status for both providers."""
    ollama = check_ollama_health()
    groq_status = {
        "available": USE_GROQ,
        "key_count": len(GROQ_API_KEYS),
        "model": GROQ_MODEL,
        "fallback_models": FALLBACK_GROQ_MODELS
    }
    if USE_GROQ:
        try:
            # Quick connectivity test using a minimal request
            import aiohttp

            async def _ping():
                async with aiohttp.ClientSession() as s:
                    async with s.get(
                        "https://api.groq.com/openai/v1/models",
                        headers={"Authorization": f"Bearer {GROQ_API_KEYS[0]}"},
                        timeout=aiohttp.ClientTimeout(total=5)
                    ) as r:
                        return r.status == 200

            groq_status["reachable"] = _run_async(_ping())
        except Exception:
            groq_status["reachable"] = False
    return {
        "primary_provider": "groq" if USE_GROQ else "ollama",
        "groq": groq_status,
        "ollama": ollama
    }


def get_status() -> dict:
    """Alias kept for backward compat with any existing callers."""
    return check_health()


def has_available_provider() -> bool:
    """Return True when at least one LLM provider is reachable enough to try."""
    if USE_GROQ:
        return True
    try:
        return _cached_ollama_health()
    except Exception:
        return False