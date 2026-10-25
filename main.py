from fastapi import FastAPI

app = FastAPI(title="Azimut API")


@app.get("/health")
def health():
    return {"status": "ok"}

