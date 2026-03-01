from fastapi import APIRouter, HTTPException
from models.schemas import UserSignUp, UserSignIn, UserProfile, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory user store (replace with DB later)
_users_db: list[dict] = []
_next_id = 1


@router.post("/signup", response_model=UserOut)
def signup(body: UserSignUp):
    global _next_id
    # Check duplicate
    for u in _users_db:
        if u["email"] == body.email:
            raise HTTPException(400, "Email already registered")
    user = {"id": _next_id, "email": body.email, "password": body.password,
            "first_name": None, "middle_name": None, "last_name": None, "nickname": None}
    _users_db.append(user)
    _next_id += 1
    return UserOut(**user)


@router.post("/signin", response_model=UserOut)
def signin(body: UserSignIn):
    for u in _users_db:
        if u["email"] == body.email and u["password"] == body.password:
            return UserOut(**u)
    raise HTTPException(401, "Invalid email or password")


@router.put("/profile/{user_id}", response_model=UserOut)
def update_profile(user_id: int, body: UserProfile):
    for u in _users_db:
        if u["id"] == user_id:
            u["first_name"] = body.first_name
            u["middle_name"] = body.middle_name
            u["last_name"] = body.last_name
            u["nickname"] = body.nickname
            return UserOut(**u)
    raise HTTPException(404, "User not found")
