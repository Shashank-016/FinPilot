def categorize_from_merchant(merchant: str) -> str:

    if merchant in ["swiggy", "zomato", "dominos"]:
        return "Food"

    elif merchant in ["amazon"]:
        return "Shopping"

    elif merchant in ["bookmyshow", "google_play"]:
        return "Entertainment"

    elif merchant in ["groww"]:
        return "Investment"

    elif merchant in ["insurance"]:
        return "Health"

    elif merchant in ["travel", "redbus", "make my trip"]:
        return "Travel"

    elif merchant == "unknown":
        return "Other"

    else:
        return "Transfer"