import re

def extract_merchant(desc: str) -> str:
    desc = desc.lower()

    # 🔥 Common known merchants first
    if "swiggy" in desc:
        return "swiggy"
    if "zomato" in desc:
        return "zomato"
    if "amazon" in desc:
        return "amazon"
    if "dominos" in desc:
        return "dominos"
    if "bookmyshow" in desc:
        return "bookmyshow"
    if "google play" in desc:
        return "google_play"
    if "groww" in desc:
        return "groww"
    if "prudential" in desc:
        return "insurance"
    if "redbus" in desc:
        return "travel"
    if "make my trip" in desc:
        return "travel"

    # 🔥 UPI pattern extraction (name after UPI-)
    match = re.search(r"upi-([a-z\s]+)-", desc)
    if match:
        return match.group(1).strip()

    return "unknown"