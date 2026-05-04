from uuid import UUID

from fastapi import HTTPException

from app.repositories.goal_repo import (
    create_goal,
    get_goal_by_id,
    get_goals_by_user,
    update_goal_progress,
)


def add_goal(db, data):
    return create_goal(db, data)


def list_user_goals(db, user_id: UUID):
    return get_goals_by_user(db, user_id)


def set_goal_progress(db, goal_id: UUID, current_amount: float):
    goal = get_goal_by_id(db, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return update_goal_progress(db, goal, current_amount)
