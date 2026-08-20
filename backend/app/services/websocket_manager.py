import asyncio
import json
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        # job_id -> list of active WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}
        # job_id -> list of recent log history (buffer for late connecting clients)
        self.log_history: dict[str, list[dict[str, Any]]] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)

        # Send historical logs for this job to the newly connected client
        if job_id in self.log_history:
            for log_entry in self.log_history[job_id]:
                try:
                    await websocket.send_text(json.dumps(log_entry))
                except Exception:
                    break

    def disconnect(self, job_id: str, websocket: WebSocket):
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def broadcast_log(self, job_id: str, message: str, level: str = "info", data: Optional[dict] = None):
        """Asynchronously broadcast log to all connected WebSocket clients for job_id."""
        entry = {
            "job_id": job_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,  # info, progress, success, warning, error
            "message": message,
            "data": data or {}
        }
        
        # Save to buffer (up to 500 lines per job)
        if job_id not in self.log_history:
            self.log_history[job_id] = []
        self.log_history[job_id].append(entry)
        if len(self.log_history[job_id]) > 500:
            self.log_history[job_id].pop(0)

        connections = self.active_connections.get(job_id, [])
        dead_connections = []
        payload_text = json.dumps(entry)

        for connection in connections:
            try:
                await connection.send_text(payload_text)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            if dead in connections:
                connections.remove(dead)

    def send_log_threadsafe(self, job_id: str, message: str, level: str = "info", data: Optional[dict] = None):
        """Thread-safe method to emit logs from synchronous background threads."""
        entry = {
            "job_id": job_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message,
            "data": data or {}
        }
        
        if job_id not in self.log_history:
            self.log_history[job_id] = []
        self.log_history[job_id].append(entry)
        if len(self.log_history[job_id]) > 500:
            self.log_history[job_id].pop(0)

        connections = self.active_connections.get(job_id, [])
        if not connections:
            return

        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.broadcast_log(job_id, message, level, data),
                self._loop
            )

websocket_manager = WebSocketManager()
