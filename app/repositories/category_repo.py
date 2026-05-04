from sqlalchemy.orm import Session
from app.models.category import Category

def get_category_by_name(db: Session, name: str):
    return db.query(Category).filter(Category.name == name).first()


def get_or_create_category(db: Session, name: str, category_type: str):
    category = get_category_by_name(db, name)
    if category:
        return category

    category = Category(name=name, type=category_type)
    db.add(category)
    db.flush()
    return category
