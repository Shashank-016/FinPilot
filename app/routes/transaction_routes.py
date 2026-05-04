from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.transaction import (
    CategorySummaryItem,
    TransactionCreate,
    TransactionResponse,
    UploadTransactionsResponse,
)
from app.services.transaction_service import add_transaction
from app.utils.csv_parser import parse_hdfc_statement

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
def get_transactions(db: Session = Depends(get_db)):
    return db.query(Transaction).all()


@router.post("", response_model=TransactionResponse)
def create_transaction_api(data: TransactionCreate, db: Session = Depends(get_db)):
    return add_transaction(db, data.model_dump())


@router.get("/user/{user_id}", response_model=list[TransactionResponse])
def get_user_transactions(user_id: UUID, db: Session = Depends(get_db)):
    return db.query(Transaction).filter(Transaction.user_id == user_id).all()


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


@router.post("/upload/{user_id}", response_model=UploadTransactionsResponse)
def upload_transactions(
    user_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        df = parse_hdfc_statement(file.file)
        inserted = 0

        for _, row in df.iterrows():
            data = {
                "user_id": user_id,
                "amount": float(row["amount"]),
                "type": row["type"],
                "description": str(row["description"]),
                "transaction_date": row["date"].date(),
            }

            add_transaction(db, data)
            inserted += 1

        return {
            "message": f"{inserted} transactions uploaded",
            "filename": file.filename,
            "inserted": inserted,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
