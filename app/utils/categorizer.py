_MERCHANT_TO_CATEGORY: dict[str, str] = {
    # Food & Dining
    "swiggy": "Food & Dining",
    "zomato": "Food & Dining",
    "dominos": "Food & Dining",
    "pizza_hut": "Food & Dining",
    "kfc": "Food & Dining",
    "mcdonalds": "Food & Dining",
    "burger_king": "Food & Dining",
    "subway": "Food & Dining",
    "starbucks": "Food & Dining",
    "cafe": "Food & Dining",
    "restaurant": "Food & Dining",
    # Groceries
    "bigbasket": "Groceries",
    "blinkit": "Groceries",
    "zepto": "Groceries",
    "groceries": "Groceries",
    "dmart": "Groceries",
    # Shopping
    "amazon": "Shopping",
    "flipkart": "Shopping",
    "myntra": "Shopping",
    "nykaa": "Shopping",
    "shopping": "Shopping",
    # Entertainment
    "bookmyshow": "Entertainment",
    "cinema": "Entertainment",
    "netflix": "Entertainment",
    "hotstar": "Entertainment",
    "spotify": "Entertainment",
    "streaming": "Entertainment",
    "google_play": "Entertainment",
    # Travel
    "makemytrip": "Travel",
    "cleartrip": "Travel",
    "ixigo": "Travel",
    "goibibo": "Travel",
    "oyo": "Travel",
    "redbus": "Travel",
    "irctc": "Travel",
    "travel": "Travel",
    # Transport
    "uber": "Transport",
    "ola": "Transport",
    "rapido": "Transport",
    "taxi": "Transport",
    "metro": "Transport",
    "bus": "Transport",
    "car_rental": "Transport",
    # Fuel
    "fuel": "Fuel & Petrol",
    # Utilities & Bills
    "utilities": "Utilities & Bills",
    "airtel": "Utilities & Bills",
    "jio": "Utilities & Bills",
    "bsnl": "Utilities & Bills",
    # Health & Medical
    "pharmacy": "Health & Medical",
    "hospital": "Health & Medical",
    "medical": "Health & Medical",
    # Investments
    "groww": "Investments",
    "zerodha": "Investments",
    "upstox": "Investments",
    "investment": "Investments",
    # Insurance
    "lic": "Insurance",
    "insurance": "Insurance",
    # Education
    "udemy": "Education",
    "coursera": "Education",
    "education": "Education",
    # EMI & Loans
    "emi": "EMI & Loans",
    "loan": "EMI & Loans",
    # Salary
    "salary": "Salary",
    # ATM / Cash
    "atm": "Cash Withdrawal",
}


def categorize_from_merchant(merchant: str) -> str:
    # Exact match first
    if merchant in _MERCHANT_TO_CATEGORY:
        return _MERCHANT_TO_CATEGORY[merchant]

    # Substring fallback for dynamic UPI names and partial matches
    for key, category in _MERCHANT_TO_CATEGORY.items():
        if key in merchant:
            return category

    return "Other"
