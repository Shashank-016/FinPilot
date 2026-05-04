from uuid import UUID

from sqlalchemy.orm import Session

from app.models.goal import Goal


def create_goal(db: Session, data: dict):
    goal = Goal(**data)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def get_goals_by_user(db: Session, user_id: UUID):
    return db.query(Goal).filter(Goal.user_id == user_id).all()


def get_goal_by_id(db: Session, goal_id: UUID):
    return db.query(Goal).filter(Goal.id == goal_id).first()


def update_goal_progress(db: Session, goal: Goal, current_amount: float):
    goal.current_amount = current_amount
    db.commit()
    db.refresh(goal)
    return goal
