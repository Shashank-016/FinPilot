from app.repositories.user_repo import create_user

def add_user(db, data):
    return create_user(db, data)