import re

# Descriptions containing these keywords are inter-account transfers
_TRANSFER_PATTERNS = [
    "neft", "rtgs", "imps", "fund transfer", "internal transfer",
    "self transfer", "own account", "inter bank", "outward transfer",
    "inward transfer", "a/c transfer", "ac transfer", "acct transfer",
    "transfer to own", "to own a/c",
]

# Keyword → merchant key (longest match wins)
_KEYWORD_TO_MERCHANT: dict[str, str] = {
    # Food & Dining
    "swiggy": "swiggy",
    "zomato": "zomato",
    "dominos": "dominos",
    "pizza hut": "pizza_hut",
    "kfc": "kfc",
    "mcdonald": "mcdonalds",
    "burger king": "burger_king",
    "subway": "subway",
    "starbucks": "starbucks",
    "cafe coffee day": "cafe",
    "chaayos": "cafe",
    "barbeque nation": "restaurant",
    "haldirams": "restaurant",
    "wow momo": "restaurant",
    "fassos": "restaurant",
    "behrouz": "restaurant",
    "box8": "restaurant",
    "eatfit": "restaurant",
    "freshmenu": "restaurant",
    # Groceries
    "bigbasket": "bigbasket",
    "big basket": "bigbasket",
    "blinkit": "blinkit",
    "zepto": "zepto",
    "grofers": "groceries",
    "instamart": "groceries",
    "dmart": "dmart",
    "reliance fresh": "groceries",
    "reliance smart": "groceries",
    "more supermarket": "groceries",
    "more retail": "groceries",
    "lulu": "groceries",
    "jiomart": "groceries",
    "spencers": "groceries",
    "nature's basket": "groceries",
    "nature basket": "groceries",
    "heritage fresh": "groceries",
    # Shopping
    "amazon": "amazon",
    "flipkart": "flipkart",
    "myntra": "myntra",
    "ajio": "shopping",
    "nykaa": "nykaa",
    "meesho": "shopping",
    "tata cliq": "shopping",
    "tatacliq": "shopping",
    "snapdeal": "shopping",
    "lifestyle store": "shopping",
    "westside": "shopping",
    "pantaloons": "shopping",
    "max fashion": "shopping",
    "shoppers stop": "shopping",
    "central": "shopping",
    "reliance digital": "shopping",
    "croma": "shopping",
    "vijay sales": "shopping",
    # Entertainment
    "bookmyshow": "bookmyshow",
    "pvr": "cinema",
    "inox": "cinema",
    "cinepolis": "cinema",
    "netflix": "netflix",
    "hotstar": "hotstar",
    "disney": "hotstar",
    "spotify": "spotify",
    "amazon prime": "streaming",
    "prime video": "streaming",
    "apple music": "streaming",
    "google play": "google_play",
    "sonyliv": "streaming",
    "zee5": "streaming",
    "jiocinema": "streaming",
    "voot": "streaming",
    "altbalaji": "streaming",
    "mxplayer": "streaming",
    "youtube premium": "streaming",
    # Travel & Accommodation
    "makemytrip": "makemytrip",
    "make my trip": "makemytrip",
    "cleartrip": "cleartrip",
    "ixigo": "ixigo",
    "goibibo": "goibibo",
    "yatra": "travel",
    "oyo": "oyo",
    "airbnb": "travel",
    "irctc": "irctc",
    "redbus": "redbus",
    "abhibus": "travel",
    "via.com": "travel",
    # Transport / Cab
    "uber": "uber",
    "ola cabs": "ola",
    "ola cab": "ola",
    "rapido": "rapido",
    "meru": "taxi",
    "zoomcar": "car_rental",
    "metro card": "metro",
    "metro rail": "metro",
    "dmrc": "metro",
    "bmtc": "bus",
    "apsrtc": "bus",
    "ksrtc": "bus",
    # Fuel / Petrol
    "hpcl": "fuel",
    "bpcl": "fuel",
    "iocl": "fuel",
    "indian oil": "fuel",
    "bharat petroleum": "fuel",
    "hindustan petroleum": "fuel",
    "hp petrol": "fuel",
    "hp pump": "fuel",
    "reliance petrol": "fuel",
    "shell petrol": "fuel",
    "essar petrol": "fuel",
    "petrol": "fuel",
    "diesel": "fuel",
    # Utilities & Bills
    "bescom": "utilities",
    "tata power": "utilities",
    "adani electricity": "utilities",
    "torrent power": "utilities",
    "msedcl": "utilities",
    "tneb": "utilities",
    "electricity bill": "utilities",
    "water bill": "utilities",
    "piped gas": "utilities",
    "mahanagar gas": "utilities",
    "indraprastha gas": "utilities",
    "society maintenance": "utilities",
    "maintenance charges": "utilities",
    "housing society": "utilities",
    "airtel": "airtel",
    "jio": "jio",
    "bsnl": "bsnl",
    "vi mobile": "utilities",
    "vodafone": "utilities",
    "act fiber": "utilities",
    "act fibernet": "utilities",
    "hathway": "utilities",
    "tataplay": "utilities",
    "tata sky": "utilities",
    "dish tv": "utilities",
    "sun direct": "utilities",
    "den network": "utilities",
    "broadband": "utilities",
    # Health & Medical
    "apollo pharmacy": "pharmacy",
    "apollo hospital": "hospital",
    "fortis": "hospital",
    "manipal hospital": "hospital",
    "max hospital": "hospital",
    "cloudnine": "hospital",
    "narayana health": "hospital",
    "1mg": "pharmacy",
    "pharmeasy": "pharmacy",
    "netmeds": "pharmacy",
    "healthkart": "pharmacy",
    "medicineindia": "pharmacy",
    "pharmacy": "pharmacy",
    "medical store": "pharmacy",
    "hospital": "hospital",
    "dental": "medical",
    "optician": "medical",
    "lenskart": "medical",
    # Investments
    "groww": "groww",
    "zerodha": "zerodha",
    "upstox": "upstox",
    "kuvera": "investment",
    "paytm money": "investment",
    "smallcase": "investment",
    "icicidirect": "investment",
    "motilal oswal": "investment",
    "fyers": "investment",
    "5paisa": "investment",
    "angel one": "investment",
    "angelone": "investment",
    "navi invest": "investment",
    "scripbox": "investment",
    "et money": "investment",
    "coin by zerodha": "zerodha",
    "mutual fund": "investment",
    "mf purchase": "investment",
    # Insurance
    "lic": "lic",
    "hdfc life": "insurance",
    "icici prudential": "insurance",
    "max life": "insurance",
    "sbi life": "insurance",
    "bajaj allianz": "insurance",
    "star health": "insurance",
    "tata aia": "insurance",
    "policybazaar": "insurance",
    "policy bazaar": "insurance",
    "prudential": "insurance",
    "insurance premium": "insurance",
    "term plan": "insurance",
    # Education
    "udemy": "udemy",
    "coursera": "coursera",
    "byjus": "education",
    "byju": "education",
    "unacademy": "education",
    "physics wallah": "education",
    "physicswallah": "education",
    "vedantu": "education",
    "duolingo": "education",
    "tuition fee": "education",
    "school fee": "education",
    "college fee": "education",
    "university fee": "education",
    # EMI / Loans
    "home loan emi": "loan",
    "car loan emi": "loan",
    "personal loan emi": "loan",
    "loan emi": "loan",
    " emi ": "emi",
    "-emi-": "emi",
    "/emi/": "emi",
    # Salary / Income markers
    "salary": "salary",
    "stipend": "salary",
    "wages": "salary",
    "payroll": "salary",
    # ATM / Cash
    "atm withdrawal": "atm",
    "cash withdrawal": "atm",
    "atm/cdm": "atm",
}

