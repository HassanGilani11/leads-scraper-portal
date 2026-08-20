from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import websocket_manager

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/{job_id}")
async def websocket_logs_endpoint(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint streaming live terminal logs for a specific job_id.
    """
    await websocket_manager.connect(job_id, websocket)
    try:
        while True:
            # Keep connection open, handle any incoming pings / messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        websocket_manager.disconnect(job_id, websocket)
    except Exception:
        websocket_manager.disconnect(job_id, websocket)
