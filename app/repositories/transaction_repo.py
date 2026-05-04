from sqlalchemy.orm import Session
from app.models.transaction import Transaction

def create_transaction(db: Session, data: dict):
    transaction = Transaction(**data)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction