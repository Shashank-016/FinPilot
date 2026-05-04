from app.repositories.category_repo import get_or_create_category
from app.repositories.transaction_repo import create_transaction
from app.utils.categorizer import categorize_from_merchant
from app.utils.merchant_extractor import extract_merchant


def add_transaction(db, data):
    description = data.get("description") or ""
    merchant = extract_merchant(description)
    category_name = categorize_from_merchant(merchant)

    if not data.get("category_id"):
        category = get_or_create_category(db, category_name, data["type"])
        data["category_id"] = category.id

    return create_transaction(db, data)
