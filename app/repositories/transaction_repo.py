from sqlalchemy.orm import Session
from app.models.transaction import Transaction


def is_duplicate(db: Session, user_id, transaction_date, amount, description) -> bool:
    return db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.transaction_date == transaction_date,
        Transaction.amount == amount,
        Transaction.description == description,
    ).first() is not None


def create_transaction(db: Session, data: dict):
    transaction = Transaction(**data)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction