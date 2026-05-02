from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .config import settings
from .s3_service import build_presigned_url, list_objects_for_day, list_prefix_children
from .schemas import AuthResponse, LoginRequest, RegisterRequest, S3ObjectResult
from .user_store import UserRecord, create_user, get_user_by_email

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    try:
        user = create_user(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Email already exists") from exc

    token = create_access_token(user.email)
    return AuthResponse(access_token=token, user_name=user.full_name, user_email=user.email)


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    user = get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.email)
    return AuthResponse(access_token=token, user_name=user.full_name, user_email=user.email)


@app.get("/s3/locations")
def get_locations(_: UserRecord = Depends(get_current_user)):
    return {"locations": list_prefix_children("")}


@app.get("/s3/cameras")
def get_cameras(location: str, _: UserRecord = Depends(get_current_user)):
    prefix = f"{location}/"
    return {"cameras": list_prefix_children(prefix)}


@app.get("/s3/days")
def get_days(location: str, camera: str, _: UserRecord = Depends(get_current_user)):
    prefix = f"{location}/{camera}/"
    return {"days": list_prefix_children(prefix)}


@app.get("/s3/search", response_model=list[S3ObjectResult])
def search_objects(
    location: str,
    camera: str,
    day: str,
    start_hour: int = Query(0, ge=0, le=23),
    end_hour: int = Query(23, ge=0, le=23),
    _: UserRecord = Depends(get_current_user),
):
    if start_hour > end_hour:
        raise HTTPException(status_code=400, detail="start_hour must be less than or equal to end_hour")

    results: list[S3ObjectResult] = []
    for obj in list_objects_for_day(location, camera, day):
        hour = obj.get("hour")
        if hour is not None and not (start_hour <= hour <= end_hour):
            continue
        key = obj["key"]
        results.append(
            S3ObjectResult(
                key=key,
                size_bytes=obj["size_bytes"],
                last_modified=obj["last_modified"],
                hour=hour,
                download_url=build_presigned_url(key),
            )
        )
    return results


@app.get("/s3/download-url")
def get_download_url(key: str, _: UserRecord = Depends(get_current_user)):
    return {"download_url": build_presigned_url(key)}


frontend_dir = (Path(__file__).resolve().parents[2] / "frontend").resolve()
if frontend_dir.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dir), name="assets")
    app.mount("/frontend", StaticFiles(directory=frontend_dir), name="frontend")

    @app.get("/")
    def serve_frontend():
        return FileResponse(frontend_dir / "index.html")
