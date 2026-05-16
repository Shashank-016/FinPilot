from app.repositories.category_repo import get_or_create_category
from app.repositories.transaction_repo import create_transaction, is_duplicate
from app.utils.categorizer import categorize_from_merchant
from app.utils.merchant_extractor import extract_merchant, is_transfer_transaction


def add_transaction(db, data, check_duplicate=False, override_category=None):
    description = data.get("description") or ""

    if check_duplicate and is_duplicate(
        db,
        user_id=data["user_id"],
        transaction_date=data["transaction_date"],
        amount=data["amount"],
        description=description,
    ):
        return None

    merchant = extract_merchant(description)
    if merchant == "unknown" and is_transfer_transaction(description):
        data["type"] = "transfer"
    else:
        category_name = override_category or categorize_from_merchant(merchant)
        if not data.get("category_id"):
            category = get_or_create_category(db, category_name, data["type"])
            data["category_id"] = category.id

    return create_transaction(db, data)
