from datetime import date
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app import models
from app.database import Base, SessionLocal, engine
from app.models.goal import Goal
from app.models.insight import Insight
from app.models.transaction import Transaction
from app.models.user import User
from app.services.insight_service import generate_user_insights
from app.services.transaction_service import add_transaction

DEMO_EMAIL = "demo@financial-assistant.local"


def seed_demo_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        user = _get_or_create_demo_user(db)
        _reset_demo_data(db, user)
        _create_demo_goals(db, user)
        _create_demo_transactions(db, user)
        insights = generate_user_insights(db, user.id)

        print("Demo data seeded")
        print(f"user_id={user.id}")
        print(f"email={user.email}")
        print(f"insights={len(insights)}")
    finally:
        db.close()


def _get_or_create_demo_user(db):
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user:
        return user

    user = User(name="Demo User", email=DEMO_EMAIL)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _reset_demo_data(db, user):
    db.query(Insight).filter(Insight.user_id == user.id).delete(synchronize_session=False)
    db.query(Transaction).filter(Transaction.user_id == user.id).delete(synchronize_session=False)
    db.query(Goal).filter(Goal.user_id == user.id).delete(synchronize_session=False)
    db.commit()


def _create_demo_goals(db, user):
    goals = [
        Goal(
            user_id=user.id,
            name="Emergency Fund",
            target_amount=150000,
            current_amount=45000,
            start_date=date(2026, 4, 1),
            deadline=date(2026, 12, 31),
        ),
        Goal(
            user_id=user.id,
            name="Laptop Upgrade",
            target_amount=90000,
            current_amount=15000,
            start_date=date(2026, 4, 1),
            deadline=date(2026, 9, 30),
        ),
        Goal(
            user_id=user.id,
            name="Long-Term Investment Corpus",
            target_amount=1000000,
            current_amount=120000,
            start_date=date(2026, 4, 1),
            deadline=date(2028, 12, 31),
        ),
    ]
    db.add_all(goals)
    db.commit()


def _create_demo_transactions(db, user):
    transactions = [
        (120000, "income", "SALARY CREDIT APRIL", date(2026, 4, 1)),
        (6000, "income", "FREELANCE PAYMENT", date(2026, 4, 12)),
        (28000, "expense", "RENT PAYMENT", date(2026, 4, 2)),
        (9600, "expense", "UPI-SWIGGY-FOOD", date(2026, 4, 5)),
        (4200, "expense", "UPI-ZOMATO-DINNER", date(2026, 4, 8)),
        (14500, "expense", "AMAZON SHOPPING", date(2026, 4, 10)),
        (3500, "expense", "BOOKMYSHOW MOVIE", date(2026, 4, 11)),
        (10000, "expense", "GROWW SIP INVESTMENT", date(2026, 4, 15)),
        (2600, "expense", "REDBUS TRAVEL", date(2026, 4, 18)),
        (5200, "expense", "INSURANCE PREMIUM PRUDENTIAL", date(2026, 4, 20)),
    ]

    for amount, transaction_type, description, transaction_date in transactions:
        add_transaction(
            db,
            {
                "user_id": user.id,
                "amount": amount,
                "type": transaction_type,
                "description": description,
                "transaction_date": transaction_date,
            },
        )


if __name__ == "__main__":
    seed_demo_data()
