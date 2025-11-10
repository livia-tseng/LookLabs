from fastapi import FastAPI

app = FastAPI(title="Closet MVP")

@app.get("/healthz")
def health():
    return {"ok": True}