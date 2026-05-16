import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.jwt import create_access_token
from app.auth.password import hash_password, verify_password
from app.config import FRONTEND_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
from app.database import get_db
from app.models.user import User
from app.repositories.user_repo import (
    create_user,
    get_user_by_email,
    get_user_by_google_id,
    update_user,
)
from app.schemas.auth import AuthResponse, AuthUser, LoginRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def _build_auth_response(user: User) -> AuthResponse:
    token = create_access_token(str(user.id), user.email)
    return AuthResponse(token=token, user=AuthUser.model_validate(user))


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, body.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = create_user(db, {
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
    })
    return _build_auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, body.email)
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return _build_auth_response(user)


@router.get("/me", response_model=AuthUser)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/google")
def google_login():
    params = (
        f"client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange Google code")

    access_token = token_resp.json()["access_token"]

    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Google user info")

    info = userinfo_resp.json()
    google_id = info["id"]
    email = info["email"]
    name = info.get("name", email.split("@")[0])
    avatar_url = info.get("picture")

    user = get_user_by_google_id(db, google_id)

    if not user:
        user = get_user_by_email(db, email)
        if user:
            update_user(db, user, {"google_id": google_id, "avatar_url": avatar_url})
        else:
            user = create_user(db, {
                "name": name,
                "email": email,
                "google_id": google_id,
                "avatar_url": avatar_url,
            })

    token = create_access_token(str(user.id), user.email)
    return RedirectResponse(f"{FRONTEND_URL}?token={token}")