# Pre-sort by keyword length descending so longer phrases match first
_SORTED_KEYWORDS = sorted(_KEYWORD_TO_MERCHANT.keys(), key=len, reverse=True)


def is_transfer_transaction(desc: str) -> bool:
    """Return True if description indicates an inter-account transfer."""
    d = desc.lower()
    return any(kw in d for kw in _TRANSFER_PATTERNS)


def extract_merchant(desc: str) -> str:
    d = desc.lower()

    for kw in _SORTED_KEYWORDS:
        if kw in d:
            return _KEYWORD_TO_MERCHANT[kw]

    # POS transaction: "POS 435584XXXXXX4314 MERCHANT NAME ..."
    pos_match = re.search(r"\bpos\b\s+[0-9x]+\s+(.+)", d)
    if pos_match:
        name = pos_match.group(1).strip()
        for kw in _SORTED_KEYWORDS:
            if kw in name:
                return _KEYWORD_TO_MERCHANT[kw]
        return f"pos_{name[:40].replace(' ', '_')}"

    # Standing instruction / card SI: "ME DC SI 435584XXXXXX4314 MERCHANT NAME"
    si_match = re.search(r"\bme\s+dc\s+(?:si|emi)\s+[0-9x]+\s+(.+)", d)
    if si_match:
        name = si_match.group(1).strip()
        for kw in _SORTED_KEYWORDS:
            if kw in name:
                return _KEYWORD_TO_MERCHANT[kw]
        return f"si_{name[:40].replace(' ', '_')}"

    # UPI: handles "UPI/CR/REF/NAME/VPA" and "UPI-NAME-..." formats
    upi_match = re.search(r"\bupi[/\-](?:cr|dr)[/\-]\d+[/\-](.+?)(?:[/\-@]|$)", d)
    if not upi_match:
        upi_match = re.search(r"\bupi[/\-]([a-z][a-z\s]{1,25}?)(?:[/\-@\s]|$)", d)
    if upi_match:
        name = upi_match.group(1).strip()
        for kw in _SORTED_KEYWORDS:
            if kw in name:
                return _KEYWORD_TO_MERCHANT[kw]
        return f"upi_{name.replace(' ', '_')}"

    return "unknown"
