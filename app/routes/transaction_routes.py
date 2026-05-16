from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.transaction import (
    BulkDeleteRequest,
    CategoryResponse,
    CategorySummaryItem,
    CategoryUpdateRequest,
    TransactionCreate,
    TransactionResponse,
    UploadTransactionsResponse,
)
from app.services.transaction_service import add_transaction
from app.utils.categorizer import categorize_from_merchant
from app.utils.csv_parser import parse_hdfc_statement
from app.utils.llm_categorizer import categorize_with_llm
from app.utils.merchant_extractor import extract_merchant, is_transfer_transaction

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
def get_transactions(db: Session = Depends(get_db)):
    return db.query(Transaction).all()


@router.post("", response_model=TransactionResponse)
def create_transaction_api(data: TransactionCreate, db: Session = Depends(get_db)):
    return add_transaction(db, data.model_dump())


@router.get("/categories", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.get("/pending-review/{user_id}", response_model=list[TransactionResponse])
def get_pending_review(user_id: UUID, db: Session = Depends(get_db)):
    results = (
        db.query(Transaction, Category.name.label("category_name"))
        .outerjoin(Category, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, Transaction.needs_review == True)  # noqa: E712
        .all()
    )
    return [
        {
            "id": t.id,
            "user_id": t.user_id,
            "amount": float(t.amount),
            "type": t.type,
            "category_id": t.category_id,
            "category_name": cat_name,
            "description": t.description,
            "transaction_date": t.transaction_date,
            "created_at": t.created_at,
            "source": t.source,
            "needs_review": t.needs_review,
            "transaction_time": t.transaction_time,
        }
        for t, cat_name in results
    ]


@router.get("/user/{user_id}", response_model=list[TransactionResponse])
def get_user_transactions(user_id: UUID, db: Session = Depends(get_db)):
    results = (
        db.query(Transaction, Category.name.label("category_name"))
        .outerjoin(Category, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id)
        .all()
    )
    return [
        {
            "id": t.id,
            "user_id": t.user_id,
            "amount": float(t.amount),
            "type": t.type,
            "category_id": t.category_id,
            "category_name": cat_name,
            "description": t.description,
            "transaction_date": t.transaction_date,
            "created_at": t.created_at,
            "source": t.source,
            "needs_review": t.needs_review,
            "transaction_time": t.transaction_time,
        }
        for t, cat_name in results
    ]


@router.get("/summary/{user_id}", response_model=list[CategorySummaryItem])
def category_summary(user_id: UUID, db: Session = Depends(get_db)):
    result = (
        db.query(
            Category.name,
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .filter(Transaction.user_id == user_id)
        .group_by(Category.name, Transaction.type)
        .all()
    )

    return [
        {
            "category": r.name if r.name else "uncategorized",
            "type": r.type,
            "total": float(r.total),
        }
        for r in result
    ]


@router.post("/bulk-delete", status_code=204)
def bulk_delete_transactions(body: BulkDeleteRequest, db: Session = Depends(get_db)):
    db.query(Transaction).filter(Transaction.id.in_(body.ids)).delete(synchronize_session=False)
    db.commit()


@router.patch("/{transaction_id}/category", response_model=TransactionResponse)
def update_transaction_category(
    transaction_id: UUID,
    body: CategoryUpdateRequest,
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    transaction.category_id = body.category_id
    transaction.needs_review = False
    db.commit()
    db.refresh(transaction)
    cat_name = None
    if transaction.category_id:
        cat = db.query(Category).filter(Category.id == transaction.category_id).first()
        cat_name = cat.name if cat else None
    return {
        "id": transaction.id,
        "user_id": transaction.user_id,
        "amount": float(transaction.amount),
        "type": transaction.type,
        "category_id": transaction.category_id,
        "category_name": cat_name,
        "description": transaction.description,
        "transaction_date": transaction.transaction_date,
        "created_at": transaction.created_at,
        "source": transaction.source,
        "needs_review": transaction.needs_review,
        "transaction_time": transaction.transaction_time,
    }


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: UUID, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(transaction)
    db.commit()


@router.post("/upload/{user_id}", response_model=UploadTransactionsResponse)
def upload_transactions(
    user_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        df = parse_hdfc_statement(file.file)
        inserted = 0
        skipped = 0

        # First pass: find descriptions that rule-based categorization leaves as "Other"
        other_descriptions = [
            str(row["description"])
            for _, row in df.iterrows()
            if categorize_from_merchant(extract_merchant(str(row["description"]))) == "Other"
            and not is_transfer_transaction(str(row["description"]))
        ]

        # Batch LLM call for unknowns (single API request for the whole upload)
        llm_categories = categorize_with_llm(other_descriptions) if other_descriptions else {}

        # Second pass: insert with final categories
        for _, row in df.iterrows():
            desc = str(row["description"])
            data = {
                "user_id": user_id,
                "amount": float(row["amount"]),
                "type": row["type"],
                "description": desc,
                "transaction_date": row["date"].date(),
            }

            result = add_transaction(
                db, data,
                check_duplicate=True,
                override_category=llm_categories.get(desc),
            )
            if result is None:
                skipped += 1
            else:
                inserted += 1

        return {
            "message": f"{inserted} transactions uploaded, {skipped} duplicates skipped",
            "filename": file.filename,
            "inserted": inserted,
            "skipped": skipped,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
