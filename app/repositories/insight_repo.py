from uuid import UUID

from sqlalchemy.orm import Session

from app.models.insight import Insight


def create_insight(db: Session, data: dict):
    insight = Insight(**data)
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight


def create_insights(db: Session, items: list[dict]):
    insights = [Insight(**item) for item in items]
    db.add_all(insights)
    db.commit()

    for insight in insights:
        db.refresh(insight)

    return insights


def replace_insights_for_user(db: Session, user_id: UUID, items: list[dict]):
    db.query(Insight).filter(Insight.user_id == user_id).delete(synchronize_session=False)
    db.commit()
    return create_insights(db, items)


def get_insights_by_user(db: Session, user_id: UUID):
    return (
        db.query(Insight)
        .filter(Insight.user_id == user_id)
        .order_by(Insight.created_at.desc())
        .all()
    )
