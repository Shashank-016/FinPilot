import json
import os

VALID_CATEGORIES = [
    "Food & Dining", "Groceries", "Shopping", "Entertainment",
    "Travel", "Transport", "Fuel & Petrol", "Utilities & Bills",
    "Health & Medical", "Investments", "Insurance", "Education",
    "EMI & Loans", "Salary", "Cash Withdrawal", "Bank Charges",
    "Rent", "Other",
]

_CATEGORIES_STR = ", ".join(VALID_CATEGORIES)


def categorize_with_llm(descriptions: list[str]) -> dict[str, str]:
    """Batch-categorize transaction descriptions using the LLM.

    Returns a mapping of description → category name.
    Falls back to 'Other' for any description the LLM cannot classify or on error.
    """
    if not descriptions:
        return {}

    api_key = os.environ.get("HF_API_KEY", "")
    if not api_key:
        return {d: "Other" for d in descriptions}

    try:
        from huggingface_hub import InferenceClient

        client = InferenceClient(api_key=api_key)

        unique = list(dict.fromkeys(descriptions))  # deduplicate, preserve order
        numbered = "\n".join(f"{i + 1}. {desc}" for i, desc in enumerate(unique))

        prompt = (
            f"You are categorizing Indian bank statement transactions.\n"
            f"Valid categories: {_CATEGORIES_STR}\n\n"
            f"Classify each transaction into exactly one category. "
            f"Reply with ONLY a JSON object like {{\"1\": \"Food & Dining\", \"2\": \"Salary\"}}. "
            f"Use \"Other\" only if genuinely uncertain.\n\n"
            f"Transactions:\n{numbered}"
        )

        response = client.chat.completions.create(
            model="Qwen/Qwen2.5-7B-Instruct",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=len(unique) * 12,
            temperature=0.0,
        )

        text = response.choices[0].message.content.strip()
        start, end = text.find("{"), text.rfind("}") + 1
        if start == -1 or end == 0:
            return {d: "Other" for d in descriptions}

        result = json.loads(text[start:end])
        index_to_category = {
            i + 1: (v if v in VALID_CATEGORIES else "Other")
            for i, (_, v) in enumerate(result.items())
        }

        lookup = {
            desc: index_to_category.get(i + 1, "Other")
            for i, desc in enumerate(unique)
        }
        return {d: lookup.get(d, "Other") for d in descriptions}

    except Exception:
        return {d: "Other" for d in descriptions}
